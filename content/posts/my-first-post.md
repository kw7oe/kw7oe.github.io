---
title: "Deploying Phoenix Application to DigitalOcean with Elixir Releases"
date: 2020-02-09T17:57:21+08:00
draft: false
tags: ["elixir", "phoenix", "deployment"]
categories: ["technical"]
toc: true
---

Deployment in Elixir and Phoenix can be hard for starter. However, with `mix release` added in Elixir 1.9, it become much more straightforward. No any external dependencies like `distillery` or `edeliver` is needed any more to generate a release for deployment.

At the first sight, deployment in Elixir/Phoenix might be very complicated and unwelcoming. However, with some research and experimentation, it is actually straightforward and easy. Today, I am going to cover what I have learned during the process of deploying Phoenix application to DigitalOcean with the latest Elixir Releases feature.

## Basic of Releasing Elixir Application

Before we get started, it is important to understand the basic process of releasing an Elixir application. With the addition of `mix release` in Elixir 1.9, this process has become much simpler. Below are the basic overview of how we can generate a release for Elixir application:

- Run `MIX_ENV=prod mix deps.get` to get the dependencies.
- Run `MIX_ENV=prod mix release` to compile the release.

Depending on the context, there are different approaches people used deploy this release to the server.  Here are some of them:

### The Manual Way

- SSH to the production server
- Clone the Elixir repository
- Run the above steps
- Run `_build/prod/rel/app_name/bin/app_name start` to start your Elixir application.

With this approach, we don't need to setup another build server to generate release for our Elixir application and can guarantee that the release will always work *(since it is generated using the same environment)*.

However, this approach incur overhead during the compilation of our code and assets, which might in turn have undesirable effect for the production server.

### The Slightly Better Way

- Run the above steps.
- Create a tarball from the releases.
- SCP tarball to production server.
- Extract tarball in production server.
- Run `_build/prod/rel/app_name/bin/app_name start` to start your Elixir application.

With this approach, we will need to setup a build server. Do note that it is better if we build the releases in the same environment with our production environment. For example, if we are deploying to a Ubuntu server, then we should also build the release in a Ubuntu server.

In this post, we are going to use the second approach. However, instead of running it manually, we will use Ansible to automate the process *(we still need to run the ansible command to deploy it)*.

*P.S There are other approaches using container such as Docker/Kubernetes. While it works, for personal project, it can be a bit overkill. Generally, the underlying concept is still similar. Instead of having `Release -> Server -> Start`, we involve more abstraction in which is `Release -> Docker Image -> Server -> Start Docker`. These approaches are beneficial when you need to deploy your application in a lots of server/nodes.*

## Let's Get Started

First of all, here are the things you need to install before proceeding we get started:

