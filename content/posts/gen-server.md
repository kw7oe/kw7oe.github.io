---
title: "GenServer"
date: 2020-04-13T21:21:59+08:00
draft: true
tags: ['elixir']
---

In 2019, I once gave a talk about GenServer in a local Elixir meetup. In
the talk, I gave a quick introduction on GenServer and talk about the best
practices of using GenServer.

To prepare for the talk, I have done a lot of research and readings. With
experience working with GenServer in a production environment, I
have also realized that there are a lot of caveats when using GenServer.

While GenServer is easy to use, there are actually a lot of challenges when
using GenServer in a production environment.  So, in this post, I'll attempt
to write down my findings about GenServer.

The post will be break down into following sections:

- Introduction to GenServer
- When you should and shouldn't use GenServer
- Do and Don't of GenServer
- Limitations of GenServer
- Common Usage of GenServer

# Quick Introduction to GenServer

What is GenServer? For someone new to Elixir, GenServer usually came up to
their mind when they need to implement a server process, a stateful process.

However, diving a bit further, GenServer is actually an OTP behaviour that
implemet a client-server relation.

But, what is an OTP behaviour? Behaviour is basically common pattern that
abstract generic and specific logic into different modules, such as behaviour module
and callback module. All of these behaviours are derived from years of
battle-tested production system. The OTP behaviours also take care of some
of the edge cases for you.

When we `use GenServer`, we are using GenServer behaviour and
implementing our own callback modules.

```elixir
# Our own callback module
def MyServer do
  use GenServer

  def init(_) do
    {:ok, []}
  end

  def handle_call(:ping, _from, state) do
    {:reply, :pong, state}
  end
end

# Using GenServer generic behaviour to interact with our own callback modules
{:ok, pid} = GenServer.start_link(MyServer, [])
GenServer.call(pid, :ping)
#=> :pong
```

When using GenServer, we don't need to know the internal implementation of
GenServer. All we need to is to implement the behaviour callbacks. The callbacks
act as the interface between GenServer and our module. This also decouple the
logic of managing process _(what GenServer do)_ from our business logic _(what
our callback modules do)_.

Well, if GenServer is just a pattern that decouple the logics, can't we create
and use our own one?

You can, but GenServer do more than decoupling these logics. GenServer also
take care of a tons of cases that we are not aware in an concurrent system, a
few notable one are:

- Handling system messages
- Handling timeout

The edge cases handled by GenServer worth writing another separate posts. In
the "Designing for Scalability with Erlang/OTP" book _(at the end of Chapter
3)_, the authors did layout more detailed flow on some of the edge cases that
GenServer handle for us.

# When you should and shouldn't use GenServer?

Coming from a Ruby/Rails background, when I first know about GenServer, I have
no idea on how I can use that in my application, especially a web application.

It's a cool new amazing concept, but how can I utilize it? That often came up
to my mind when I first starting to learn Elixir.

Let's focus on when we should avoid using GenServer behaviour.

## When you shouldn't use GenServer

If you have read through the [documentation of GenServer][0], you might come
across this:

> A GenServer, or a process in general, must be used to model runtime characteristics of your system.
> A GenServer must never be used for code organization purposes.

As mentioned above, our GenServer is just another stateful process. It's a
pattern to write stateful process. Hence, it **should never be use for code
organization**. Use module for that instead.


While it is possible to do the following with `GenServer` too, it's not really
recommended as there are better alternatives:

**1. Use it to execute simple asynchronous task/job**

For this, using `Task` module is recommended instead. Depending on the your
requirment, rolling out your own `GenServer` just to execute asynchronous job
can be a bit too much.

Implementing a `GenServer` with `Task.Supervisor` is **reasonable when you need
more control over the task execution** such as error handling, monitoring and
job retry.

However do note that `GenServer` is a single process and will inherently become
your bottleneck when the load increase.

On a side note, there is this [article][1] from DockYard where the author demostrated
on how we can implement job retry with `GenServer` and `Task.Supervisor`.

**2. Storing state.**

