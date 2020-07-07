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

## Setting Up NGINX

Before we go into details on how we can setup our Blue Green deployment, it's
important for us to understand the building blocks that make it possible. We'll
start with understanding how NGINX can help us with that.

Here, we assumed you have the basic knowledge of nginx and how it's used as a
reverse proxy to direct traffic to our application.

### Initial Nginx Configuration
Let's start by writing our initial Nginx configuration file _([as refer from Phoenix Documentation][1])_ and placed it under `/etc/nginx/sites-available/blue`:

```nginx
upstream phoenix {
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

    proxy_pass http://phoenix;
  }
}
```

We are putting it in `sites-available` instead of `sites-enabled` is because we
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
result. These will act as the blue of our blue green deployment.

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

- Switch Version
- Deployment Version

## Blue Green Deployment manually

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

- What's the drawback?
  - Multi node deployment
  - Zero downtime not tested on Pheonix Channels
  - Downtime with Database Migration
  - Rollback version






[0]: https://www.kimsereylam.com/gitlab/nginx/dotnetcore/ubuntu/2019/01/04/custom-blue-green-deployment-with-nginx-and-gitlab-ci.html
[1]: https://hexdocs.pm/phoenix/1.3.0-rc.1/phoenix_behind_proxy.html
