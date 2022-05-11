---
title: "Support tests rerun in ExUnit.run/1 in Elixir"
date: 2022-05-04T19:37:19+08:00
tags: ["elixir"]
draft: true
---

One of the challenges I faced when I'm writing the Livebook for my
[Writing a simple Redis Protocol parser in Elixir]({{< ref
"writing-a-simple-redis-protocol-parser-in-elixir.md" >}}) post is
to rerun test that has been written.

Once a test is run in Livebook, executing `ExUnit.run` again doesn't rerun the
test, unless you redefine the module. To reduce the duplicated test code in Livebook
to rerun tests, we can use some hack.

The hack I'm using currently in the Livebook is `Module.create/3`:

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

That's how I begin my journey to implement `ExUnit.rerun/1` to support reruning
test modules.

**TLDR;**

Read the [PR](https://github.com/elixir-lang/elixir/pull/11788)

## Navigating the `ExUnit` code

Since I know nothing much about `ExUnit` implementation detail, the very first
thing I do is to scan through the implementation. I start with reading the
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
would probably the core implmentation of how our tests would be run, let's head
over there and read the code as well.

### `ExUnit.Runner`

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

To sum up a bit, basically `run` called `run_with_trap`, which then called
`async_loop`. So `async_loop` is the real deal here. So let's take a look at
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

It's fairly straightforward to understand the code. It is roughly equivalent
to:

- First, we try to check if there's anything is available, if not we wait for one.
- If there is, we try to take a couple of async modules, and spawn the modules
to run the test.
- Once we finish running async test modules, we get all of our sync test
modules, and run each of the sync test modules.

Here we came across `ExUnit.Server` again, most notably the `take_sync_modules`
and `take_async_modules` function. We can know quite a bit from the function
name itself. This is how the `ExUnit.run` get the test modules to be run.

Upon knowing how `ExUnit.Runner.run` run our tests, and knowing that it's
basically taking the test modules from `ExUnit.Server`, the next thing we want
to figure out is how are those test modules are added in the first place.
Since, `ExUnit.rerun/1` is about adding those test modules aagin so that it
would be rerun.

So, let's take a look at the `ExUnit.Server` module next.

### `ExUnit.Server`

Upon looking at the code, we see what we wanted:

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

  # ...
end
```

That's how we add the module into `ExUnit.Server`. Since it's a `GenServer`, it
means that it's also the process that is holding the states of the modules
available to be run by `ExUnit.Runner`.

Let's look at the `add/2` function:

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

Pretty standard, the code update the `async_modules` and `sync_modules`
values in the `state`.

Do we have have enough information to work on our `ExUnit.rerun/1` at this
point? Mostly likely yes!

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

For assertion, we basically assert the return map about the stats of the test
run and also assert that we are writing to the `IO` by capturing the `IO` with
`capture_io` and regex match that include the output we expected.

{{% callout title="Print debugger beware of `capture_io`" %}}
When I first wrote the test and trying to use `IO.inspect` or any sort of print
debugging to figure out how things work, I was so confused by why nothing is
printed out.

I ended up putting it off this work for a couple of days. When I came back
working on it again, I managed to find out it's because of we are capturing IO
in our test, hence all the `IO.inspect` output is captured and not printed out.
{{% /callout %}}

## Improvements

You might be wondering:

> Hey, this isn't totally correct, our async modules is added as sync module...

That's correct. Hence, it's our minimal working implementation. Next, we are
going to conditionally call the `add_async_module` and `add_sync_module`.

So, how do we know if a test module is marked as async? The quickest way to
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

_To be continue..._

## Closing

_DRAFT:_

When I first saw the reply from `@livebookdev`, I thought this would be a
simple change! Indeed it is.

Elixir codebase is really easy to navigate and José Valim has been really responsive
in providing feedbacks and guidance.

The whole process for implementing this take roughly a week for me. It would be
shorter if I'm less blur. Once I'm in a better condition, the actual work took
around 2 days to implement and the PR got merged in a day once the PR is up.

Hopefully this post shed some light for you and encourage you to contribute to the
Elixir ecosystem as well!
