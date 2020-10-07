---
title: "Deploying Elixir/Phoenix Release to Production"
date: 2020-07-20T20:09:01+08:00
tags: ["elixir", "phoenix", "deployment"]
---

_Updates (12th August 2020): Fix my mistake on using `bin/app restart`._

_Updates (7th October 2020): Include the reason why `bin/app restart` doesn't
work_

In my previous post ["Building Elixir/Phoenix Release With Docker"]({{< ref "building-phoenix-release-with-docker.md" >}}), I wrote
about how I build Elixir release with Docker and extract the tarball. Today,
I am going to share how I deploy Elixir release to the production server.


_Do note that, the way I deploy **works best for hobby or small projects**. For
larger scale system, consider using other tools._

_For the sake of simplicity, this post assume that your remote server
has reverse proxy like `nginx` setup and pointing port 80 towards your
application port 4000. If you depend on the database, it's assumed that the database
is up and running._

# Steps for initial release

Before we start, let's briefly talk about the steps involved to deploy our
release:

1. Copy the release tarball to the remote server.
2. Extract the tarball on the remote server.
3. Start your application by running `/bin/app_name daemon`

This is equivalent to the following bash script:

```bash
#!/bin/bash

set -e

# Variables
APP_NAME="$(grep 'app:' mix.exs | sed -e 's/\[//g' -e 's/ //g' -e 's/app://' -e 's/[:,]//g')"
APP_VSN="$(grep 'version:' mix.exs | cut -d '"' -f2)"
TAR_FILENAME=${APP_NAME}-${APP_VSN}.tar.gz

# Replace with your remote server IP address or hostname
HOST="192.162.1.1"

# Create directory for our app first. In this case we are creating
# the folder at our user home directory. WHICH MIGHT NOT BE THE BEST PRACTICE.
ssh $HOST mkdir -p $APP_NAME/releases

# Use scp to copy our tarfile from local machine to remote server
# We are copying the tarfile to the directory we created above.
scp $TAR_FILENAME $HOST:~/$APP_NAME/releases/$TAR_FILENAME

# Extract the tarfile
ssh $HOST tar -xzf $APP_NAME/releases/$TAR_FILENAME -C $APP_NAME

# Source environment variable and start our Elixir application
ssh $HOST "source ~/$APP_NAME/.env  && ~/$APP_NAME/bin/$APP_NAME daemon"

# Remove tarfile that is copied in the 2nd step.
ssh $HOST rm "~/$APP_NAME/releases/$TAR_FILENAME"
```

Here we used some of the common command such as:

- `scp` to copy our tarball securely to the remote server.
- `tar` to extract the tarball, refer to this [StackOverflow Question][1]
  for more details.
- `source` to load our environment variables required by our application.
  _(which assume your remote server have the `.env` located at `~/$APP_NAME/`)_

If you save this file as `./deploy` in your application root directory locally _(or
where your tarball is available)_ and run `chmod +x ./deploy`, you should be
able to deploy your initial release by simply running `./deploy`. Simple and
straightforward right?

### Side Topic: SSH Tips and Tricks

Notice the pattern we use here in `ssh $HOST <command to run>`. We are essentially
running the command on our remote server by first ssh into the server and
executing the command.

If you're new to this, go ahead and run `ssh <user>@<ip> "ls -la"` on your local
machine. You should be able to see the same result as running `ls -la` in your
remote server.

If you frequently ssh to a particular IP, you can add the following to
your `~/.ssh/config`:

```ssh
Host prod-server # Host Name
  user kai # SSH as user kai
  Hostname 192.168.1.1 # IP address
```

With this configuration, you can now directly `ssh prod-server` instead of
using `ssh kai@192.168.1.1`.

# Steps for updating subsequent release

Subsequent release involves the similar steps as the above. The difference is
before starting the new version, we need to stop our old version server first.
However, there is a couple of things that is good to know before we proceed.

## Stopping application take some times
Script like this won't work:

```bash
bin/app stop
bin/app start
```

This is because it takes time for the old application to shutdown
gracefully. Hence, running start command immediately would likely to cause
the following error:

```
Protocol 'inet_tcp': the name app@hostname seems to be in use by another Erlang node
```

To overcome this issue, we need to either:

- Repeatedly try to start the application until there is no error faced.
- Or, ensure that the application is stopped before we run the start command.

