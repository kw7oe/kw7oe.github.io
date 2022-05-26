---
title: "Implementing tests rerun in `ExUnit.run` in Elixir"
date: 2022-05-26T17:27:19+08:00
tags: ["elixir", "oss"]
---

**TLDR:**
Read the [diff of the PR](https://github.com/elixir-lang/elixir/pull/11788/files).
It's just 3 files changes, 65 lines of addition and 2 lines of deletion. Half
of the addition is probably test.

---

One of the challenges I faced when I'm writing the Livebook for my
[Writing a simple Redis Protocol parser in Elixir]({{< ref
"writing-a-simple-redis-protocol-parser-in-elixir.md" >}}) post is
to rerun test that has been written.

Once a test is run in Livebook, executing `ExUnit.run` again doesn't rerun the
test, unless you redefine the module. To reduce the duplicated test code in Livebook,
we can use the following `Module.create/3` hack:

```elixir
test_content =
  quote do
    use ExUnit.Case

    test "it pass" do
      assert MyMath.add(2, 2) == 4
    end

    test "it fails" do
      refute MyMath.add(2, 2) == 5
    end
  end

Module.create(SampleTest, test_content, Macro.Env.location(__ENV__))
ExUnit.run()

defmodule MyMath do
  def add(a, b) do
    # wrong impl
    a - b
  end
end

Module.create(SampleTest, test_content, Macro.Env.location(__ENV__))
ExUnit.run()
```

We call `Module.create` to redefine the `SampleTest` module
which then "refresh" the state of our `ExUnit` _(it's not exactly refresh, but
for now you can understand it that way)_.

I tweeted about it and got this reply:

<blockquote class="twitter-tweet" data-conversation="none" data-dnt="true" data-theme="light"><p lang="en" dir="ltr">There is currently no way to re-run tests for a given module. You should consider sending a pull request to <a href="https://twitter.com/elixirlang?ref_src=twsrc%5Etfw">@elixirlang</a> that adds ExUnit.rerun(list_of_modules)!</p>&mdash; Livebook (@livebookdev) <a href="https://twitter.com/livebookdev/status/1514310933673304065?ref_src=twsrc%5Etfw">April 13, 2022</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

Hence, I began my journey to implement `ExUnit.rerun/1` to support reruning test modules.
In this post, I'm going to share how I approach implementing this without
knowing much about the Elixir codebase. It can be breakdown in the following
sections:

- [Navigating the `ExUnit` code](#navigating-the-exunit-code)
- [Implementing `ExUnit.rerun/1`](#implementing-exunitrerun1)
- [Conditionally adding sync and async
module](#conditionally-adding-sync-and-async-module)
- [Asking question](#asking-question)
- [Closing](#closing)

## Navigating the `ExUnit` code

Since I know nothing much about `ExUnit`, the very first
thing I do is to read the code. I start with reading the
`ExUnit.run/0` implementation:

```elixir
defmodule ExUnit do
  # ...

  def run() do
    _ = ExUnit.Server.modules_loaded()
    options = persist_defaults(configuration())
    ExUnit.Runner.run(options, nil)
  end
end
```

The code is fairly straightforward. From here we know that, the code rely on
`ExUnit.Server` and `ExUnit.Runner` modules. Since the `ExUnit.Runner.run`
probably contains the core implementation of how tests get run, let's head
over there and read the code as well.

### `ExUnit.Runner.run/2`

The implementation is a bit lengthy due to the need of handling various stuff,
so we will skip to the important parts. Essentially, `ExUnit.Runner.run` looks
roughly like this:

```elixir
def run(opts, load_us) do
  # .... trapping signal
  run_with_trap(opts, load_us)
end

def run_with_trap(opts, load_us) do
  # .... some setup code

  start_time = System.monotonic_time()
  EM.suite_started(config.manager, opts)
  async_stop_time = async_loop(config, %{}, false)
  stop_time = System.monotonic_time()

  # .... some other code to compute stats
end
```

Basically, `run` called `run_with_trap`, which then called
`async_loop`. So `async_loop` is the real deal here. Let's take a look at
it's implementation:

```elixir
defp async_loop(config, running, async_once?) do
  available = config.max_cases - map_size(running)

  cond do
    # No modules available, wait for one
    available <= 0 ->
      running = wait_until_available(config, running)
      async_loop(config, running, async_once?)

    # Slots are available, start with async modules
    modules = ExUnit.Server.take_async_modules(available) ->
      running = spawn_modules(config, modules, running)
      async_loop(config, running, true)

    true ->
      sync_modules = ExUnit.Server.take_sync_modules()

      # Wait for all async modules
      0 =
        running
        |> Enum.reduce(running, fn _, acc -> wait_until_available(config, acc) end)
        |> map_size()

      async_stop_time = if async_once?, do: System.monotonic_time(), else: nil

      # Run all sync modules directly
      for module <- sync_modules do
        running = spawn_modules(config, [module], %{})
        running != %{} and wait_until_available(config, running)
      end

      async_stop_time
  end
end
```

It's straightforward to understand the code. It is roughly equivalent
to:

- First, we try to check if there's anything is available, if not we wait for one.
- If there is, we try to take a couple of async modules, and spawn the modules
to run the test.
- Once we finish running async test modules, we get all of our sync test
modules, and run each of the sync test module.

Here we came across `ExUnit.Server` again, most notably the `take_sync_modules`
and `take_async_modules` functions. We can know quite a bit from the
names. It is how the `ExUnit.run` get the test modules to be run.

Upon knowing how `ExUnit.Runner.run` run our tests, and knowing that it's
basically taking the test modules from `ExUnit.Server`, the next thing we want
to figure out is how are those test modules are added in the first place.
Since, `ExUnit.rerun/1` is about adding those test modules again so that it
would be rerun, we will need to know how to add test modules as well.
Let's take a look at the `ExUnit.Server` module next.

### `ExUnit.Server`

Upon looking at the module, we see what we wanted:

```elixir
defmodule ExUnit.Server do
  @moduledoc false
  @name __MODULE__
  @timeout :infinity

  use GenServer

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, :ok, name: @name)
  end

  def add_async_module(name), do: add(name, :async)
  def add_sync_module(name), do: add(name, :sync)

  defp add(name, type) do
    case GenServer.call(@name, {:add, name, type}, @timeout) do
      :ok ->
        :ok

      :already_running ->
        raise "cannot add #{type} case named #{inspect(name)} to test suite after the suite starts running"
    end
  end

  # ...
end
```

That's how we add the module into `ExUnit.Server`. Since it's a `GenServer`, it
means that it's also the process that is holding the states of the modules
available to be run by `ExUnit.Runner`.

Let's look at the `handle_call/3` function that handle `{:add, name, type}`:

```elixir
def handle_call({:add, name, :async}, _from, %{loaded: loaded} = state)
    when is_integer(loaded) do
  state = update_in(state.async_modules, &[name | &1])
  {:reply, :ok, take_modules(state)}
end

def handle_call({:add, name, :sync}, _from, %{loaded: loaded} = state)
    when is_integer(loaded) do
  state = update_in(state.sync_modules, &[name | &1])
  {:reply, :ok, state}
end

def handle_call({:add, _name, _type}, _from, state),
  do: {:reply, :already_running, state}
```

The code update the `async_modules` and `sync_modules`
values in the `state`. Do we have now have enough information to
work on our `ExUnit.rerun/1`?  Mostly likely yes!

## Implementing `ExUnit.rerun/1`

After having all these information and knowledge, implementing the minimal
working version of `ExUnit.rerun/1` is straightforward.

Copy the code from `ExUnit.run/1`, accept a list of modules as argument,
loop through it and called `add_sync_module`:

```elixir
def rerun(modules) do
  for module <- modules do
    ExUnit.Server.add_sync_module(module)
  end

  _ = ExUnit.Server.modules_loaded()
  options = persist_defaults(configuration())
  ExUnit.Runner.run(options, nil)
end
```

It's not working unless we prove otherwise, so let's write a test case as well.
In `lib/ex_unit/test/ex_unit_test.exs`, add :

```elixir
Code.require_file("test_helper.exs", __DIR__)

defmodule ExUnitTest do
  use ExUnit.Case

  # other tests case ...

  test "supports rerunning given modules" do
    defmodule SampleAsyncTest do
      use ExUnit.Case, async: true

      test "true" do
        assert false
      end
    end

    defmodule SampleSyncTest do
      use ExUnit.Case

      test "true" do
        assert false
      end
    end

    defmodule IgnoreTest do
      use ExUnit.Case

      test "true" do
        assert false
      end
    end

    configure_and_reload_on_exit([])

    assert capture_io(fn ->
             assert ExUnit.run() == %{
                      failures: 3,
                      skipped: 0,
                      total: 3,
                      excluded: 0
                    }
           end) =~ "\n3 tests, 3 failures\n"

    assert capture_io(fn ->
             assert ExUnit.rerun([SampleSyncTest, SampleAsyncTest]) == %{
                      failures: 2,
                      skipped: 0,
                      total: 2,
                      excluded: 0
                    }
           end) =~ "\n2 tests, 2 failures\n"
   end
end
```

We are just copying the test case of `supports many runs and
loads` and make some modification to suit our need.

We define 3 different test modules, one for sync, one for async and one that
will no be rerun. We first trigger `ExUnit.run/0` to simulate the test running
through once and trigger `ExUnit.rerun/1` with the test modules we wanted to
rerun.

For assertion, we basically assert:

- the return map about the stats of the test
- we are writing to the `IO` by capturing the `IO` with
`capture_io` and regex match that include the output we expected.

{{% callout title="Print debugger beware of `capture_io`" %}}
When I first wrote the test and trying to use `IO.inspect` or any sort of print
debugging to figure out how things work, I was so confused by why nothing is
printed out.

I ended up putting it off this work for a couple of days. When I came back
working on it again, I managed to find out it's because of we are capturing IO
in our test, hence all the `IO.inspect` output is captured and not printed out.
{{% /callout %}}

You might be wondering:

> Hey, this isn't totally correct, our async modules is added as sync module...

That's correct. Hence, it's our minimal working implementation. Next, we are
going to conditionally call the `add_async_module` and `add_sync_module`.

## Conditionally adding sync and async module

How do we know if a test module is marked as async? The quickest way to
find out is to see how the existing code work! Let's do a quick search on the
Elixir codebase on those function. With that, I found out that `ExUnit.Case` is
one of the caller of the function:

```elixir
@doc false
def __after_compile__(%{module: module}, _) do
  if Module.get_attribute(module, :ex_unit_async) do
    ExUnit.Server.add_async_module(module)
  else
    ExUnit.Server.add_sync_module(module)
  end
end
```

After compiling a test module, the add module function is called.
That explained why in the beginning our tests can be rerun once we
redefine/recreate our test modules.

And the `Module.get_attribute/2` function is used to find out if a test module is async.
Let's use this information we just gained to implement what we want then:

```elixir
def rerun(modules) do
  for module <- modules do
    if Module.get_attribute(module, :ex_unit_async) do
      ExUnit.Server.add_async_module(module)
    else
      ExUnit.Server.add_sync_module(module)
    end
  end

  _ = ExUnit.Server.modules_loaded()
  options = persist_defaults(configuration())
  ExUnit.Runner.run(options, nil)
end
```

Upon running the test, we got an error:

```
** (ArgumentError) could not call Module.get_attribute/2 because the module ExUnitTest.SampleSyncTest is already compiled.
Use the Module.__info__/1 callback or Code.fetch_docs/1 instead
```

It seems like we can't use `Module.get_attribute/2` after a module is compiled.
Thanks to the helpful error message, we know how to overcome it. Let's use
the `Module.__info__/1` callback instead:

```elixir
for module <- additional_modules do
  module_attributes = module.__info__(:attributes)

  if Keyword.fetch!(module_attributes, :ex_unit_async) do
    ExUnit.Server.add_async_module(module)
  else
    ExUnit.Server.add_sync_module(module)
  end
end
```

As mentioned in the [`Module.__info__/1`
callback](https://hexdocs.pm/elixir/1.13/Module.html#c:__info__/1)
doc, we could get the attributes of a module by passing in `:attributes` atom,
which return us a keyword list.

We then use `Keyword.fetch!/2` to fetch the attribute we wanted. Using `fetch!` will
catch the scenario where `:ex_unit_async` attribute is not available in our list and
our code end up calling `add_sync_module` for async modules again.

{{% callout %}}

In my PR, I'm using `Keyword.get/2` instead. It's only when I write this post,
I realize that while our test pass, it's not behaving correctly as well.

To demonstrate it, `Keyword.fetch!/2` is used instead.

{{% /callout %}}


Running our test again, we got another error instead:

```
** (KeyError) key :ex_unit_async not found in: [vsn: [92364997537872194208385758077352902316]]
```

Why does it works on `Modules.get_attribute/2` and not with
`Module.__info__/1`? Let's read the documentation again to see if we miss out
anything. Here's what the docs said about `Module.__info__(:attributes)`:

> :attributes - a keyword list with all persisted attributes

Hmm, it mentioned list of all _persisted_ attributes. Does that mean the
`ex_unit_async` is not persisted?

### Persisting the `ex_unit_async` attribute

By searching `persisted` in the documentation, we can see a few places
mentioned it, and most importantly, the `Module.register_attribute/3` function:

> When registering an attribute, two options can be given:

>   :accumulate - several calls to the same attribute will accumulate instead of overriding the previous one. New attributes are always added to the top of the accumulated list.

>   :persist - the attribute will be persisted in the Erlang Abstract Format. Useful when interfacing with Erlang libraries.

Seems like all we need to do is calling `Module.register_attribute/3` to
persist the `ex_unit_async` module attribute. But where?

Once again, searching for the `ex_unit_async` in the codebase lead us
to `ExUnit.Case`:

```elixir
def __register__(module, opts) do

  # ...

  attributes = [
    before_compile: ExUnit.Case,
    after_compile: ExUnit.Case,
    ex_unit_async: false
  ]

  Enum.each(attributes, fn {k, v} -> Module.put_attribute(module, k, v) end)

  # ...
end
```

By default, `ExUnit.Case` does not persist the attribute. To fix this is rather
straightforward:

```elixir
def __register__(module, opts) do
  # ...

  persisted_attributes = [:ex_unit_async]
  Enum.each(persisted_attributes, &Module.register_attribute(module, &1, persist: true))

  attributes = [
    before_compile: ExUnit.Case,
    after_compile: ExUnit.Case,
    ex_unit_async: false
  ]

  Enum.each(attributes, fn {k, v} -> Module.put_attribute(module, k, v) end)

  # ...
end
```

With this changes, now our test run successfully!

## Asking question

In actual, I did not figure out the `register_attribute` part myself. Instead,
I ask about it in my PR:

> However, didn't have any luck with it as `Modules.get_attribute/3` won't work as the test module have been compiled.
Tried using `module.__info__(:attributes)` as well, but upon inspecting I only have the vsn key ...
Probably need some pointers here

And in a couple of hours, José Valim reply it:

> You will need to say that :ex_unit_async is a persisted attribute via `Module.register_attribute` :)

If you're stuck on anything after trying a couple times, there's no harm asking question about it!

The reason I didn't include it above is to demonstrate how I
could have figured out if I spend a bit more time on it.

## Closing

In the PR, the `rerun/1` implementation was move to `run/1` instead.
So in the latest branch, `ExUnit.run` now takes an optional list of modules to
be run.

When I first saw the reply from @livebookdev, I thought it is a simple change!
In reality, the process of implementing it is not quite easy, but still manageable.

The whole process for implementing this take roughly a week for me. It would be
shorter if I'm less blur. Once I'm in a better condition, the actual work took
around 2 days to implement and the PR got merged in a day once the PR is up.

In retrospect, the changes do looks simple.

The Elixir codebase is easy to navigate and José Valim has been really responsive
in providing feedbacks and guidance. Hopefully this post shed some light for you
and encourage you to contribute to the Elixir ecosystem as well!
