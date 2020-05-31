---
title: "Building Elixir/Phoenix Release With Docker"
date: 2020-05-31T14:17:08+08:00
draft: true
---

This is a short post where I share how I build my Elixir/Phoenix releases with Docker
and _extract the tar file deployed to production environment_.

## Why Docker?

I used to use [Vagrant][0] and [Ansible][1] to build my Phoenix releases.
I basically setup a Ubuntu VM with Vagrant and have Ansible script that build
the release in the VM locally.

However, it's requires a breadth of knowledge _(in Ansible and a bit of Vagrant)_
to make this happen. After getting familiar with Docker in my work environment,
I started to experiment with building release just with Docker, glue with some bash
script.

With Docker, **all you need to learn is about Docker** _(and of course how to build
a release in an Elixir application)_.

## Dockerfile

### Base Image
Depending on your production machine OS, you might just want to use the official Elixir
image, which is based on Debian OS. However if you are like me using Ubuntu
18.04 on your production machine, you can use the following `Dockerfile` as the
base image for Elixir in Ubuntu 18.04.

```docker
FROM ubuntu:18.04
ENV LANG=en_US.UTF-8

RUN \
  apt-get update -y && \
  apt-get install -y git curl wget locales gnupg2 build-essential && \
  locale-gen en_US.UTF-8 && \
  wget https://packages.erlang-solutions.com/erlang-solutions_2.0_all.deb && \
  dpkg -i erlang-solutions_2.0_all.deb && \
  rm erlang-solutions_2.0_all.deb && \
  apt-get update -y && \
  curl -sL https://deb.nodesource.com/setup_10.x | bash - && \
  apt-get install -y esl-erlang elixir nodejs && node -v && npm -v

CMD ["/bin/bash"]
```

I named it as `Dockerfile.ubuntu` in my application root directory and run the
following command to build the image:

```bash
docker build -t ubuntu-elixir -f Dockerfile.ubuntu .
```

### Build Image

Writing the Dockerfile for building release is fairly straightforward and it is
also available in Phoenix ["Deploying with Releases"][2] documentation.

```docker
FROM ubuntu-elixir as build

# ===========
# Application
# ===========

# prepare build dir
WORKDIR /app

# install hex + rebar
RUN mix local.hex --force && \
    mix local.rebar --force

# set build ENV
ENV MIX_ENV=prod

# install mix dependencies
COPY mix.exs mix.lock ./
COPY config config
RUN mix do deps.get, deps.compile

# build assets
COPY assets/package.json assets/package-lock.json ./assets/
RUN npm --prefix ./assets ci --progress=false --no-audit --loglevel=error

COPY priv priv
COPY assets assets
RUN npm run --prefix ./assets deploy
RUN mix phx.digest

# compile and build release
COPY lib lib
# uncomment COPY if rel/ exists
# COPY rel rel
RUN mix do compile, release

FROM ubuntu:18.04 AS app

WORKDIR /app
COPY --from=build /app/_build/prod/app_name-*.tar.gz ./

CMD ["/bin/bash"]
```

There some minor differences in this Dockerfile compared to the one in the
documentation. For example:

- `RUN apk add --no-cache build-base npm git python` is not included as we have
  added this in our `Dockerfile.ubuntu`. However, if you are not using the same
  one, do add it in according to your Dockerfile OS.
- At the end of the Dockerfile, instead of copying our whole release and make
  the `CMD` as starting the release, we just copy the tar file of the release.

Now you can build your release by running:

```
docker build -t app_name_server .
```

## Extracting tar file

After building the images, you might be curious how can we extract the tar file
from the image itself. A quick and easy way is to run the following command:

```bash
# You could also just manually specifying your app name and version.
APP_NAME="$(grep 'app:' mix.exs | sed -e 's/\[//g' -e 's/ //g' -e 's/app://' -e 's/[:,]//g')"
APP_VSN="$(grep 'version:' mix.exs | cut -d '"' -f2)"
TAR_FILENAME=${APP_NAME}-${APP_VSN}.tar.gz

id=$(docker create ${APP_NAME}_server)
docker cp $id:/app/${TAR_FILENAME} .
docker rm $id
```

Basicaly, what we are doing are:

- `docker create` create a container with your image. The output of the
  command is the id of the container which we will need later.
- `docker cp`  copy our tar file to our host directory. We are
  copying the tar file to our application root directory.
- `docker rm` to remove the container we started in the first place.


## Glue it all together with a simple bash script

Lastly, with some bash scripting, we can glue the build and extraction process
all into a single script `build`:
```bash
#!/bin/bash

# Exit on error
set -e

# Get App info
APP_NAME="$(grep 'app:' mix.exs | sed -e 's/\[//g' -e 's/ //g' -e 's/app://' -e 's/[:,]//g')"
APP_VSN="$(grep 'version:' mix.exs | cut -d '"' -f2)"
TAR_FILENAME=${APP_NAME}-${APP_VSN}.tar.gz

# Build image
docker build -t ${APP_NAME}_server .

# Extract tar
id=$(docker create ${APP_NAME}_server)
docker cp $id:/app/${TAR_FILENAME} .
docker rm $id
```

After saving the `build` file, you need to make it executable by running:

```bash
chmod +x build
```

Now, you can just build your Phoenix application by running `./build`.

# Wrap Up

Building the release is just the very first step of deployment. I'll write up a
upcoming post in the future to cover a bit on how I deploy the tar file
extracted to my production environment _(which is just a DigitalOcean
instnace)_.


[0]: https://www.vagrantup.com/
[1]: https://docs.ansible.com/ansible/latest/index.html
[2]: https://hexdocs.pm/phoenix/releases.html#containers
