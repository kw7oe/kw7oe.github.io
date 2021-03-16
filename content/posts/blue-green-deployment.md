---
title: "Blue Green Deployment"
date: 2020-07-05T10:36:41+08:00
tags: ["elixir", "phoenix", "deployment", "nginx"]
draft: true
---

In this post today, I'll share about how I setup blue green deployment for my
Phoenix application using `nginx`. This post is made possible thanks to this
article about [Custom Blue Green Deployment with Nginx And Gitlab CI][0].

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
  server_name my-app.domain;
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
sudo ln -sf /etc/nginx/sites-available/blue /etc/nginx/sites-enabled/myapp.domain
```

follow by reloading our nginx service configuration:

```sh
sudo systemctl reload nginx
```

Now, visit to `myapp.domain/deployment_id` and you'll see a `green`
text returned.

However, if you try to visit `myapp.domain` and visit other path
of your application, you might get a 502 Bad Gateway. That's because we
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

We are done right? Not quite.

## Blue Green Deployment manually

Well, with all these setup

- Deploy release
- Start release
- Run Migration
- Run remote console

## Glue it all together with script

- build
- deploy
- start
- promote
- clean

## Wrap Up

While this blue green deployment works for our simple use case, there are a few
drawbacks that one need to be aware of.

### Multiple Nodes

When you scale beyond multiple nodes, while it could still work, it becomes
quite tricky to manage. In theory, you can just loop through and execute the
script separately _(or together)_. However, as your needs grow, it will feel
like you are reinventing the wheels.

- What's the drawback?
  - Multi node deployment
  - Zero downtime not tested on Pheonix Channels
  - Downtime with Database Migration
  - Rollback version






[0]: https://www.kimsereylam.com/gitlab/nginx/dotnetcore/ubuntu/2019/01/04/custom-blue-green-deployment-with-nginx-and-gitlab-ci.html
[1]: https://hexdocs.pm/phoenix/1.3.0-rc.1/phoenix_behind_proxy.html
