---
title: "Deploying Elixir/Phoenix Release to Production (for my hobby project)"
date: 2020-06-16T20:49:01+08:00
draft: true
---


In my previous post ["Building Elixir/Phoenix Release With Docker"]({{< ref "building-phoenix-release-with-docker.md" >}}), I wrote
about how I build Elixir release with Docker and extract the tar file. However,
I haven't talk about how I deploy the release to my production server and start the
application.

So, in this post, I am going to share my process on deploying Elixir release.

_For the sake of simplicity, this post assume that your remote server already
has reverse proxy like `nginx` setup and pointing port 80 towards your
application port (4000). If you have a database, it's assume that the database
is created and running._

## Steps for initial release

Before we start, let's briefly talk about the steps involved to deploy our
release.

1. Copy the release tarball to the remote server.
2. Extract the tar file on the remote server.
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

# Use scp to copy our tarfile from local machie to remote server
# We are copying the tarfile to the directory we created above.
scp $TAR_FILENAME $HOST:~/$APP_NAME/releases/$TAR_FILENAME

# Extract the tarfile
ssh $HOST tar -xzf $APP_NAME/releases/$TAR_FILENAME -C $APP_NAME

# Source environment variable and start our Elixir application
ssh $HOST "source ~/$APP_NAME/.env  && ~/$APP_NAME/bin/$APP_NAME daemon"

# Remove tarfile that is copied in the 2nd step.
ssh $HOST rm "~/$APP_NAME/releases/$TAR_FILENAME"
```

Here we used some of the common linux command such as:

- `scp` to copy our tarball securely to the remote server.
- `tar` to extract the tarball, refer to this [StackOverflow Question][1]
  for more.
- `source` to load our environment variable required by our application.

If you save this file as `./deploy` in your application root directory _(or
where your tarball is available)_ and run `chmod +x ./deploy`, you should be
able to deploy your initial release by simply running `./deploy`.

Notice the pattern we use here `ssh $HOST <command to run>`. We are essentially
just running the command on our remote server by first sshing into the server.
If you're new to this, go ahead and run `ssh <ip> "ls -la"` on your local
machine, you should be able to see the result of running `ls -la` in your
remote server.

If you frequently ssh to that particular IP, you can add the following to
your `~/.ssh/config`:

```ssh
Host prod-server # Host Name
  user kai # SSH as user kai
  Hostname 192.168.1.1 # IP address
```

With this configuration, you can now directly `ssh prod-server` instead of
using `ssh kai@192.168.1.1`.

## Steps for updating subsequent release

Subsequent release involves the similar steps as the above. The difference is
before starting the new version, we need to stop our old version server first.
However, script like this won't work:

```bash
bin/app stop
bin/app start
```

This is because it take time for the old application to shutdown
gracefully. Hence, running start command immediately would likely to cause
the following error:

```
Protocol 'inet_tcp': the name appname@hostname seems to be in use by another Erlang node
```

To overcome this issue, we would have to repeatedly try to start the
application until there is no error faced.

So, the only difference between the
script for initial release and subsequent release is the part where we start
the application:

_Instead of:_
```bash
source ~/$APP_NAME/.env  && ~/$APP_NAME/bin/$APP_NAME daemon
```

_Here is what we use:_
```bash
# Stop existing application if there is any
ssh $HOST $APP_NAME/bin/$APP_NAME stop

# Allow error so we can capture the error code of the command
set +e

# ===============================
# Waiting for application to stop
# ===============================
ssh $HOST $APP_NAME/bin/$APP_NAME pid

# Check previous command status code, where 1 indicate error,
# which infers that the node is stopped successfully.
# Retry until bin/app pid actually return nodedown error.
while [ $? -ne 1 ]
do
  ssh $HOST $APP_NAME/bin/$APP_NAME pid
done

# ================================
# Start application in daemon mode
# ================================
ssh $HOST "source $APP_NAME/.env  && $APP_NAME/bin/$APP_NAME daemon"

# ========================
# Health Check Application
# ========================
ssh $HOST "$APP_NAME/bin/$APP_NAME rpc 'IO.puts(\"health-check\")'"