<div class="callout callout-info">
  <p class="font-bold">Why can't we just use <code>bin/app restart</code>?</p>
  <p>
    In the previous version of this post, we are using <code>bin/app
    restart</code>. However, after I use the code personally in one of my
    project, I realized that by using `<code>bin/app restart</code>`, the
    application will <strong>not be started as the latest version</strong>.
  </p>

  <p>
    It is restarted as the previous version of the application, which is not what
    we expected when we want to update our application right. Hence, we will
    need to write some custom logic as mentioned above.
  </p>

  <p><s>
    I haven't figure out why it behave like this. If you happen to know,
    please let me know! If I manage to find out why, I'll update this part once
    again.
  </s></p>

  <p>
    One of the reader commented on the
    <a href="https://github.com/kw7oe/kw7oe.github.io/commit/e272a559388f26206643cc386198c410c2364f2a">
      commit
    </a>
    of this post to include the reason why it isn't working as expected. This
    is because restart normally send <code>HUP</code> signal to the running code and this
    does not stop the code like <code>KILL</code> signal does. Hence, that's why we are
    still getting the old version.
  </p>
</div>

## Replacing old release with new release will cause `bin/app` command not working expectedly
That's not the only thing we need to overcome. Another tricky one would be, if
we were extract our new release tarball, which then replace our old release,
`bin/app pid` would not work as expected at the time of writing (11th July,
2020) _without any additional configuration_. You'll get the following error
instead:

```
--rpc-eval : RPC failed with reason :nodedown
```

Why would this occur? After some experimentation, I have found out that this
happen because every time we build a new release in Docker, as we run `mix release`,
it would generate a new random cookie.

Which is then written to our `releases/COOKIE` file, and if we don't have
`RELEASE_COOKIE` set in our environment, this cookie would be used.

Every time we extract our new release tarball, the `releases/COOKIE` might
be updated to a different cookie and cause the command unable to talk to our
running application.

Here's what the [Erlang documentation][2] mentioned:

> When a node tries to connect to another node, the magic cookies are compared.
> If they do not match, the connected node rejects the connection.

Our new release cookie doesn't match with our old release _(running
application)_ cookie. Thus, they are not able to talk to each other.

But, how is it related to our `bin/app pid` command? Isn't it just a normal
command that get the process id of the application?

It is, but internally, the command is using `rpc` mechanism to talk to the node,
which spin up a hidden node and evaluate some code on the remote node
_(our running application)_ _(refer to `elixir --help`, Distribution options for
more details)_.

Here is the command executed underneath every time we run `bin/app pid`:

```
/home/kai/app/releases/0.1.1/elixir --hidden --cookie COOKIE --sname rpc-29e0-app --boot /home/kai/app/releases/0.1.1/start_clean --boot-var RELEASE_LIB /home/kai/app/lib --rpc-eval app IO.puts System.pid()
```

### Side Note: How can we know the command running underneath?

An easy way to know what's the command running underneath of a executable
script is adding `set -x` on top of the script file. Instead of having the
original `bin/app` script that looks like this:

```sh
#!/bin/sh
set -e

SELF=$(readlink "$0" || true)
if [ -z "$SELF" ]; then SELF="$0"; fi
RELEASE_ROOT="$(cd "$(dirname "$SELF")/.." && pwd -P)"
...
```

We can modified the script to get more details by adding a single character:

```sh
#!/bin/sh
# Just add extra x here
set -ex

SELF=$(readlink "$0" || true)
if [ -z "$SELF" ]; then SELF="$0"; fi
RELEASE_ROOT="$(cd "$(dirname "$SELF")/.." && pwd -P)"
...
```

With a simple change, now every time when we execute the `bin/app` command,
a detailed log will be output to show what is being run underneath.

I actually came across this while going through Buildkite documentation for
[writing build scripts][4]. Go ahead and read about it if you're interested in
the details behind.


## Solution

**1. Fixing our cookie**

The first thing we need to resolve is to ensure that every time we start our
release, the same cookie is used. Fortunately, this can be easily done by using
`RELEASE_COOKIE` environment variable or putting the cookie in our release
configuration in `mix.exs`:

```elixir
def project do
  [
    app: :app_name,
    ...
    releases: [
      app_name: [
        cookie: "<YOUR COOKIE>",
        steps: [:assemble, :tar]
      ]
    ]
  ]
end
```

