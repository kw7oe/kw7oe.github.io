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

### When you shouldn't use GenServer

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

**Unless you need more control over the task execution** such as error handling,
monitoring and job retry, then implementing a `GenServer` with
`Task.Supervisor` is very reasonable.

However do note that `GenServer` is a single process and will inherently become
your bottleneck when the load increase.

On a side note, [there is this article from DockYard where the author demostrated
on how we can implement job retry with `GenServer` and `Task.Supervisor`.][1]

**2. Storing state.**

Start by using `Agent`. If it provide what you need, that's great. A rule of
thumb is to reach for tool that have a higher level abstraction. Only reach out
to `GenServer` as base when you need extra customization.

If `Agent` doesn't fit your requirement, then look into the combination of
`GenServer` and `ETS` instead. Avoid writing your own `GenServer` to track key
value pair, or other kind of state, unless it is a short term state. E.g. state
of a game match.

Well again, it really depends on your system requirements and you'll have to
make the design decision. But do keep the rule of thumb in mind.

### When you should use GenServer?

It's a bit irony isn't it. We have just listed a few use cases of GenServer in
the section of "When you shouldn't user GenServer?". But that's the reality of
design decision. That's no silver bullet to every problems, it really depends
varily based on the context. It's the same for when and when you shouldn't use
GenServer.

So here are a list of scenario where it make sense to bring it `GenServer`:

- To send periodic message, or to schedule tasks
- To gain more control over task execution of `Task` module.
- To use `ETS` as store.



[0]: https://hexdocs.pm/elixir/GenServer.html#module-when-not-to-use-a-genserver
[1]: https://dockyard.com/blog/2019/04/02/three-simple-patterns-for-retrying-jobs-in-elixir
