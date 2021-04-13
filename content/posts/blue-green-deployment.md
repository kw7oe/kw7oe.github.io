---
title: "Blue Green Deployment"
date: 2021-03-29T10:36:41+08:00
tags: ["elixir", "phoenix", "deployment", "nginx"]
draft: true
---

In this post today, I'll share about how I setup blue green deployment for my
Phoenix application using `nginx` _running on a single machine_. This post is
made possible thanks to this article about [Custom Blue Green Deployment with Nginx
And Gitlab CI][0].

The core idea to make blue green deployment possible for Elixir releases with
`nginx` is through:

- Running two releases at the same time in your remote server.
- Switching traffic to new release through linking to a different `nginx`
  configuration to `/site-enabled` and reload `nginx`.

Again, this approach is only suitable for smaller scale system or hobby
projects where you just want to explore different things. When you have more
than one node, things become more complicated with this approach and you should
considering to offload this responsibility to something else.

This post also reused majority of the `bash` script that I have written in the
previous blog posts about building and deploying Elixir releases.

_While this article is written specifically for Elixir/Phoenix deployment,
similar approach and scripts can apply for any web application running behind
nginx to achieve blue green deployment._

_If you are running multiple instances (server) already, instead of modifying
with nginx configuration, you could achieve the simlar things by writing some
script to automate the modification of your load balancer to point to your
instance that are hosting your "live" version._

## TODO

- Add assumption of running existing release
- Add vagrant configuration and `/etc/hosts` changes needed to experiment
  locally.

## Setting Up `nginx`

Before we go into details on how we can setup our Blue Green deployment, it's
important for us to understand the building blocks that make it possible. We'll
start with understanding how `nginx` can help us with that.

Here, we assumed you have the basic knowledge of nginx and how it's used as a
reverse proxy to direct traffic to our application.

So, first of all, we are going to start with setting up the `nginx`
configuration for our blue and green application.

### Initial Nginx Configuration
Let's start by writing our initial Nginx configuration file
_([as refer from Phoenix Documentation][1])_ and placed it
under `/etc/nginx/sites-available/blue`:

```nginx
upstream phoenix-blue {
  # Assuming your application is running on PORT 4000
  server 127.0.0.1:4000 max_fails=5 fail_timeout=60s;
}

server {
  server_name myapp.domain;
  listen 80;

  location /deployment_id {
    return 200 "blue";
  }

  location / {
    allow all;

    # Proxy Headers
    proxy_http_version 1.1;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $http_host;
    proxy_set_header X-Cluster-Client-Ip $remote_addr;

    # The Important Websocket Bits!
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    proxy_pass http://phoenix-blue;
  }
}
```

We are putting it in `sites-available` instead of `sites-enabled` because we
would need to symlink different configuration file to our domain. Now we can
symlink our configuration file to `sites-enabled` with the following command:

```sh
sudo ln -sf /etc/nginx/sites-available/blue /etc/nginx/sites-enabled/myapp.domain
```

then, we can reload our nginx services to have it use our updated
configuration:

```sh
sudo systemctl reload nginx
```

Now, go to your `myapp.domain/deployment_id`, you should see a `blue` text as a
result.  These will act as the blue of our blue green deployment.

### Green Nginx configuration

To be able to blue green deploy, we would need another nginx configuration that
point to our green application server. It would look very similar with the
above configuration with some minor changes as follow:

```nginx
# Define another upstream and point to a different PORT
upstream phoenix-green {
  # Assuming your 'green' application is running on PORT 5000
  server 127.0.0.1:5000 max_fails=5 fail_timeout=60s;
}

server {
  server_name my-app.domain;
  listen 80;

  # Return 'green' instead.
  location /deployment_id {
    return 200 "green";
  }

  location / {
    allow all;

    # Proxy Headers
    proxy_http_version 1.1;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $http_host;
    proxy_set_header X-Cluster-Client-Ip $remote_addr;

    # The Important Websocket Bits!
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    # Point to our upstream defined above.
    proxy_pass http://phoenix-green;
  }
}
```

Similar with above, to _promote_ our green application to live, all we need
to do is to symlink it to be used as our domain configuration with the
following command:
```sh
sudo ln -sf /etc/nginx/sites-available/green /etc/nginx/sites-enabled/myapp.domain
```

follow by reloading our nginx service configuration:

```sh
sudo systemctl reload nginx
```

Now, visit to `myapp.domain/deployment_id` and you'll see a `green`
text returned.  However, if you try to visit `myapp.domain` and visit
other path of your application, you might get a 502 Bad Gateway.

