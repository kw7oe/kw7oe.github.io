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
for debugging live production system.

Generally, in the BEAM ecosystem there are a couple of ways for tracing. For
example, you can use:

- `:dbg`
- `:sys`
- `recon_trace`

However, for today, I am going to cover `:dbg`, where I came across recently
while trying to debug my code.

# Introduction

**Starting `:dbg`**

Before we start tracing, we would need to start the process with the following
code:

```elixir
:dbg.start
:dbg.tracer
```

This would start the `dbg` and `tracer` process. However, it won't do anything
until you state what you would like to trace.

**Specifying what to trace**

Let's say we want to trace the `Enum.map/2` function that's happening in the
system. We can specify it by running the following code:

```elixir
:dbg.tp(Enum, :map, 2, [])
:dbg.p(:all, :c)
```

**Tracing in action**

Let's assume some part of your code called `Enum.map([1,2,3], & &1 + 1)`,
you'll not see any output, since the tracer is actually logging in the live
node instead of your remote shell.

However, if you are running it on the same shell that are running the system,
you will see something as follow:

```
(<0.106.0>) call 'Elixir.Enum':map([1,2,3],#Fun<erl_eval.44.97283095>)
```

```elixir
:dbg.tp(Enum, :map, 2, [{:_, [], [{:return_trace}]}])
# (<0.106.0>) call 'Elixir.Enum':map([1,2,3],#Fun<erl_eval.44.97283095>)
# (<0.106.0>) returned from 'Elixir.Enum':map/2 -> [2,3,4]

# Stop tracing
:dbg.stop_clear

# Start tracer on remote node that
#  - print out to current shell
#  - automatically stop after tracing 5 calls
:dbg.tracer(:process, {fn _, 5 -> :dbg.stop_clear()
                        msg, n -> :io.format("~p~n", [msg]); n+1 end, 0})
```

```
$ iex
:Erlang/OTP 23 [erts-11.1.1] [source] [64-bit] [smp:4:4] [ds:4:4:10] [async-threads:1] [hipe]

Interactive Elixir (1.11.0) - press Ctrl+C to exit (type h() ENTER for help)
iex(1)> :dbg.start
{:ok, #PID<0.108.0>}
iex(2)> :dbg.tracer
{:ok, #PID<0.108.0>}
iex(3)> :dbg.tp(Enum, :map, 2, [])
{:ok, [{:matched, :nonode@nohost, 1}]}
iex(4)> :dbg.p(:all, :c)
{:ok, [{:matched, :nonode@nohost, 58}]}
iex(5)> Enum.map([1,2,3], & &1 + 1)
(<0.106.0>) call 'Elixir.Enum':map([1,2,3],#Fun<erl_eval.44.97283095>)
[2, 3, 4]
iex(6)>
```


**References:**

- [Trace function call StackOverflow question][0]

[0]: https://stackoverflow.com/questions/50364530/elixir-trace-function-call
[1]: https://www.youtube.com/watch?v=OR2Gc6_Le2U