Start by using `Agent`. If it provide what you need, that's great. A rule of
thumb is to reach for tool that have a higher level abstraction. Only reach out
to `GenServer` as base when you need extra customization.

If `Agent` doesn't fit your requirement, then look into the combination of
`GenServer` and `ETS` instead. Avoid writing your own `GenServer` to track key
value pair, or other kind of state, unless it is a short term state. E.g. state
of a game match.

Also, try to **avoid storing global state** with `GenServer` _unless you are
100% sure that you won't run the application on multiple nodes_. When you start
running `GenServer` process that store state in multiple nodes, things get
really tricky. Chris Keathley wrote about the reasons really well in his
article ["The dangers of the Single Global Process"][5].

Well again, it really depends on your system requirements and you'll have to
make the design decision. But do keep the rule of thumb in mind.

---

## When you should use GenServer?

It's a bit irony isn't it. We have just listed a few use cases of GenServer in
the section of "When you shouldn't user GenServer?". But that's the reality of
design decision. That's no silver bullet to every problems, it really depends
varily based on the context. It's the same for when and when you shouldn't use
GenServer.

So here are a list of scenario where it make sense to bring it `GenServer`:

**1. To send periodic message, or to schedule tasks**

When you need to send periodic message, using `GenServer` make sense as it
allow you to utilize `Process.send_after` to send periodic message or schedule
one off tasks.

Depending on your needs, you may consider to use [`periodic`][3] library by the
author of Elixir in Action instead of rolling out your own solution. _(You can
also read this [article][4] by the author on the design behind the library)_

If you need more full fledge solution for scheduling jobs, consider
[`quantum`][2] that allow you to use cron like syntax to schedule jobs.

**2. To gain more control over task execution of `Task` module.**

As mentioned above in using `GenServer` for simple asynchronous task, you
should probably bring `GenServer` in with `Task.Supervisor` **only when you
need more control over task execution**. For example, you want to ensure that
a task is really executed and retry if there is failures _(E.g. network
failrues where retry make sense)_.

**3. To use `ets` as store.**

`ets` is really good built-in in memory storage for BEAM. No doubt, there will
be times when you'll need to use this for your production application. And
starting a `ets` table in a `GenServer` is definitely the way to go.

This is because, `ets` table is owned by the process create it, if the process
is terminated, the `ets` table is also deleted. However, do avoid wrapping
`ets` call with `GenServer` callbacks as follows:

```elixir
defmodule MyETS do
  use GenServer
  @table_name :table

  def init(_) do
    :ets.new(@table_name, [:named_table, read_concurrency: true])
    {:ok, []}
  end

  # AVOID THIS
  # Wrapping look up in a GenServer.call
  def lookup(key) do
    GenServer.call(__MODULE__, {:lookup, key})
  end

  # DO THIS instead
  # Call :ets.lookup directly
  def lookup_v2(key) do
    case :ets.lookup(@table_name, key) do
      [{^key, value}] -> {:ok, value}
      _ -> {:error, :not_found}
    end
  end

  def handle_call({:lookup, key}, _from, _state) do
    case :ets.lookup(@table_name, key) do
      [{^key, value}] -> {:ok, value}
      _ -> {:error, :not_found}
    end
  end
end
```

This is because, if we are wrapping `:ets.lookup` in the `GenServer.call`, we
are losing the performance gained from using `ets` and limiting our usage of
`ets`, like reading and writing concurrently with `ets`. The `GenServer.call`
here will become the bottleneck as every lookup is going through the
single `GenServer` process, _unless you are doing this intentionally to act
as a backpressure mechanism._

[0]: https://hexdocs.pm/elixir/GenServer.html#module-when-not-to-use-a-genserver
[1]: https://dockyard.com/blog/2019/04/02/three-simple-patterns-for-retrying-jobs-in-elixir
[2]: https://github.com/quantum-elixir/quantum-core
[3]: https://hexdocs.pm/parent/Periodic.html#content
[4]: https://www.theerlangelist.com/article/periodic
[5]: https://keathley.io/blog/sgp.html