```bash
╰─➤  curl myapp.domain/deployment_id
green%
╭─kai at KW.local ~/Desktop/mini-hackathon/life ‹1.11.3-otp-23› ‹main*›
╰─➤  curl myapp.domain/health
<html>
<head><title>502 Bad Gateway</title></head>
<body>
<center><h1>502 Bad Gateway</h1></center>
<hr><center>nginx/1.18.0 (Ubuntu)</center>
</body>
</html>
```

That's because we
haven't run any copy of our application on port `5000` yet as specified in
our `nginx` configuration.


## Running two copies of our application

Since we have been relying on environment variable for our port value, to
deploy another copies of our application on a different port, would be as
simple as changing the `PORT` value right?

So, all we need to do is to just update part of our bash script to
conditionally deploy our release with different ports! Easy. So, here's what we
got:

```bash
if [ "$deploy_version" = "blue" ]; then
  ssh $HOST "export $(cat .env.production | xargs)  && PORT=4000 ~/$APP_NAME/$APP_VSN/bin/$APP_NAME daemon"
else
  ssh $HOST "export $(cat .env.production | xargs)  && PORT=5000 ~/$APP_NAME/$APP_VSN/bin/$APP_NAME daemon"
fi
```

Well, now we have one problem, how do we know about our current live version?

Remember that `/deployment_id`? That's how we can get our current live
version:

```bash
LIVE_VERSION=$(curl -s -w "\n" "https://myapp.domain/deployment_id")

if [ "$LIVE_VERSION" = "blue" ]; then
  deploy_version="green"
else
  deploy_version="blue"
fi

# The previous bash script
# continue here...
```

We are done right? Not quite. If we go into our instance and check with
`lsof` _(list open file description)_:

```bash
$ lsof -i :5000
#=> empty result

$ lsof -i :4000
COMMAND   PID    USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
beam.smp 5162 vagrant   20u  IPv6  39660      0t0  TCP *:4000 (LISTEN)
```

You'll see that our application release doesn't get started successfully.
Attempting to start it manually while in the remote instance will result
in the following error:

```bash
$ source .env && PORT=5000 <app_version>/bin/<app_name> start
Protocol 'inet_tcp': the name <app_name>@<hostname> seems to be in use by another Erlang node
```

What is this error about? Well everytime, our release is started, a node name
for our release is actually provided a default node name according on our
application name.

So if we do this instead when starting our release, it will then work:

```bash
$ source .env && PORT=5000 RELEASE_NODE=green <app_version>/bin/<app_name> start
15:46:40.449 [info] Running Web.Endpoint with cowboy 2.8.0 at :::5000 (http)
15:46:40.450 [info] Access Web.Endpoint at http://example.com
```

At this point, this is how our `./deploy.sh` script looks like:

```bash
#!/bin/bash
set -e

APP_NAME="$(grep 'app:' mix.exs | sed -e 's/\[//g' -e 's/ //g' -e 's/app://' -e 's/[:,]//g')"
APP_VSN="$(grep 'version:' mix.exs | cut -d '"' -f2)"
TAR_FILENAME=${APP_NAME}-${APP_VSN}.tar.gz
# I'm using vagrant to run and test locally,
# can be replaced by your remote server ip and user.
HOST="vagrant@192.168.33.40"

bold_echo() {
  echo -e "\033[1m---> $1\033[0m"
}

build_release() {
  bold_echo "Building Docker images..."
  docker build -t app .

  bold_echo "Extracting release tar file..."
  ID=$(docker create app)
  docker cp "$ID:/app/$TAR_FILENAME" .
  docker rm "$ID"
}

deploy_release() {
  bold_echo "Creating directory if not exist..."
  ssh $HOST mkdir -p "$APP_NAME/$APP_VSN"

  bold_echo "Copying environment variables..."
  scp .env.production $HOST:"~/$APP_NAME/.env"

  bold_echo "Copying release to remote..."
  scp "$TAR_FILENAME" $HOST:"~/$APP_NAME/$TAR_FILENAME"
  ssh $HOST tar -xzf "$APP_NAME/$TAR_FILENAME" -C "$APP_NAME/$APP_VSN"

  start_release

  bold_echo "Removing remote tar file..."
  ssh $HOST rm "~/$APP_NAME/$TAR_FILENAME"
}

start_release() {
  LIVE_VERSION=$(curl -s -w "\n" "myapp.domain/deployment_id")

  if [ "$LIVE_VERSION" = "blue" ]; then
    deploy_version="green"
  else
    deploy_version="blue"
  fi

  bold_echo "Starting release ..."
  if [ "$deploy_version" = "blue" ]; then
    ssh $HOST "source ~/$APP_NAME/.env && PORT=4000 ~/$APP_NAME/$APP_VSN/bin/$APP_NAME daemon"
  else
    ssh $HOST "source ~/$APP_NAME/.env && PORT=5000 RELEASE_NODE=green ~/$APP_NAME/$APP_VSN/bin/$APP_NAME daemon"
  fi

}

clean_up() {
  bold_echo "Removing local tar file..."
  rm "$APP_NAME-"*.tar.gz
}


if [ "$1" = "build" ]; then
  build_release
else
  build_release
  deploy_release
  clean_up
fi
```

