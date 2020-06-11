---
title: "How I Deploy My Elixir Release (for my hobby project)"
date: 2020-06-11T20:49:01+08:00
draft: true
---

In my previous post "Building Elixir/Phoenix Release With Docker", I wrote
about how I build Elixir release with Docker and extract the tar file. However,
I haven't talk about I deploy the release to my production server and start the
application.

So, in this post, I am going to share my process on deploying the Elixir release.

_For the sake of simplicity, this post assume that your remote server already
has reverse proxy like `nginx` setup and pointing port 80 towards your
application port (4000). If you have a database, it's assume that the database
is created and running._

## Steps for initial release

Before we start, let's briefly talk about the steps involve to deploy our
release.

1. Copy the release tar file to the remote server.
2. Extract the tar file on the remote server.
3. Start your application by running `/bin/app_name daemon`

Which is equivalent to the following script:

```bash
#!/bin/bash

set -e

# Variables
APP_NAME="$(grep 'app:' mix.exs | sed -e 's/\[//g' -e 's/ //g' -e 's/app://' -e 's/[:,]//g')"
APP_VSN="$(grep 'version:' mix.exs | cut -d '"' -f2)"
TAR_FILENAME=${APP_NAME}-${APP_VSN}.tar.gz

# Replace with your remote server IP address or alias
HOST="192.162.1.1"

# Create directory for our app first. In this case we are creating
# the folder at our user home directory. WHICH MIGHT NOT BE THE BEST PRACTICE.
ssh $HOST mkdir -p $APP_NAME/$APP_VSN

# Use scp to copy our tarfile from local machie to remote server
# We are copying the tarfile to the directory we created above.
scp $TAR_FILENAME $HOST:~/$APP_NAME/$TAR_FILENAME

# Extract the tarfile
ssh $HOST tar -xzf $APP_NAME/$TAR_FILENAME -C $APP_NAME/$APP_VSN

# Source environment variable and start our Elixir application
ssh $HOST "source ~/$APP_NAME/.env  && ~/$APP_NAME/$APP_VSN/bin/$APP_NAME daemon"

# Remove tarfile that is copied in the 2nd step.
ssh $HOST rm "~/$APP_NAME/$TAR_FILENAME"
```

If you save this file as `./deploy` in your application root directory _(or
where your tarfile is available)_ and run `chmod +x ./deploy`, you should be
able to deploy your initial release by simply running `./deploy`.

Notice the pattern we use here `ssh $HOST <command to run>`. We are essentially
just running the command on our remote server by first sshing into the server.
If you're new to this, go ahead and run `ssh <ip> "ls -la"` on your local
machine.

If you frequently ssh to that particular IP, you can add the following to
your `~/.ssh/config`:

```ssh
Host prod-server # Host Name
  user kai # SSH as user kai
  Hostname 192.168.1.1 # IP address
```

With this configuration, you can now directly `ssh prod-server` instaed of
using `ssh kai@192.168.1.1`.

[1]: https://askubuntu.com/questions/25347/what-command-do-i-need-to-unzip-extract-a-tar-gz-file