# Retry until we can use rpc to talk to our node, which indicate our node
# is now up and running.
while [ $? -ne 0 ]
do
  ssh $HOST "$APP_NAME/bin/$APP_NAME rpc 'IO.puts(\"health-check\")'"
done

# Trap error back
set -e
```

These code basically done the following through `ssh`:

- Stop the application by running `bin/appname stop`.
- Check the process id of the running application by using `bin/appname pid`. If
  the status code is not error, it means that the application is still running.
  `$?` is the special variable in bash that indicate the status code of the
  previous command, in this example, it would be the `bin/appname pid` command.
- After the application stop running _(after `bin/appname pid` return error, since the
  node is down)_, we start our new version application in daemon mode by
  running `bin/appname daemon`.
- After starting our application, we continuously health check our
  application by using `bin/appname rpc`. Alternatively, you can also `curl`
  your health check endpoint.

<div class="callout callout-info">
  <p>
    You might be wondering if we can just use <code>bin/app restart</code> to
    resolve this issue. The answer is no. After running restart, the BEAM
    VM will still use the previous version of our application.
  </p>

  <p>
    And instead of using <code>bin/app eval IO.puts("health-check")</code>, we use
    <code>rpc</code> because <code>eval</code> do not communicate with the
    node to execute the code. Hence, even if the node is not up yet, the
    execution will still be successful.
  </p>
</div>

This work good enough if you have only one production server. If you have more
than one, consider looping through and extract the code into function.

## Glue it all together

To sum up, this is the bash script `./deploy` for deploying initial or subsequent release:

```bash
#!/bin/bash

set -e

APP_NAME="$(grep 'app:' mix.exs | sed -e 's/\[//g' -e 's/ //g' -e 's/app://' -e 's/[:,]//g')"
APP_VSN="$(grep 'version:' mix.exs | cut -d '"' -f2)"
TAR_FILENAME=${APP_NAME}-${APP_VSN}.tar.gz
HOST="192.168.1.1"

bold_echo() {
  echo -e "\033[1m---> $1\033[0m"
}

bold_echo "Creating directory if not exist..."
ssh $HOST mkdir -p $APP_NAME/releases/$APP_VSN

bold_echo "Copying release to remote..."
scp $TAR_FILENAME do:~/$APP_NAME/releases/$TAR_FILENAME
ssh $HOST tar -xzf $APP_NAME/releases/$TAR_FILENAME -C $APP_NAME/

bold_echo "Waiting for existing application to stop..."
# Stop existing application if any
ssh $HOST $APP_NAME/bin/$APP_NAME stop

set +e
# Waiting for application to stop
ssh $HOST $APP_NAME/bin/$APP_NAME pid
while [ $? -ne 1 ]
do
  ssh $HOST $APP_NAME/bin/$APP_NAME pid
done

bold_echo "Starting application in daemon mode..."
ssh $HOST "source $APP_NAME/.env  && $APP_NAME/bin/$APP_NAME daemon"

bold_echo "Health checking application..."
# Waiting for application to start
ssh $HOST "$APP_NAME/bin/$APP_NAME rpc 'IO.puts(\"health-check\")'"
while [ $? -ne 0 ]
do
  ssh $HOST "$APP_NAME/bin/$APP_NAME rpc 'IO.puts(\"health-check\")'"
done
set -e
bold_echo "Application started!"

bold_echo "Removing remote tar file..."
ssh $HOST rm "~/$APP_NAME/releases/$TAR_FILENAME"

bold_echo "Removing local tar file..."
rm $TAR_FILENAME
```

What we do additionally here is just add some extra logging on each step and
clean up after our release.

# Wrap Up

That's all. Building and deploying Elixir release can be simple once you know
the building blocks. However, do remember that this might not be the best
approach to deploy. It really depends on your context. For my personal
projects, I found it to be sufficient as I only have a single production server
and I am the only one who deployed it.

But is that all for my deployment process for Elixir/Phoenix release? Of
course not! The next one I would share in the future  would be deploying our
release using Blue Green Deployment strategy with NGINX. So do stay tuned!

[1]: https://askubuntu.com/questions/25347/what-command-do-i-need-to-unzip-extract-a-tar-gz-file
