---
title: "What you might want to know about GenServer"
date: 2020-05-19T19:21:59+08:00
tags: ['elixir']
---

I once gave a talk about GenServer in a local Elixir meet up in 2019.
To prepare for the talk, I have done a lot of research and readings. With
additional experience working with GenServer in a production environment, I
have come to realize that there are a lot of caveats when using GenServer.

While GenServer is easy to use, there are actually a couple challenges when
using GenServer in a production environment. So, in this post, I'll attempt
to write down _my findings_ about GenServer.

The post will be break down into following sections:

- [Quick Introduction to GenServer](#quick-introduction-to-genserver)
- [When you should and shouldn't use GenServer](#when-you-should-and-shouldn-t-use-genserver)
- [Limitations of GenServer](#limitations-of-genserver)
- [Do and Don't of GenServer](#do-and-don-t-of-genserver)

_Disclaimer: I am no expert in Elixir, Erlang and GenServer. What I wrote,
might be wrong too. However, I tried my best to cross check multiple sources
on what I wrote to ensure the correctness. I have attached the relavant links
I refered to while writing this article for further references. Some of the
points are purely my opinion based on my limited knowledge and experience. Do
take it as a grain of salt._

# Quick Introduction to GenServer

What is GenServer? For someone new to Elixir, GenServer usually came up to
their mind when they need to implement a server process or stateful process.

However, diving a bit deeper, GenServer is actually an OTP behaviour that
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
act as the interface between GenServer and our module. This decouple the
logic of managing process _(what GenServer do)_ from our business logic _(what
our callback modules do)_.


### Why not implementing our own GenServer behavior?

If GenServer is just a pattern that decouple the logic, can't we write
and use our own one?

You can, but GenServer do a lot more than just decoupling these logic. GenServer
take care of some of the cases that we are not aware of in an concurrent system. A
few notable one are:

- Handling system messages
- Handling timeout

The edge cases handled by GenServer are worth writing another separate posts. If
you would like to know more, there is this [article][11] by DockYard
about how GenServer handle some of the concurrent conditions and edge
cases. More details is also layout at the end of the Chapter 3 of
the book ["Designing for Scalability with Erlang/OTP][12].

<div class="callout callout-info">

<p>I only learn about how OTP behaviour is designed to extract common and business
logic behaviour and the edge cases in implementing your own GenServer after
reading the book <a href="http://shop.oreilly.com/product/0636920024149.do">
"Designing for Scalability with Erlang/OTP"</a>.</p>

</div>

# When you should and shouldn't use GenServer?

Coming from a Ruby/Rails background, when I first know about GenServer, I have
no idea on how I can use that in my application, especially in a web application.

It's a cool new amazing concept for me,

> but how can I utilize it?

 That often came up to my mind when I first starting to learn Elixir.

 Before we talk about when it's a good time to use GenServer, let's focus on
 when we _shouldn't use_ GenServer.

 <div class="callout callout-info">
   <p>
   On a side note, There is also an article <a href="https://www.theerlangelist.com/article/spawn_or_not">
   "To spawn, or not to spawn?"</a> that talk about when you should spawn a process.
   The lessons from the article still applied on GenServer <em>(since inherently,
   GenServer is just a process)</em>.
   </p>
 </div>

## When you _shouldn't use_ GenServer

If you have read through the [Elixir documentation of GenServer][0], you might come
across this:

> A GenServer, or a process in general, must be used to model runtime characteristics of your system.
> A GenServer must never be used for code organization purposes.

As mentioned above, our GenServer is just another stateful process. It's a
pattern to write stateful process. Hence, it **should never be use for code
organization**. Use module for that instead.

While it is possible to do the following with GenServer too, it's not really
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
to GenServer as base when you need extra customization.

If `Agent` doesn't fit your requirement, then look into the combination of
GenServer and `ETS` instead. Avoid writing your own GenServer to track key
value pair, or other kind of state, unless it is a short term state. E.g. state
of a game match.

Also, try to **avoid storing global state** with GenServer _unless you are
100% sure that you won't run the application on multiple nodes_. When you start
running GenServer process that store state in multiple nodes, things get
really tricky. Chris Keathley wrote about the reasons really well in his
article ["The dangers of the Single Global Process"][5].

Well again, _it really depends on your system requirements_ and you'll have to
make the design decision.

## When you _should_ use GenServer?

It's a bit irony isn't it. We have just go through a few use cases of GenServer in
the section of "When you shouldn't user GenServer?".

But that's the reality of design decision. That's no silver bullet to every problems,
it really depends on the context. The same apply to  when and when you shouldn't use
GenServer.

So here are a list of scenario where it make sense to bring it GenServer:

**1. To send periodic message, or to schedule tasks**

When you need to send periodic message, using GenServer make sense as it
allow you to utilize `Process.send_after` to send periodic message or schedule
one off tasks.

Depending on your needs, you may consider to use [`periodic`][3] library by the
author of Elixir in Action instead of rolling out your own solution. _(You can
also read this [article][4] by the author on the design behind the library)_

If you need more full-fledged solution for scheduling jobs, consider
[`quantum`][2] that allow you to use cron like syntax to schedule jobs.

**2. To gain more control over task execution of `Task` module.**

As mentioned above in using GenServer for simple asynchronous task, you
should probably bring GenServer in with `Task.Supervisor` **only when you
need more control over task execution**. For example, you want to ensure that
a task is really executed and retry if there is failures _(E.g. network
failrues where retry make sense)_.

**3. To use `ets` as store.**

`ets` is really good built-in in memory storage for BEAM. No doubt, there will
be times when you'll need to use this for your production application.
Starting `ets` table in a `GenServer` is definitely the way to go.

This is because `ets` table is owned by the process create it. If the process
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

This is because if we are wrapping `:ets.lookup` in the `GenServer.call`, we
are losing the performance gained from using `ets` and limiting our usage of
`ets`, like reading and writing concurrently with `ets`. The `GenServer.call`
will become the bottleneck as every lookup is going through the
single `GenServer` process. Avoid that, _unless you are doing this intentionally to act
as a backpressure mechanism._

# Limitations of GenServer

As mentioned, GenServer is inherently just a process. Every process in BEAM
has one mailbox, where the messages are processed _synchrounously_. That is the
reason why it can become the bottleneck of your system when the load increased.

As `GenServer` messages in the mailbox increased, it will start performing
even slower due to the internal mechanism on how it process the message.
As your process mailbox get larger, the process will need to go through all the
messages in the mailbox to match the message in the `receive` pattern again.

Here is how the [Erlang documentation][9] describe the mechanism of Process
processing the messages:

> Each process has its own input queue for messages it receives. New messages
> received are put at the end of the queue. When a process executes a receive,
> the first message in the queue is matched against the first pattern in the receive.
> If this matches, the message is removed from the queue and the actions
> corresponding to the pattern are executed.
>
> However, if the first pattern does not match, the second pattern is tested.
> If this matches, the message is removed from the queue and the actions
> corresponding to the second pattern are executed. If the second pattern
> does not match, the third is tried and so on until there are no more patterns to test.

Generally speaking, using GenServer is fine until your load increases
and it become the bottleneck. People commonly use `ets` or
having a pool of `GenServer` processes to cope with the high load.

But, how do you know your GenServer process have too many messages in their
mailbox?  A quick way to check the messages length in your process mailbox is
to use `Process.info(genserver_process, :message_queue_len)`, which will
return the total number meessages in the process mailbox.

If you would like to know more about it, here are some of the resources where I
refer to and that are related:

- [Avoding GenServer bottlenecks][6]
- [GenServer and scaling][7]
- [StackOverflow Question][10]

# Do and Don't of GenServer

Here are some of the do and don'ts when you use GenServer:

## 1. Do have a separate supervisor for your `GenServer` process, instead of using the root supervisor.

Ideally, it's always better to have different `Supervisor` for your GenServer
process, instead of using the root application `Supervisor`. This allow us to
avoid edge scenario where repeating failures of your GenServer process bring
down your whole application.

The idea behind is to always **design your supervision tree and think about how
you need your system to behave when things go wrong**.

According to [Erlang documentation][15], OTP design principles define how we
structure code in terms of processes, modules and directories, and supervision
trees is introduced to help us model our processes based on the idea of
workers and supervisors.

I guess, the takeway would be: **think about the supervision tree of your
GenServer whenever you use GenServer**.

## 2. Do add a catch all for your custom `handle_info` callback.

When we `use GenServer`, Elixir actually include a default catch all
`handle_info` implementation _(from the source code [here][14])_. However,
when you start overwriting by defining your own callback:

```elixir
def handle_info(...) do
  ...
end
```

The default callback is then overridden.

If you don't want unmatch message to raise error in your GenServer, don't
forget to implement a catch all `handle_info`.

## 3. Do understand when to use `cast` and when to use `call`.

As a newcomer to Elixir, the only difference I know about `cast` and `call` is:

- `cast` is asynchronous. Use it when you don't care about the result, or
  whether it has been executed.
- `call` is synchronous. Use it when you need the result, or ensure it has been
  executed.

But when I dive deeper, I found out that calling `cast` on a GenServer
process that doesn't exists will still return you `:ok`. With `cast`, there is
no guarantee that it is executed by your GenServer process. _(Well it's actually
written clearly in the docs but I never read it in detail...)_

There is also this [Elixir forum threads][8] which discuss about why we should use `cast`
sparingly according to the documentation. Some people recommended to always use `call`
and avoid `cast` even you don't need the reply, so that it act as a backpressure and
prevent overloading from the clients _(and also ensure it's really been processed)_.

Again, it really depends the nature of your system. But, do keep in mind of the
trade offs of the decision. And, **when in doubt, use `call`** _(Not the inventor of this quote,
I probably read it somewhere else in the internet)_.

## 4. Don’t use atom for dynamically allocated name for GenServer name registration.

This is also mentioned clearly in [Elixir GenServer documentation][16]:

> If there is an interest to register dynamic names locally, do not use atoms,
> as atoms are never garbage-collected and therefore dynamically generated atoms
> won't be garbage-collected.

As mentioned, atoms are never garbage-collected. So, you could end up crashing
your BEAM VM if your code happens to create _too much_ dynamic naming
GenServer.

The documentation suggested to setup our own local registry with `Registry`
module. I have not much experience on this so I'll probably stop here.

# Wrap Up

Before I wrap up, There are a couple of well known Elixir library that is build
on top of GenServer. To named a few:

- [GenStage](https://github.com/elixir-lang/gen_stage)
- [Flow](https://github.com/dashbitco/flow)
- [Broadway](https://github.com/dashbitco/broadway)

All these libraries are build on top of plain OTP behaviour like GenServer and
Supervisor, which then allow more specific use case. The authors take care of
the generic behavior and allow us to implement application specific logic and
code.

I also tried to look up a few real world use case of plain GenServer behaviour
and here are what I found over the internet:

- [Rate Limiter with GenServer and ETS][13]
- Key Value Cache with GenServer and ETS
  - [con_cache](https://github.com/sasa1977/con_cache)
  - [cachex](https://github.com/whitfin/cachex)
- [Discord usage of GenServer][17]

Hopefully, this post covers all the things you need to know about GenServer
before using it in production. Again, I am no expert in this area and I am just
presenting my findings _(which could be wrong)_.

Different systems have different requirements. It is important to understand
why one have a different approach in their context before following blindly.
The same applies to some of the opinion here. I might say don't do this and
that, but _you probably know your system better than me to make a better decision_.

[0]: https://hexdocs.pm/elixir/GenServer.html#module-when-not-to-use-a-genserver
[1]: https://dockyard.com/blog/2019/04/02/three-simple-patterns-for-retrying-jobs-in-elixir
[2]: https://github.com/quantum-elixir/quantum-core
[3]: https://hexdocs.pm/parent/Periodic.html#content
[4]: https://www.theerlangelist.com/article/periodic
[5]: https://keathley.io/blog/sgp.html
[6]: https://www.cogini.com/blog/avoiding-genserver-bottlenecks/
[7]: https://groups.google.com/forum/#!msg/elixir-lang-talk/PY4n1qsI3vU/DZNpHfpxqD8J
[8]: https://elixirforum.com/t/genserver-docs-handle-cast-should-be-used-sparingly-why
[9]: https://erlang.org/doc/getting_started/conc_prog.html#processes
[10]: https://stackoverflow.com/questions/36216246/in-erlang-when-a-processs-mailbox-growth-bigger-it-runs-slower-why
[11]: https://dockyard.com/blog/2016/11/18/how-genserver-helps-to-handle-errors
[12]: http://shop.oreilly.com/product/0636920024149.do
[13]: https://dockyard.com/blog/2017/05/19/optimizing-elixir-and-phoenix-with-ets
[14]: https://github.com/elixir-lang/elixir/blob/master/lib/elixir/lib/gen_server.ex#L781
[15]: https://erlang.org/doc/design_principles/des_princ.html#supervision-trees
[16]: https://hexdocs.pm/elixir/GenServer.html#module-name-registration
[17]: https://blog.discord.com/scaling-elixir-f9b8e1e7c29b
