---
title: "Support tests rerun in ExUnit.run/1 in Elixir"
date: 2022-05-04T19:37:19+08:00
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

That's how I begin my journey to implement `ExUnit.~~re~~run/1` to support reruning
test modules.

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
