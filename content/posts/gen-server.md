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

## Quick Introduction to GenServer

What is GenServer? For someone new to Elixir, GenServer usually came up to
their mind when they need to implement a server process, a stateful process.

However, diving a bit further, GenServer is actually an OTP behaviour that
implemet a client-server relation.

But, what is an OTP behaviour? Behaviour is basically common pattern that
abstract generic and specific logic into different modules, such as behaviour module
and callback module. All of these behaviours are derived from years of
battle-tested production system. With that, the OTP behaviours also take care of some
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