Running `./deploy.sh` now the second time _(initial green build)_ will now
deploy another copy of our application with the latest changes. The initial
build will still be running and nothing is impacted.

## Promoting our green version to live

The current live version is still blue. So, in order to promote our green
version to live. All we need to do is to run:

```bash
sudo ln -sf /etc/nginx/sites-available/green /etc/nginx/sites-enabled/myapp.domain
sudo systemctl reload nginx
```

Similar with how we start our release differently, we are going to rely on
`/deployment_id` to get the current live version and user input to decide which
version we want to promote to live. So here's how the bash script looks like
now:

```bash
# Other code here...

promote() {
  bold_echo "Attempting to promote to $1..."
  if [ "$LIVE_VERSION" = "$1" ]; then
    echo "$1 is already the live version!"
    return
  elif [ "$1" = "green" ]; then
    target_nginx_file="green"
  else
    target_nginx_file="blue"
  fi

  ssh $HOST "sudo ln -sf /etc/nginx/sites-available/$target_nginx_file /etc/nginx/sites-enabled/myapp.domain && sudo systemctl reload nginx"
}


if [ "$1" = "build" ]; then
  build_release
elif [ "$1" = "promote" ]; then
  promote $2
else
  build_release
  deploy_release
  clean_up
fi
```

To promote green version to live, all we have to run is:

```bash
./deploy.sh promote green
```

Now, visiting to `myapp.domain` and you shall see your latest changes for your application is live.

Alternatively, if things went wrong and you decided to rollback to blue version, all you need
to run is just:

```bash
./deploy.sh promote blue
```

Do note that, at this point, we are running **2 copies of our application** on
our remote server, which means we are consuming twice as much resources as
well.

## Running migration and console

Assuming you have follow the [guide to setup ecto migration][2] on the official Phoenix Documentation,
you should be able to run migration by running the following comamnd:

```bash
$ ~/$APP_NAME/$version/bin/$APP_NAME eval 'AppName.Release.migrate()'
```

similarly, to run the remote console is just as simple as:

```bash
$ ~/$APP_NAME/$version/bin/$APP_NAME remote
```

### Running migration

Let's assume we have released both version `0.1.0` as `blue` and `0.1.1` as
`green`. To run migration for the `0.1.0` release, it's the same as usual:

```bash
$ ~/app_name/0.1.0/bin/app_name eval 'AppName.Release.migrate()'
```

Pretty straightforward. For the latest `0.1.1` version,
to run the migration is also the same as above:

```bash
$ ~/app_name/0.1.1/bin/app_name eval 'AppName.Release.migrate()'
```

### Running remote console

Now, let's say that we want to run a remote console on our `0.1.0` deployed as
`blue`. It is same as usual:

```bash
$ ~/app_name/0.1.0/bin/app_name remote
```

Pretty straightforward. However, if we want to do the same For the `0.1.1` version deployed as `green`,
the following will not work as expected

```bash
$ ~/app_name/0.1.1/bin/app_name remote
```

and you'll get the following error message complaning that the node is down:

```
Erlang/OTP 23 [erts-11.1.8] [source] [64-bit] [smp:2:2] [ds:2:2:10] [async-threads:1] [hipe]

Could not contact remote node life@prod-server, reason: :nodedown. Aborting...
```

Remember when we spin up our second copy and we specify `RELEASE_NODE=green`?

It's because of that. So, in order to run remote console correctly, we need to
specify our node name explicitly as we actually start it with that
configuration in the first place:

```bash
RELEASE_NODE=green ~/app_name/0.1.1/bin/app_name remote
```

And voila, you are in again!

