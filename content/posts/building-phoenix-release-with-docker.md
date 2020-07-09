---
title: "Building Elixir/Phoenix Release With Docker"
date: 2020-06-20T14:17:08+08:00
tags: ['elixir', 'phoenix', 'docker', 'deployment']
---

This is a short post about how I build my Elixir/Phoenix releases with
Docker and extract the tarball that will be deployed to production. In this
approach, we are just building the release with Docker. _We are not building
the image to run our application in a Docker container._

This post assume that you have the basic knowledge of Docker,
building Elixir release and using Elixir 1.9.3 and above, where `:tar` options
is supported in Elixir releases. Your `mix.exs` should also have the similar
configuration as below:

```elixir
def project do
  [
    ...
    releases: [
      app_name: [
        # Ask mix release to build tarball of the release.
        steps: [:assemble, :tar]
      ]
    ]
  ]
end
```

For more, can refer to the [`mix release` documentation](https://hexdocs.pm/mix/Mix.Tasks.Release.html#module-steps).

This post is break down into the following sections:

- [Why Docker?](#why-docker)
- [Writing the Dockerfile](#writing-the-dockerfile)
- [Extracting tar file from Docker](#extracting-tar-file)
- [Glue it all together with a simple bash
  script](#glue-it-all-together-with-a-simple-bash-script)

By the end of this post, you should be able to build your Elixir/Phoenix
application by just running:

```
./build
```


## Why Docker?

To deploy a release to a target _(your production server)_, most of the time
you are required to build the release in the host with the same environment.
To quote the [Mix Release documentation][3]:

>  ...to deploy straight from a host to a separate target, the Erlang Runtime System (ERTS),
>  and any native dependencies (NIFs), must be compiled for the same target triple.

Hence, if you are using a Macbook, and want to build you release and deploy
to a Ubuntu 18.04 server, you'll need to build your release on a Ubuntu 18.04 virtual machine (VM).

_Unless you configure it to `include_erts: false`. Not going to dive deep into
this, but if you are interested into it, feel free to refer to the
documentation at [here][5]._

### Without Docker

Without using Docker, normally the common approaches are:

- Build the release by spinning up VM locally with Vagrant.
- Build the release in a build server in the cloud.

I previously setup a Ubuntu VM with Vagrant and have Ansible
script that provision the VM and build the release in the VM locally. This
approach have more dependencies. You'll need to understand and install both
Vagrant and Ansible to make this happen.

### With Docker
With Docker, **all you need is to learn and install Docker**.

After getting familiar with Docker, I experiment with building
Elixir release with Docker, which turns out to be fairly simple, thanks to
the resource available online. I end up gluing it all together with some
bash script to build the release in Docker and extract the tarball from the
Docker images.

## Writing the Dockerfile

To build your Docker image, you'll first need to write the Dockerfile. In the
process of writing these Dockerfile, there are a few references that I refer
to, which are:

- [Distillery Documentation](https://hexdocs.pm/distillery/guides/building_in_docker.html)
- [Elixir Official Dockerfile](https://github.com/c0b/docker-elixir/blob/fcf3a05b730e55b805b85aa571048e72dc82fe1e/1.10/Dockerfile)
- [Phoenix Documentation][2]

While we are not using `distillery` to generate our releases, the documentation
is still quite relevant especially when we want to build our release with
Docker. _It's not until I am more familiar with Docker and wrote my
own bash scripts that I realized that the documentation of `distillery`
is really good._

### Parent Image

Depending on your production environment , you might just want to use the
official Elixir image as your parent image, which is based on Debian.

```docker
FROM elixir:1.9.0 AS build
```

and [skip to the next section](#build-image).

However if you are using Ubuntu 18.04 on your production machine,
you can use the following `Dockerfile` as the base image for Elixir
in Ubuntu 18.04.

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
following command to build the parent image:

```bash
docker build -t ubuntu-elixir -f Dockerfile.ubuntu .
```

### Build Image

Writing the rest of the Dockerfile for building release is fairly straightforward
as I am referring to the Phoenix ["Deploying with Releases"][2] documentation.

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

FROM scratch AS app

WORKDIR /app
COPY --from=build /app/_build/prod/app_name-*.tar.gz ./

CMD ["/bin/bash"]
```

There are some minor differences in this Dockerfile compared to the one in the
documentation. For example:

- `RUN apk add --no-cache build-base npm git python` is not included as we have
  added this in our `Dockerfile.ubuntu`. However, if you are not using the same
  one, do add it in according to your OS package management.
- At the end of the Dockerfile, instead of copying our whole release and make
  `CMD` to start the release, we just copy the tar file of the release. Also
  notice that we use `FROM scratch` instead of `FROM ubuntu:18.04` to reduce
  our final image size _(since we are just storing the tar file)_.

Now you can build your release by running:

```
docker build -t app_name_server .
```

## Extracting tar file

After building the image, we can then extract the tar file from the image by
running the following command:

```bash
# You could also just manually specifying your app name and version.
APP_NAME="$(grep 'app:' mix.exs | sed -e 's/\[//g' -e 's/ //g' -e 's/app://' -e 's/[:,]//g')"
APP_VSN="$(grep 'version:' mix.exs | cut -d '"' -f2)"
TAR_FILENAME=${APP_NAME}-${APP_VSN}.tar.gz

id=$(docker create ${APP_NAME}_server)
docker cp $id:/app/${TAR_FILENAME} .
docker rm $id
```

Here are the explanation of the main commands we run:

- `docker create` create a container with your image. The output of the
  command is the id of the container which we will need later.
- `docker cp`  allow us to copy the file in the container to our local directory.
   Here, we are copying the tar file to our application root directory.
- `docker rm` remove the container we started in through `docker create`.


## Glue it all together with a simple bash script

Lastly, with some bash script, we can glue the build and extraction process
all into a single script `build`:
```bash
#!/bin/bash

# Setting the flag to exit on error

# Without this, for example, when we didn't run Docker daemon
# the script will still continue to execute despite of the error.
set -e

# Get App info (which is copied from Distillery documentation)
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

## Wrap Up

Building the release and getting the tarball is the very first step of deployment. The next steps of deployment normally involves:

- Copying the tar file to production server
- Extracting the tar file
- Running the release
- Cleaning up the tar file both in production and local machine _(Optional)_

I'll write up a upcoming post in the future to cover on all these steps in the
future. Stay tuned.

<div class="callout callout-info">
  <p>
    The same deployment process is also used in my
    <a href="https://github.com/kw7oe/til">open source TIL</a> project.
    While it's not documented clearly, the build and deploy script are there
    for references.
  </p>
  <p>At the time of writing, the deploy script includes buildkite command to
  download the tar file, so you might need to comment out that specific line
  to run directly</p>
</div>


[0]: https://www.vagrantup.com/
[1]: https://docs.ansible.com/ansible/latest/index.html
[2]: https://hexdocs.pm/phoenix/releases.html#containers
[3]: https://hexdocs.pm/mix/Mix.Tasks.Release.html#module-requirements
[4]: https://github.com/kw7oe/til
[5]: https://hexdocs.pm/mix/Mix.Tasks.Release.html#module-options
