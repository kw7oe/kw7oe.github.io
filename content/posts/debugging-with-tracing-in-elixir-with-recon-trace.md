---
title: "Debugging with tracing in Elixir with recon_trace"
date: 2021-06-27T16:42:02+08:00
draft: true
---

In my previous blog post, [Debugging with Tracing in Elixir]({{< ref "debugging-with-tracing-in-elixir" >}}),
I mentioned about using `recon_trace` from `recon` to trace your function
calls in your live system.

After using `recon_trace` a few times and always needing to going back to
the documentation to figure out how to use it correctly, I decided to write
this post to document the common usage I came across.

This is what you can expect from this posts, hopefully it helps!

- [Installing `recon`](#installing-recon)
- [Basic Usage](#basic-usage)
  - [Tracing function with return
    trace/value](#tracing-function-with-return-tracevalue)
  - [Tracing more specific function calls](#tracing-more-specific-function-calls)
  - [Writing match spec](#writing-match-spec)

If you want to get hands on, I have setup a [Livebook][0] notebook with all the
code examples below. So, spin up your Livebook and import the notebook
from this [link] to get started!

# Installing `recon`

First of all, let's add `:recon` as part of our system dependencies into
`mix.exs`:

```elixir
defp deps do
[
  # ... other depedencies,
  {:recon, "~> 2.5"}
]
end
```

Don't forget to run `mix deps.get` after adding it.

# Basic Usage

## Tracing function with return trace/value

To trace a function with `recon`, it is as simple as
calling `:recon_trace.calls({module, function, match_spec}, max_trace, opts \\ [])`:

```elixir
:recon_trace.calls({Enum, :map, :return_trace}, 4)

list1 = [1, 2, 3, 4]
Enum.map(list1, fn x -> x + 2 end)
Enum.map(list1, fn x -> x - 2 end)
Enum.map(list1, fn x -> x * 2 end)
Enum.map(list1, fn x -> x / 2 end)
```

The example above are tracing `Enum.map` function and telling `recon_trace` to receive
traces of at most 4. If you run the code above, you'll see the traces of the first 2 function calls.

```elixir
# 17:21:22.176464 <0.120.0> 'Elixir.Enum':map([1,2,3,4], #Fun<erl_eval.44.40011524>)
# 17:21:22.218911 <0.120.0> 'Elixir.Enum':map/2 --> [3,4,5,6]
# 17:21:22.218958 <0.120.0> 'Elixir.Enum':map([1,2,3,4], #Fun<erl_eval.44.40011524>)
# 17:21:22.218997 <0.120.0> 'Elixir.Enum':map/2 --> [-1,0,1,2]
# Recon tracer rate limit tripped.
```

Why not 4 function calls? Since our max trace is 4.

This is because, when we are using `:return_trace`, each function call will have 2 traces:

- one for the function call
- one for the result trace

You'll also see `Recon tracer rate limit tripped.`, which is `recon_trace` telling you
that it is rate limited, and you'll not receive any new traces regarding the
function call.

Simple right? No more:


```elixir
:dbg.start
:dbg.tracer
# ...
:dbg.stop
```

## Tracing more specific function calls

Same with using `dbg`, you can also use `recon_trace` to trace more specific
function call by altering your match spec for `:recon_trace.calls`.

Let's say we want to trace function call of `Enum.map` with matching the
arguments `[1,2,3]` specifically. We can achieve that by using this match spec:

```elixir
[
  {
    [[1, 2, 3], :_],
    [],
    [{:return_trace}]
  }
]
```

Looks complicated right? Don't worry, let me break it down for you.

A match spec is a list `[]` of 3 elements tuple `{_, _, _}`, with only one item
in the list `[{_, _, _}]`.

Here's what the 3 elements of the tuple refers to:
- **1st:** indicate the function arguments that we want to match.
Here, with `Enum.map/2`:
  - first parameter is the enumerable pass into `Enum.map`, which is
    `[1, 2, 3]`.
  - second parameter is the anonymous function we pass into `Enum.map`.
- **2nd:** indicate the guards of the function, which is not applicable here.
We will see it in action later below.
- **3rd:** indicate the actions of the match spec, which is the `return_trace` in our case.

Let's see this in action:

```elixir
match_spec = [
{
  [[1, 2, 3], :_],
  [],
  [{:return_trace}]
}
]

:recon_trace.calls({Enum, :map, match_spec}, 4)
Enum.map([1, 2, 3], fn x -> x + 2 end)
Enum.map([1, 2, 3, 4], fn x -> x + 2 end)
```

Here we are telling `recon_trace` to trace `Enum.map` function call where
the first argument is `[1, 2, 3]`. You'll notice that `recon_trace` only show
the traces for the first function call and not the second.

```elixir
# 17:25:19.818355 <0.120.0> 'Elixir.Enum':map([1,2,3], #Fun<erl_eval.44.40011524>)
# 17:25:19.818519 <0.120.0> 'Elixir.Enum':map/2 --> [3,4,5]
```

## Writing match spec

Writing the match spec seems complicated right? No worry,
we can utilize `:dbg.fun2ms` to help us out.

```elixir
match_spec = :dbg.fun2ms(fn [a, _] when length(a) > 4 -> :return_trace end)

match_spec =
Enum.map(match_spec, fn {args, guards, [:return_trace]} ->
  {args, guards, [{:return_trace}]}
end)
```

Here we are writing the match spec for tracing `Enum.map` where the
first arguments length is larger than 4.

Notice that we need to do some additional transformation because
as mentioned in my [previous post]({{< ref
"debugging-with-tracing-in-elixir.md#writing-match-spec" >}}),
the match spec returned by `dbg` is not entirely correct.
Hence, we have some additional transformation there.

Here's how the final match spec looks like:

```elixir
[{[:"$1", :_], [{:>, {:length, :"$1"}, 4}], [{:return_trace}]}]
```

Now, our second element is not an empty list anymore as shown in the previous
example. I'm not going into the details on how to read the generated match spec,
if you want to know more about it consider reading:

- [Learn you some Erlang: Bears, ETS, Beets](https://learnyousomeerlang.com/ets#you-have-been-selected)
- [Erlang Documentation: Match Specifications in Erlang](http://erlang.org/doc/apps/erts/match_spec.html)

Let's see that in action.

```elixir
match_spec = :dbg.fun2ms(fn [a, _] when length(a) > 4 -> :return_trace end)

match_spec =
Enum.map(match_spec, fn {args, guards, [:return_trace]} ->
  {args, guards, [{:return_trace}]}
end)

:recon_trace.calls({Enum, :map, match_spec}, 4)
Enum.map([1, 2, 3, 4], fn x -> x + 2 end)
Enum.map([1, 2, 3, 4, 5], fn x -> x + 2 end)
Enum.map([1, 2, 3, 4, 5, 6, 7, 8], fn x -> x + 2 end)
```

Once you run this, here's how the output looks like:

```elixir
# 17:47:36.300000 <0.120.0> 'Elixir.Enum':map([1,2,3,4,5], #Fun<erl_eval.44.40011524>)
# 17:47:36.300124 <0.120.0> 'Elixir.Enum':map/2 --> [3,4,5,6,7]
# 17:47:36.301169 <0.120.0> 'Elixir.Enum':map([1,2,3,4,5,6,7,8], #Fun<erl_eval.44.40011524>)
# 17:47:36.301316 <0.120.0> 'Elixir.Enum':map/2 --> [3,4,5,6,7,8,9,10]
# Recon tracer rate limit tripped.
```

You'll see that there is no tracing for first function call, as it only have 4 elements and
does not fulfil our match spec.

# Wrap Up

Tracing is an extremely useful debugging tool to add to your current
toolkit. This is especially true when you need to debug live production
system.

Personally, I have done that a few times in both of our staging and production
environment. I can say that the experience is pleasant _(once you figure out
match spec and use it correctly...)_.

Last but not least, I highly recommend these resources below
if you are interested into this topic particularly:

- ElixirConf 2020: [Debugging Live Systems on the BEAM talk][1] by Jeffery Utter
- Book: [Erlang in Anger][2]

[0]: https://github.com/elixir-nx/livebook
[1]: https://www.youtube.com/watch?v=sR9h3DZAA74
[2]: https://www.erlang-in-anger.com/