### Why `eval` works without additional environment configuration?

If you run:

```bash
$ ~/app_name/0.1.1/bin/app_name
```

You'll get a more detailed description of each command. And if you read about
`eval`, you'll find that it actually execute the command on a new non booted
system.

```
The known commands are:

    ...
    eval "EXPR"    Executes the given expression on a new, non-booted system
    rpc "EXPR"     Executes the given expression remotely on the running system
    remote         Connects to the running system via a remote shell
    ...
```

Hence, unlike `remote` command that connected to our running system, `eval` is
not affected as it run on a whole new system.


## Deploying new blue and green version

That's not the end yet. We just cover the initial deployment part so far _(the
first two deployments)_. Next up, we need to deployed new version for both
`blue` and `green` copy of our application.

The main difference between the subsequent and the initial deployment is
that we need to stop our running application before we start the newer version. The script and process is fairly similar to [the script to deploy new release in our previous blog post]({{< ref "deploying-elixir-phoenix-release-to-production.md#2-add-script-to-deploy-new-release" >}})

Hence, to deploy our new blue/green version, we need to first stop the old
blue/green version. Once the old process is stop successfully then we can start
the new one.

For example:

- If live version is green, we will stop old blue version, and start a new one
  as blue version. Since we want to ensure zero downtime deployment, hence we
  can't be stopping the existing live green version of the application.
- If live version is blue, we will stop the old green version.

The bash script for this part will looks like this:

```bash
start_release() {
  LIVE_VERSION=$(curl -s -w "\n" "myapp.domain/deployment_id")

  if [ "$LIVE_VERSION" = "blue" ]; then
    deploy_version="green"
    # Since we need to check if our process is running with pid command
    env="RELEASE_NODE=green"
  else
    deploy_version="blue"
    env=""
  fi

  get_current_version

  set +e
  # Don't exit onx error so we can caputure

  ssh $HOST "$env ~/$APP_NAME/$CURRENT_VERSION/bin/$APP_NAME pid"

  if [ $? -ne 0 ]; then
    bold_echo "$APP_NAME $CURRENT_VERSION is not running anymore..."
  else
    bold_echo  "Stopping previous $deploy_version, release $CURRENT_VERSION..."
    ssh $HOST "$env ~/$APP_NAME/$CURRENT_VERSION/bin/$APP_NAME stop"

    bold_echo  "Waiting $deploy_version, release $CURRENT_VERSION to stop..."
    ssh $HOST "$env ~/$APP_NAME/$CURRENT_VERSION/bin/$APP_NAME pid"

    while [ $? -ne 1 ]
    do
      bold_echo  "Waiting $deploy_version, release $CURRENT_VERSION to stop..."
      ssh $HOST "$env ~/$APP_NAME/$CURRENT_VERSION/bin/$APP_NAME pid"
    done
  fi
  set -e

  # Start Release code
}
```

### Remarks for next writing
The problem now is getting the previous version of our application. Since when
we are extracting our release, we extract different version of our release to
different directory. So in order to stop the old running application, we will
need to know the version of the older running application. There are two ways
to resolve this:

- On deploy change a local file where we can read to get the blue/green
  existing/old running version. This can cater both running/stopped
  application.
- One deploy, ssh to host and curl the application accordingly. Since we know
  which port we are running as green/blue, we can curl and extract the version
  from our /health or /version endpoint. However this does not cater the
  scenario where one might just stop old blue/green version to reduce resource
  consumption.

## Glue it all together with script


## Wrap Up

While this blue green deployment works for our simple use case, there are a few
drawbacks that one need to be aware of.

### Multiple Nodes

When you scale beyond multiple nodes, while it could still work, it becomes
quite tricky to manage. In theory, you can just loop through and execute the
script separately _(or together)_. However, as your needs grow, it will feel
like you are reinventing the wheels.

### Minimal downtime for Phoenix Channels

While we might have zero downtime for our API requests, this setup is not
tested on Phoenix Channels or websockets. In theory, there will be a minimal
downtime.

If you are looking for zero downtime deployment with this method, be sure to do
your own testing.


[0]: https://www.kimsereylam.com/gitlab/nginx/dotnetcore/ubuntu/2019/01/04/custom-blue-green-deployment-with-nginx-and-gitlab-ci.html
[1]: https://hexdocs.pm/phoenix/1.3.0-rc.1/phoenix_behind_proxy.html
[2]: https://hexdocs.pm/phoenix/releases.html#ecto-migrations-and-custom-commands
