---
title: "Debugging With Tracing in Elixir"
date: 2020-11-02T20:45:48+08:00
tags: ["elixir", "dbg", "tracing", "debugging"]
series: "Debugging with tracing in Elixir"
---

_If you are a video person, and have 24 minutes to spend with, just jump over to
this [ElixirConf 2020 - Debugging Live Systems on the BEAM talk by Jeffery
Utter][2]._

_This article is a downgraded version of the video_ 😂.

_I wrote this before the video is published. Then, I came across
it and learn a lot more from there._

---

I use `IO.inspect` for debugging in Elixir a lot. But there are times when you
can't just `IO.inspect` to debug stuff, especially in a running production
system _(without redeploying your code)_.

Then, I came across the power of tracing for debugging from
Fred Herbert ["Operable Erlang Elixir"][1] talk. This is especially powerful
for debugging in live production system. _(however, it is not really recommended to
use the options I share below...)_

Today, I am going to cover `:dbg`, where I came across recently
while trying to debug my code.
Here's what you can expect from this post:

- [Introduction](#introduction)
  - [Starting `:dbg`](#starting-dbg)
  - [Specifying what to trace](#specifying-what-to-trace)
  - [Tracing in action](#tracing-in-action)
  - [Stopping the tracing](#stopping-the-tracing)
  - [All together](#all-together)
- [Customization](#customization)
  - [Getting return trace/value](#getting-return-tracevalue)
  - [Include timestamps of function call](#include-timestamps-of-function-call)
  - [Tracing more specific function call](#tracing-more-specific-function-call)
  - [Writing match spec](#writing-match-spec)

_All of the stuff written here are referenced from the following StackOverflow
questions:_

- [Elixir - Trace function call][0]
- [Using trace and dbg in Erlang][3]

## Introduction

### Starting `:dbg`

Before we start tracing, we need to start the `dbg` and `tracer` process with the following
code:

```elixir
:dbg.start
:dbg.tracer
```

It won't do anything until you state what you would like to trace explicitly.

### Specifying what to trace

Let's say we want to trace the `Enum.map/2` function that was called in the
system. We can specify it by running:

```elixir
:dbg.tp(Enum, :map, 2, [])
:dbg.p(:all, :c)
```

### Tracing in action

When some part of your code call `Enum.map([1,2,3], & &1 + 1)`,
depending on where you are running the above `:dbg` code, you'll get
different output in your shell.

- on a local shell _(that is running your application code)_
- on a remote shell _(where the shell process is attach to the process that is running your application)_

**In Local Shell**

If you are on the shell that are running the system,
 whenever the function you traced is called, you will see something as follow:

```
(<0.106.0>) call 'Elixir.Enum':map([1,2,3],#Fun<erl_eval.44.97283095>)
```

**In Remote Shell**

You'll not see any output as the tracer is logging the output in the live
process instead of your remote shell. In order to see the trace, you'll need to
go through your logs file _(E.g. `erlang.log.1`)_.

If you want it to output in your remote shell, you'll need to start your
`tracer` process differently:

```elixir
:dbg.tracer(:process, {fn msg, n -> IO.inspect(msg); n+1 end, 0})
```

`:dbg.tracer` accept a second argument where you can customize how you want to
handle each of the traced events. Here, we are telling the tracer to
log output to our local shell instead.

### Stopping the tracing

To stop the tracing, it is as simple as:

```elixir
:dbg.stop_clear
```

It is very important to stop your tracing after you get the information you
need. This is because:

- Tracing is an additional overhead to the system.
- It write to your IO/logs. So, it would take up disk space.

And this become significant _especially when you are tracing a high frequency
functions or a high volume system_. Hence, it is actually better to do
use the following  when starting your tracer process in a live production
system:

```elixir
:dbg.tracer(:process, {fn _, 5 -> :dbg.stop_clear()
                        msg, n -> IO.inspect(msg); n+1 end, 0})
```

The first function clause tell the tracer to stop after 5 events. The
second one tell the tracer how it should handle the receive event. In this
case, we are just printing it and increment the counter.

### All together

Here is the code you can copy all together and past it in your `iex` to see
tracing in action:

```elixir
:dbg.start
:dbg.tracer(:process, {fn _, 5 -> :dbg.stop_clear()
                        msg, n -> IO.inspect(msg); n+1 end, 0})
:dbg.tpl(Enum, :map, [])
:dbg.p(:all, :c)

# With trace
Enum.map([1,2,3,4], & &1 + 1)
Enum.map([1,2,3,4], & &1 + 1)
Enum.map([1,2,3,4], & &1 + 1)
Enum.map([1,2,3,4], & &1 + 1)
Enum.map([1,2,3,4], & &1 + 1)

# No more trace
Enum.map([1,2,3,4], & &1 + 1)
```

## Customization

Sometimes you would want to know more than the arguments being passed
to the function, you might want to know the return result, or
the timestamps when the function run.

You can achieve this by providing more arguments to some of the function we
used above.

### Getting return trace/value

To get the return trace, we can specify more options in `:dbg.tpl` as follow:

```elixir
:dbg.tpl(Enum, :map, 2, [{:_, [], [{:return_trace}]}])
```

The additional options we provide is called the [`MatchSpec`][4], which we will
cover further later.

**Example:**

```elixir
:dbg.start
:dbg.tracer

:dbg.tpl(Enum, :map, 2, [{:_, [], [{:return_trace}]}])

:dbg.p(:all, :c)

Enum.map([1,2,3], & &1 + 1)
# (<0.106.0>) call 'Elixir.Enum':map([1,2,3],#Fun<erl_eval.44.97283095>)
# (<0.106.0>) returned from 'Elixir.Enum':map/2 -> [2,3,4]
# [2,3,4]

:dbg.stop
```

### Include timestamps of function call

To include the timestamps of the function call, we can include `:timestamp` when
calling `:dbg.p`:

```elixir
:dbg.p(:all, [:c, :timestamp])
```

**Example:**

```elixir
:dbg.start
:dbg.tracer
:dbg.tpl(Enum, :map, 2, [{:_, [], [{:return_trace}]}])

:dbg.p(:all, [:c, :timestamp])

Enum.map([1,2,3,4], & &1 + 1)
# [2, 3, 4, 5]
# (<0.105.0>) call 'Elixir.Enum':map([1,2,3,4],#Fun<erl_eval.44.40011524>) (Timestamp: {1624, 687361, 187278})
# (<0.105.0>) returned from 'Elixir.Enum':map/2 -> [2,3,4,5] (Timestamp: {1624, 687361, 187303})
# ^ The timestmap is in Erlang Timestamp tuple format.

:dbg.stop
```

### Tracing more specific function call

You might also want to only trace function called with specific
arguments, for example a user id, or specific category. You could do this by
modifying the match spec for `:dbg.tpl`:

```elixir
:dbg.tpl(Enum, :map, 2, [{[[1, 2, 3], :_], [], [{:return_trace}]}])
```

The first argument in the first tuple of the match spec, is the
function parameter that we want to match. Here, we want to match
`Enum.map/2` with:

- first parameter matching `[1,2,3]`
- second parameter matching `:_` which is anything.

Do note the enclosing `{}` for `:return_trace`. It is crucial to have it for
the tracer to trace your return value as well _(which is missing from the
previous version of this post)_.

**Example:**
```elixir
:dbg.start
:dbg.tracer

:dbg.tpl(Enum, :map, 2, [{[[1, 2, 3], :_], [], [{:return_trace}]}])

:dbg.p(:all, :c)

Enum.map([1,2,3], & &1 + 1)
# (<0.106.0>) call 'Elixir.Enum':map([1,2,3],#Fun<erl_eval.44.97283095>)
# (<0.106.0>) returned from 'Elixir.Enum':map/2 -> [2,3,4]
# [2, 3, 4]

Enum.map([1,2], & &1 + 1)
# Nothing is logged
# [2, 3]
```

_"How do I write those complicated match spec?"_, you might be wondering. Rest
assure, that's what we cover next.

### Writing match spec

It can be hard to write match spec for complicated scenario.
Luckily, `:dbg.fun2ms` can be used to help you transform your function to a
match spec:

```elixir
:dbg.fun2ms(fn [[1,2,3], _] -> :return_trace end)
# [{[1, 2, 3], [], [:return_trace]}]
```

Notice that the function parameter is expecting a list of parameter `[]`
instead of multiple parameter values. If you attempt to do multiple parameters
like this, you'll get an error:

```elixir
:dbg.fun2ms(fn [1,2,3], _ -> :return_trace end)
# Error: dbg:fun2ms requires fun with single variable or list parameter
# {:error, :transform_error}
```

However, the match spec is not entirely correct. To have your return trace
working correctly, it need to be wrapped in `{}`. So this won't work:

```elixir
:dbg.start
:dbg.tracer

match_spec = :dbg.fun2ms(fn [[1,2,3], _] -> :return_trace end)
:dbg.tpl(Enum, :map, match_spec)
:dbg.p(:all, :c)

# With trace of function call but no return value
Enum.map([1,2,3], & &1 + 1)
# (<0.105.0>) call 'Elixir.Enum':map([1,2,3],#Fun<erl_eval.44.40011524>)
# [2, 3, 4]

:dbg.stop
```

Hence, you'll have to transform the match spec abit. Here's how we can do it:

```elixir
match_spec = :dbg.fun2ms(fn [[1,2,3], _] -> :return_trace end)
match_spec = Enum.map(match_spec, fn {args, guards, [:return_trace]} ->
  {args, guards, [{:return_trace}]}
end)
```

So, the full working example looks like this:
```elixir
:dbg.start
:dbg.tracer

match_spec = :dbg.fun2ms(fn [[1,2,3], _] -> :return_trace end)
match_spec = Enum.map(match_spec, fn {args, guards, [:return_trace]} ->
  {args, guards, [{:return_trace}]}
end)

:dbg.tpl(Enum, :map, match_spec)
:dbg.p(:all, :c)

# With trace of function call and return value.
Enum.map([1,2,3], & &1 + 1)
# (<0.105.0>) call 'Elixir.Enum':map([1,2,3],#Fun<erl_eval.44.40011524>)
# (<0.105.0>) returned from 'Elixir.Enum':map/2 -> [2,3,4]
# [2, 3, 4]
```

## Wrap Up

That's all I'm _re_ sharing today. `:dbg` can be a bit low level. If you prefer
a simpler interface, consider using [`recon_trace`][6] from [`recon`][7].

One of the benefits of `:dbg` over `recon_trace` is, it's build in.
There is no need to add any additional dependencies to your codebase.
However, if you find yourself doing this a lot, especially in
a live production system, I highly recommend adding
`recon` as your dependencies and use `recon_trace` instead.

`recon` bring in a lot more tooling than just tracing. It also allows you to
diagnose your system safely. If you are interested into topic like this, might
also consider get yourself a free copy of [`Erlang in Anger`][5] where the
author of `recon` wrote about diagnosing BEAM application with `recon` and many
more.

_If you would like to learn more about using tracing with recon, you can read
[here]({{< ref "debugging-with-tracing-in-elixir-with-recon-trace" >}}) as well._

---

_Updated (26th June 2021):_
  - Add Table of Content for better navigation.
  - Organize code example so that it can be copy and paste to run locally
    easily.
  - Fix missing `{}` for `:return_trace` in `Tracing more specific function call` section.
  - Fix misguided `Writing a match spec` session as using `:dbg.fun2ms` will
    not work out of the box and need some modification to get the return value
    of the trace correctly.

[0]: https://stackoverflow.com/questions/50364530/elixir-trace-function-call
[1]: https://www.youtube.com/watch?v=OR2Gc6_Le2U
[2]: https://www.youtube.com/watch?v=sR9h3DZAA74
[3]: https://stackoverflow.com/questions/1954894/using-trace-and-dbg-in-erlang/1954980#1954980
[4]: http://erlang.org/doc/apps/erts/match_spec.html
[5]: https://www.erlang-in-anger.com/
[6]: http://ferd.github.io/recon/recon_trace.html
[7]: https://hex.pm/packages/recon