The [documentation][3] recommend to use a long and randomly
generated string for your cookie, which can be generated using the following
code:

```elixir
Base.url_encode64(:crypto.strong_rand_bytes(40))
```

Alternatively, you can use the `RELEASE_COOKIE` environment variable. In my case,
it would be placing it in my local `.env.production` file:
```bash
export RELEASE_COOKIE=<YOUR COOKIE>
```

where later on, I have the following command that copy it to the remote machine
as my environment variable file `.env`:

```bash
# scp <source> <host>:<destination>
scp .env.production $HOST:~/$APP_NAME/.env
```

**2. Add script to deploy new release**

The only difference between the
script for initial release and subsequent release is the part where we start
the application:

So, instead of:
```bash
source ~/$APP_NAME/.env  && ~/$APP_NAME/bin/$APP_NAME daemon
```

This is how it looks like:
```bash
# ==========================================
# Copying .env.production to remote as .env
# ==========================================
scp .env.production $HOST:~/$APP_NAME/.env

# =============================
# Copying new release to remote
# =============================
scp $TAR_FILENAME $HOST:~/$APP_NAME/releases/$TAR_FILENAME
ssh $HOST tar -xzf $APP_NAME/releases/$TAR_FILENAME -C $APP_NAME/

# ===================
# Start to trap error
# ===================

# This is because bin/app stop will return error
# if the application is not running.

# Furthermore, we want to get the status code of
# bin/app pid.
set +e

# ========================
# Stop running application
# ========================
ssh $HOST "source $APP_NAME/.env && $APP_NAME/bin/$APP_NAME stop"

# ================================
# Check if application has stopped
# ================================
ssh $HOST "source $APP_NAME/.env && $APP_NAME/bin/$APP_NAME pid"

# if getting process id of application return error
# it means that the application has been stopped
while [ $? -ne 1 ]
do
  ssh $HOST "source $APP_NAME/.env && $APP_NAME/bin/$APP_NAME pid"
done

# =================
# Start application
# =================
# Starting the application in daemon mode
ssh $HOST "source $APP_NAME/.env  && $APP_NAME/bin/$APP_NAME daemon"

# ========================
# Health Check Application
# ========================

# Repeatly use rpc to talk to our node until it succeed, which indicate our node
# is now up and running.
ssh $HOST "source $APP_NAME/.env && $APP_NAME/bin/$APP_NAME rpc 'IO.puts(\"health-check\")'"
while [ $? -ne 0 ]
do
  ssh $HOST "source $APP_NAME/.env && $APP_NAME/bin/$APP_NAME rpc 'IO.puts(\"health-check\")'"
done

# ===================
# Stop trapping error
# ===================
set -e
```

These code basically done the following through `ssh`:

- Copy our environment variable files to remote machine.
- Copy our release tarball to remote machine and extract it.
- Stop the application by running `bin/app stop`.
- Check the process id of the running application by using `bin/app pid`. If
  the status code is not error, it means that the application is still running.
- `$?` is the special variable in `bash` that indicate the status code of the
   previous command. In this example, it would be the `bin/app pid` command.
- After the application stop running _(which is after `bin/app pid` return error,
  since the node is down)_, we start our new version application in daemon mode by
  running `bin/app daemon`.
- After starting our application, we continuously health check our
  application by using `bin/app rpc`. Alternatively, you can also `curl`
  your health check endpoint.

This is good enough if you have only one production server. If you have more
than one, consider looping through the IP addresses  and extract the code
into function.

<div class="callout callout-info">
  <p>
  You might be wondering why  instead of using <code>bin/app eval IO.puts("health-check")</code>,
  we use <code>rpc</code>. This is because <code>eval</code> do not communicate with the
    node to execute the code. Hence, even if the node is not up yet, the
    execution will still be successful.
  </p>
</div>


### Side Note: Not the best way to health check
This is not the best way to health check your application. For the following
reasons:

- We only check if the application is up and running. We didn't really health
  check if our database connection is working correctly. Or, if it
  is ready to handle HTTP request correctly.
- Ideally a better way to health check our application would be using `curl`
  and hit an endpoint that also query your database.
