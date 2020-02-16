---
title: Minimal Elixir Web Application with Plug and Cowboy
date: 2018-10-14T15:32:00+0800
tags: ["elixir"]
---

It is interesting to learn things from scratch. Coming from Ruby
background, I was curious what is the equivalent of Sinatra in
Elixir. It's called Plug. It is what Phoenix build on top of.

Using Sinatra, we can write a quick and simple web server with the following
code:

```ruby
require 'sinatra'
require 'json'

get '/' do
  content_type :json
  JSON({message: "Hello World"})
end
```

How can we achive that in Elixir? With `Plug` and `Cowboy`.

## Setup

_**NOTE**: This article is based on Elixir v1.7.3_

First of all, let's create a `mix` project and change directory into it.

```bash
mix new sample_app
cd sample_app
```

Open `mix.exs` file with your favourite editor. And add the dependencies as
follow:

```elixir
defp deps do
  [
    {:cowboy, "~> 2.0"},
    {:plug, "~> 1.0"}
    # {:dep_from_hexpm, "~> 0.3.0"},
    # {:dep_from_git, git: "https://github.com/elixir-lang/my_dep.git", tag: "0.1.0"},
  ]
end
```

We add `Plug` and `Cowboy` as dependencies because `Cowboy` act as a web server and
`Plug` on the other hand, act as a connection adapter to the web server.

Before we proceed, let's get all the dependencies first by running the
following command:

```
mix deps.get
```

## Using Plug

`Plug` can be complicated if we don't understand it. The
best way to understand it, is to, read the [documentation][3] _(In fact, all the
steps mentioned above and below are already available in the documentation)_.

So to get a taste of how `Plug` works, let's just copy and paste the code from
the documentation and make some changes. Let's create `lib/my_plug.ex` and
and add in the code.

```
touch lib/my_plug.ex
```

```elixir
defmodule SampleApp.MyPlug do
  import Plug.Conn

  def init(options) do
    # initialize options

    options
  end

  def call(conn, _opts) do
    conn
    |> put_resp_content_type("text/plain")
    |> send_resp(200, "Hello world")
  end
end
```

Let's try to run the code.

```
iex -S mix

iex(1)> {:ok, _} = Plug.Adapters.Cowboy2.http SampleApp.MyPlug, []
```

Now let's go and visit <a href="http://localhost:4000" target="_blank">http://localhost:4000</a>.
You should be able to see a "Hello World" on your browser.
We just start the `cowboy` web server in `iex`, by passing it our `Plug` and `[]`
empty arguments.

## That's all

Yes, you have wrote a simple web server using Elixir.

_Wait, wait, but how can I run my server through command line? I have to run
`iex -S mix` and start the `Cowboy` server manually every time?_

**Nope.** We can make it an OTP application. So that we just need to run `mix run --no-halt` or `iex -S mix` and the `cowboy` server will boot up itself.

## Basic of OTP Application

OTP application is basically a component that has predefined behaviour. It can
be started, loaded or stopped. To create an OTP application in Elixir, we
use the `Application` module and implements some of the expected behavior. For
more you can always refer to the documentation of [Application][5].

So let's create a simple application first.

```
touch lib/app.ex
```

```elixir
defmodule SampleApp.App do
  use Application
  def start(_type, _args) do
    IO.puts "Starting application"
    children = []
    Supervisor.start_link(children, strategy: :one_for_one)
  end
end
```

Now if you run `mix run --no-halt`, you still won't see the "Starting
application" output yet. This is because we haven't configure our `mix.exs`
yet.

To make `mix` run our application, we have to add the following code into
`mix.exs`:

```elixir
def application do
  [
    extra_applications: [:logger],
    mod: {SampleApp.App, []} # Add in this line of code
  ]
end
```

Now, if we run `mix run --no-halt`, we can finally see the "Starting
application..." output. It also means we have sucessfully start an OTP
application.

## Starting Cowboy Server automatically

Remember how we run our `cowboy` server in `iex`?

```
iex -S mix

iex(1)> {:ok, _} = Plug.Adapters.Cowboy2.http SampleApp.MyPlug, []
```

Now after knowing how to start our OTP application with `mix run --no-halt` or
`iex -S mix`, we need to start our `cowboy` server after our application is
started.

To do this, we need to modify the `start/2` method in the `app.ex`.

```elixir
def start(_type, _args) do
  children = [
    # Define workers and child supervisors to be supervised
    Plug.Adapters.Cowboy2.child_spec(scheme: :http, plug: SampleApp.MyPlug, options: [port: 4000])
  ]

  Supervisor.start_link(children, strategy: :one_for_one)
end
```

What we are doing here is to specify the child spec of the child process, which
is our `cowboy`. A child specification basically tell the supervisor how to
start, restart or shutdown the child process. The above code is also mentioned
in the documentation of Plug under [Supervised handlers][6].

Now, if we run the `mix run --no-halt`, and visit <a
href="http://localhost:4000" target="_blank">http://localhost:4000</a>.

Our web application is now online.

## Summary

If you're a beginner to OTP or Elixir, there are a lots of stuff underneath
that I didn't cover well. This is my first blog post on Elixir. It might be lacking.
So here are some other resources you can refer to:

- [Elixir School Plug][7]<a href="#one"><sup>1</sup></a>
- [Plug documentation][9]
- [Application documentation][5]
- [Supervisor documentation][8]

_The source code of the project is available at [GitHub][10]._

---

**Footnote**

1. <small id="one">To be honest, **Elixir School does a better job in explaining this topic**.
   The way I'm writing is based on how my thought process flow, so it might be
   different and unstructured. This post also covers less topics about using
   Plug compared to Elixir School.
   </small>

[1]: https://github.com/ninenines/cowboy
[2]: https://github.com/elixir-plug/plug
[3]: https://github.com/elixir-plug/plug#hello-world
[5]: https://hexdocs.pm/elixir/Application.html
[6]: https://hexdocs.pm/plug/readme.html#supervised-handlers
[7]: https://elixirschool.com/en/lessons/specifics/plug/
[8]: https://hexdocs.pm/elixir/Supervisor.html
[9]: https://hexdocs.pm/plug/readme.html
[10]: https://github.com/kw7oe/plug_sample_app
