---
title: "Debugging With Tracing in Elixir"
date: 2020-10-18T20:02:48+08:00
draft: true
---

I use `IO.inspect` for debugging in Elixir a lot. But there are times when you
can't just `IO.inspect` to debug stuff, especially in a running production
system _(without redeploying your code, i guess)_.

Sometime ago, I came across the power of tracing to debug an application from
Fred Herbert ["Operable Erlang Elixir"][1] talk. This is especially powerful
for debugging live production system _(however, it is not really recommended to
use the options I share below)_..

Generally, in the BEAM ecosystem there are a couple of ways for tracing. For
example, you can use:

- `:dbg`
- `:sys`
- `recon_trace`

However, for today, I am going to cover `:dbg`, where I came across recently
while trying to debug my code.

# Introduction

## Starting `:dbg`

Before we start tracing, we would need to start the process with the following
code:

```elixir
:dbg.start
:dbg.tracer
```

This would start the `dbg` and `tracer` process. However, it won't do anything
until you state what you would like to trace.

## Specifying what to trace

Let's say we want to trace the `Enum.map/2` function that's happening in the
system. We can specify it by running the following code:

```elixir
:dbg.tp(Enum, :map, 2, [])
:dbg.p(:all, :c)
```

## Tracing in action

Let's assume some part of your code called `Enum.map([1,2,3], & &1 + 1)`.
Depending on whether you are running the above `:dbg` code, you'll get
different output in your shell.

- on a local shell _(that is running your application code)_
- on a remote shell _(where the shell process is attach to the process that is running your application)_

**In Local Shell**

If you are running it on the same shell that are running the system,
you will see something as follow, whenever the function you traced is run:

```
(<0.106.0>) call 'Elixir.Enum':map([1,2,3],#Fun<erl_eval.44.97283095>)
```

**In Remote Shell**

You'll not see any output, since the tracer is actually logging in the live
process instead of your remote shell. In order to see the trace, you'll need to
go through your logs file _(E.g. `erlang.log.1`)_.

If you want it to output in your remote shell, you'll need to start your
`tracer` process differently:

```elixir
:dbg.tracer(:process, {fn msg, n -> IO.inspect(msg); n+1 end, 0})
```

`:dbg.tracer` accept a second argument where you can customize how you want to
handle each of the traced events. In this code, we are telling the tracer to
just output to our local shell instead.

## Stopping the tracing

To stop the tracing, it is as simple as calling:

```elixir
:dbg.stop_clear
```

It is very important to stop your tracing after you get the information you
need. This is because:

- Tracing is an additional overhead to the system.
- It write to your IO/logs. So, it would take up disk space.

And this become critical _especially when you are tracing a high frequency
functions or a high volume system_. Hence, it is actually better to do
something as follow when starting your tracer process:

```elixir
:dbg.tracer(:process, {fn _, 5 -> :dbg.stop_clear()
                        msg, n -> IO.inspect(msg); n+1 end, 0})
```

The first function clause basically tell the tracer to stop after 5 events. The
second one is telling how the tracer should handle the receive event, in this
case, we are just printing it and increment the counter.

## All together

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

# Customization

```elixir
:dbg.tp(Enum, :map, 2, [{:_, [], [{:return_trace}]}])
# (<0.106.0>) call 'Elixir.Enum':map([1,2,3],#Fun<erl_eval.44.97283095>)
# (<0.106.0>) returned from 'Elixir.Enum':map/2 -> [2,3,4]
```


**References:**

- [Trace function call StackOverflow question][0]

[0]: https://stackoverflow.com/questions/50364530/elixir-trace-function-call
[1]: https://www.youtube.com/watch?v=OR2Gc6_Le2U