- If we are doing a more thorough health check, we might want to limit the
  number of health check attempts and has it failed the deployment and rollback
  if things doesn't go well after a couple of times, which is another topic
  for another day.
- That's also part of the reason why I think this approach of deployment is
  only suitable for small projects. Cluster schedulers like Kubernetes, Nomad or ECS
  have already solve this issue for you, as far as I know.


# Glue it all together

To sum up, this is the bash script `./deploy` that I used for deploying initial or
subsequent release of my side projects:

```bash
#!/bin/bash

set -e

APP_NAME="$(grep 'app:' mix.exs | sed -e 's/\[//g' -e 's/ //g' -e 's/app://' -e 's/[:,]//g')"
APP_VSN="$(grep 'version:' mix.exs | cut -d '"' -f2)"
TAR_FILENAME=${APP_NAME}-${APP_VSN}.tar.gz
HOST="do"

bold_echo() {
  echo -e "\033[1m---> $1\033[0m"
}

bold_echo "Creating directory if not exist..."
ssh $HOST mkdir -p $APP_NAME/releases/$APP_VSN

bold_echo "Copying environment variables..."
scp .env.production $HOST:~/$APP_NAME/.env

bold_echo "Copying release to remote..."
scp $TAR_FILENAME $HOST:~/$APP_NAME/releases/$TAR_FILENAME
ssh $HOST tar -xzf $APP_NAME/releases/$TAR_FILENAME -C $APP_NAME/

set +e
bold_echo "Waiting for existing application to stop..."
ssh $HOST "source $APP_NAME/.env && $APP_NAME/bin/$APP_NAME stop"
ssh $HOST "source $APP_NAME/.env && $APP_NAME/bin/$APP_NAME pid"

# if getting process id of application return error
# it means that the application has been stopped
while [ $? -ne 1 ]
do
  ssh $HOST "source $APP_NAME/.env && $APP_NAME/bin/$APP_NAME pid"
done

bold_echo "Starting application in daemon mode..."
ssh $HOST "source $APP_NAME/.env  && $APP_NAME/bin/$APP_NAME daemon"

bold_echo "Health checking application..."
# Waiting for application to start
ssh $HOST "source $APP_NAME/.env && $APP_NAME/bin/$APP_NAME rpc 'IO.puts(\"health-check\")'"
while [ $? -ne 0 ]
do
  ssh $HOST "source $APP_NAME/.env && $APP_NAME/bin/$APP_NAME rpc 'IO.puts(\"health-check\")'"
done
set -e

bold_echo "Application started!"

bold_echo "Removing remote tar file..."
ssh $HOST rm "~/$APP_NAME/releases/$TAR_FILENAME"

bold_echo "Removing local tar file..."
rm $TAR_FILENAME
```

Don't forget to make it executable by running `chmod +x ./deploy`, and now you
can deploy your Elixir release by running `./deploy` locally.

Here, I didn't cover how I run my migration but a quick way is just adding the
following command after we start the application _(assuming you have added the
code mentioned in the [Phoenix Release Documentation][5])_:

```bash
ssh $HOST "source ~/$APP_NAME/.env && ~/$APP_NAME/bin/$APP_NAME eval 'App.Release.migrate()'"
```

The reason we need to source the `.env` is because our runtime require some
environment variable to be available in order to execute it.

Also, some additional notes on the extra stuff added in the scripts:

- Added `bold_echo` to print out each step in bold and formatted text.
- Added clean up code after our release.

# Wrap Up

That's all. Building and deploying Elixir release can be simple once you know
the building blocks. However, do remember that this might not be the best
approach to deploy. It really depends on your context. For my personal
projects, I found it to be sufficient as I only have a single production server
and I am the only one who deployed it.

But is that all for my deployment process for Elixir/Phoenix release? Of
course not! The next one I would share in the future  would be deploying our
release using Blue Green Deployment strategy with `nginx`. So do stay tuned!

[1]: https://askubuntu.com/questions/25347/what-command-do-i-need-to-unzip-extract-a-tar-gz-file
[2]: https://erlang.org/doc/reference_manual/distributed.html
[3]: https://hexdocs.pm/mix/Mix.Tasks.Release.html#module-options
[4]: https://buildkite.com/docs/pipelines/writing-build-scripts#configuring-bash
[5]: https://hexdocs.pm/phoenix/releases.html#ecto-migrations-and-custom-commands