- [Vagrant]([https://www.vagrantup.com/downloads.html](https://www.vagrantup.com/downloads.html))
- [Ansible]([https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html?extIdCarryOver=true&sc_cid=701f2000001OH7YAAW](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html?extIdCarryOver=true&sc_cid=701f2000001OH7YAAW))
- Phoenix Application

**Why we need Vagrant?**

We use Vagrant to simulate both the build and production server locally without needing to spin up a virtual server on the cloud. This allow to iterate our script and deployment process without needed to pay for cloud server.

1. Setting Up Build and Production Server
    - Provision Build Server
    - Provision Production Server (create user and database)

## Setting Up Build and Production Server

***SKIP THIS IF YOU DO NOT PLAN TO USE VAGRANT***

To spin up your build and production server locally with Vagrant, first we need to tell Vagrant what it need to spin up. To do that, we can use the following Vagrant syntax to tell it to spin up two server.

But before that, let's create a `deployment` folder in our Phoenix application directory to place all of our deployment related files and directories. Then, change directory into `deployment` folder and create  `Vagrantfile` .

    mkdir deployment
    cd deployment
    touch Vagrantfile

In your `Vagrantfile`:

    # -*- mode: ruby -*-
    # vi: set ft=ruby :

    Vagrant.configure("2") do |config|
      # Operating System used by our VM
      # Should be the same with your real production server
      config.vm.box = "geerlingguy/ubuntu1804"
      config.ssh.insert_key = false

      # Use virtualbox to run our VM
      config.vm.provider "virtualbox" do |vb|
        vb.memory = "1024"
        vb.cpus = 2
      end

      # Define our Build Server
      config.vm.define "build-server" do |v|
        v.vm.hostname = "build-server"
        # Specify the IP address for your server
        # Could be any address
        v.vm.network :private_network, ip: "192.168.43.41"
      end

      # Define our Production Server
      config.vm.define "prod-server" do |v|
        v.vm.hostname = "prod-server"
        v.vm.network :private_network, ip: "192.168.43.40"
      end
    end

After that, we can spin up the server by running:

    vagrant up # To spin up both server, or vagrant up <name> to spin up specific one

 It might take a while to download and build the server, feel free to have a cup of coffee first.

## Provisioning of Build Server

In order to generate release for our Phoenix application, our build server need to have some of the following:

- SSH key, so we can pull our code from GitHub repository
- Erlang/OTP and Elixir to compile our Elixir code
- Build essential to compile native code
- Node.js to compile JavaScript assets

To automate this process, we are going to use an Ansible script to set things up.

**What is Ansible?**

Ansible is basically scripting, but with more building blocks to aid in automation process. It allows us to reuse what others have written, which are what they call playbooks and roles. For example, instead of writing different bash script to install Node.js in different OS (Ubuntu, CentOS, etc), we can just "import" existing playbook that does the installation for us.

The syntax for Ansible script mainly consists of `YAML` and `jinja` style templating syntax, so it should be easy to understand if you have experience with those syntax.

Let's create a `playbooks` directory where we can place all our Ansible playbooks. Then, create the `provision-build.yml` file where we write the Ansible script to provision our build server.

    cd deployments
    mkdir playbooks
    touch provision-build.yml

In `/deployments/playbooks/provision-build.yml`

    ---
    - hosts: build
      become: yes
      vars_files:
        - vars/main.yml

      tasks:
        - name: Update apt packages
          apt:
            update_cache: yes
            cache_valid_time: 6400
        - name: Generate SSH keys
          command : ssh-keygen -q -t rsa -f .ssh/ssh_host_rsa_key -C "" -N ""
          become: no
          args:
            creates: .ssh/ssh_host_rsa_key

        - name: Add an apt ubuntu/erlang_solutions signing key
          apt_key:
            url: https://packages.erlang-solutions.com/debian/erlang_solutions.asc
            state: present

        - name: Add erlang-solutions repository into sources list
          apt_repository:
            repo: deb https://packages.erlang-solutions.com/ubuntu xenial contrib
            state: present

        - name: Install basic packages
          package:
            name: "{{ item }}"
            state: present
            update_cache: yes
            cache_valid_time: 3600
          with_items:
            - build-essential

        - name: Install Elixir and Erlang
          apt:
            pkg: [erlang, elixir]
            state: present
            update_cache: yes
            cache_valid_time: 3600
          with_items:
            - erlang
            - elixir

      roles:
        - geerlingguy.nodejs

For those who are unfamiliar with Ansible, `hosts: build` means that we are targeting to run this playbook on our `build` server. `become: yes` means that after Ansible ssh to the build server, it will execute all the commands as `root`. This is required as we are going to install a bunch of packages.

    vars_files:
      - vars/main.yml

Here, we specify where Ansible can refer the variables used in our script. Currently, other than the `geerlingguy.nodejs` role that required some of the variables, our own tasks don't require any of them. So let's create our `vars/main.yml`.

    mkdir vars
    touch main.yml

In `vars/main.yml`, let's add this:

    nodejs_npm_global_packages:
      - name: webpack
      - name: webpack-cli

Basically, this means that we are going to install `webpack` and `webpack-cli` in our build server through `geerlingguy.nodejs` role.

Other tasks that we run on our build server are:

- Update `apt` packages
- Generate SSH key, in case we need it to pull code from private repository.
- Add Erlang Solutions repo and its signing key
- Install Erlang and Elixir

## Provisioning of Production Server

Unless we have a system administrator to help us to setup our production server, most of the time, we will need to do it on our own. Googling around might help with this process, but undoubtedly, it can be a frustrating process.

So before, we can run our Elixir release on our production server, depending on the system architecture, there are a few things that we might need to setup first:

- Create a non-root sudo user to use it to run deployment related command.
- Install database such as PostgreSQL *(unless you are hosting your database on another server)*
- Create database user and table for the application
- Configure `nginx` if we are using it as proxy
- Configure HTTPS

While the resources of setting all this up is widely available, especially from DigitalOcean, copy and pasting the command can be very repetitive and error-prone. In order to streamline this process, we will be going to write a `ansible` script to provision our server. However, due to my limited knowledge on `ansible` and DevOps, some manual interventions are still required.

**To sum up, our Ansible script will be responsible to do the following:**

- Setup firewall
- Setup basic security
- Setup basic `nginx`, which will require a little bit of manual intervention later.
- Setup PostgreSQL, which involves in creating user and database.

**and things we have to do manually are:**

- Create non-root sudo user
- Configure `nginx`
- Configure HTTPS with Cloudfront

### Create User on Production Server

[How To Create a Sudo User on Ubuntu [Quickstart] | DigitalOcean](https://www.digitalocean.com/community/tutorials/how-to-create-a-sudo-user-on-ubuntu-quickstart)

    ssh root@<ip-address>
    adduser <username>
    usermod -aG sudo <username>
    su - <username> # To test

### Ansible Script for Provisioning of Production Server

After setting up our user in the production server, we will proceed to provision it with our Ansible script. The reason it happens after creating user is because we are going use the non-root user we created to run any script we wrote.

Let's create the `provision-prod.yml`.

    cd deployment/playbooks
    touch provision-prod.yml

In `deployment/playbooks/provision-prod.yml`:

    ---
    - hosts: production
      become: yes

      vars_files:
        - vars/main.yml

      roles:
        - geerlingguy.firewall
        - geerlingguy.security
        - role: geerlingguy.nginx
          vars:
          nginx_upstreams:
            - name: phoenix
              servers: {
                "127.0.0.1:4000"
              }
          nginx_vhosts:
            - listen: "80"
              server_name: "{{ domain }}"
              server_name_redirect: "www.{{ domain }}"
              root: "/var/www/{{ domain }}"
              index: "index.php index.html index.htm"
              state: "present"
              template: "{{ nginx_vhost_template }}"
              extra_parameters: |
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
        - role: geerlingguy.postgresql
          vars:
            postgresql_python_library: python3-psycopg2
            postgresql_databases:
              - name: "{{ db.name }}"
            postgresql_users:
              - name: "{{ db.user }}"
                password: "{{ db.user_pass }}"
                db: "{{ db.name }}"
          tags: postgresql

As you can see, now our host is `production` instead of `build`. So, when Ansible run the script, it will connect to the `production` host we defined in our `inventories/production`.

Here instead of `tasks`, we have `roles` with its variables defined. This also means that, here we are reusing others people Ansible script to set things up. Unlike the provision script for build server, with `roles` we are using more custom variables. So, let's proceed to add all these variables into our `playbooks/vars/main.yml`.

In `playbooks/vars/main.yml`:

    # Security settings for our production server
    security_ssh_port: 22
    security_ssh_password_authentication: "no"
    security_ssh_permit_root_login: "no"
    security_ssh_usedns: "no"
    security_fail2ban_enabled: false

    # Firewall configuration
    # Here we only allow access to port 22, 80 and 443
    firewall_allowed_tcp_ports:
      - "22"
      - "80"
      - "443"

    # Database variables
    postgresql_python_library: python3-psycopg2
    db:
      name: xue_prod
      user: phoenix
      user_pass: phoenix

    # NodeJS packages to install
    nodejs_npm_global_packages:
      - name: webpack
      - name: webpack-cli

    # nginx configuration
    domain: 'xue.kaiwern.com'

## Configure Phoenix Application for Releases

While waiting for our Vagrant servers to be setup, let's configure our Phoenix application to be ready for release. Things I cover here are mostly already covered in the [documentation](https://hexdocs.pm/phoenix/releases.html#content). Basically, the steps mentioned in the documentation can be categorized into these few categories:

- Setting up environment variables
- Compiling Elixir application code
- Compiling Assets
- Generating releases
- Add Ecto migration commands

There is one thing that are not covered in the documentation at the time of this writing is generating tarballs *(so we can transfer it to our server, extract it and run it there)*.

At the time of writing, with Elixir `v1.9.1`, we'll have to write our own code to generate tarball after the releases is build. But, don't worry, the code of generating tar is already merge to Elixir `master` and available for references in the [PR]([https://github.com/elixir-lang/elixir/pull/9290](https://github.com/elixir-lang/elixir/pull/9290)). For the time being, we'll just copy the code from the PR and paste it into our codebase.

With Elixir `v1.9.3`, generating tar is now supported in `mix release`. We can add it in very easily by just adding `:tar` to our `steps`:

In your `mix.exs`, your `project` will look something like this:

    def project do
        [
          app: :app_name,
          version: "0.1.0",
          elixir: "~> 1.5",
          elixirc_paths: elixirc_paths(Mix.env()),
          compilers: [:phoenix, :gettext] ++ Mix.compilers(),
          start_permanent: Mix.env() == :prod,
          aliases: aliases(),
          deps: deps(),
          releases: [
            app_name: [
              steps: [:assemble, :tar]
            ]

        ]
      end

### Steps

- Run `mix phx.gen.secret` to generate secret key.
- Run `export SECRET_KEY_BASE=secretkeygeneated` to save the generated secret key to environment variable
- Run `export DATABASE_URL=ecto://postgres:postgres@localhost/database` to save our database URL to environment variable
- Run `mix deps.get --only prod` to get our production dependencies.
- Run `MIX_ENV=prod mix compile` to compile our application.
- Run `npm run deploy --prefix ./assets` to compile our assets.
- Run `mix phx.digest` to generate digest for our assets.
- Run `MIX_ENV=prod mix release` to generate releases.

Also, don't forget to add the following configuration to your `prod.secret.exs` to ensure that our web servers is started:

    config :my_app, MyApp.Endpoint,
      http: [:inet6, port: String.to_integer(System.get_env("PORT") || "4000")],
      secret_key_base: secret_key_base,
      server: true # To start server automatically

[Add `:tar` option for releases to create a tarball by Gazler · Pull Request #9290 · elixir-lang/elixir](https://github.com/elixir-lang/elixir/pull/9290)

### Configure Nginx

[](https://hexdocs.pm/phoenix/1.3.0-rc.1/phoenix_behind_proxy.html)

In `/etc/nginx/sites-enabled`:

    upstream phoenix {
        # Change the 4000 if you are using a different PORT number.
        server 127.0.0.1:4000;
    }

    server {
        listen 80;
        listen [::]:80;
        server_name default_server;

        root /var/www/html;
        index index.php index.html index.htm;

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

After that, we can check the nginx configuration by running `sudo nginx -t` and restart nginx with `sudo systemctl restart nginx` to see the changes.

**Why place it in `sites-enabled`?**
Some of you might been reading elsewhere where we should put the configuration under `/etc/nginx/sites-available` . While that works, it required additional symlink to `sites-enabled` to enable the configuration *(it is stated in the last few lines of `/etc/nginx/sites-available/default`)*.

Hence, to save some operational overhead, we can directly place it under `sites-enabled` to enable the configuration.

### Configure HTTPS and SSL with Cloudflare and Nginx

[How To Host a Website Using Cloudflare and Nginx on Ubuntu 16.04 |
DigitalOcean](https://www.digitalocean.com/community/tutorials/how-to-host-a-website-using-cloudflare-and-nginx-on-ubuntu-16-04)
