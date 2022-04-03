---
title: "Writing a simple Redis server in Elixir"
date: 2022-03-29T15:42:56+08:00
draft: true
tags: ['elixir', 'database', 'tutorial']
---

In the [previous post][0], we wrote a simple [Redis Protocol specification][1] (RESP) parser. But that's just a
small part towards building a Redis server.

In this post, we continue to write the other parts needed for
our simple Redis server. Here's an overall architecture looks like:

```
Redis CLI <-> Redis Server (TCP) <-> RESP Parser
                     ↓
              Key Value Store
```

So far we already have the RESP Parser, so in this post we are going to write the following:

* Redis Server (TCP)
* Key Value (KV) Store

For our Redis CLI, we'll be either using `redis-cli` instead.
This post will be breakdown into the following sections:

* [Writing a KV Store with `GenServer` and `ETS`](#writing-a-key-value-store-with-genserver-and-ets)
* [Writing a Redis Server with `gen_tcp`](#writing-the-redis-server-with-gen_tcp)
* [Integrating our Redis Server with our RESP parser](#integrating-our-parser-into-the-tcp-server)
* [Integrating our Redis Server with KV store](#integrating-our-redis-server-with-kv-store)
* [Benchmarking with `redis-benchmark`](#benchmarking-with-redis-benchmark)
* [Handling concurrent requests in our Redis server](#handling-concurrent-requests-in-our-redis-server)
* [Tuning on `gen_tcp` configuration to improve performance](#tuning-on-gen_tcp-configuration-to-improve-performance)

## Prerequisite

Before we get started, if you're unfamiliar with the following: `GenServer`, `ETS` and `gen_tcp`,
I'll recommend you to work through the
[the official Elixir Guide: Mix and OTP section][3].
Specifically on the following topics:

* [ETS][4]
* [Task and `gen_tcp`][5]

We'll work on top of the code implementation of the TCP server from the guide. We will convert it from an echo TCP
server to a Redis TCP server and write a KV store with `GenServer` and `ETS`.

We will be using `redis-cli` as our Redis client. So, make sure you have `redis` installed as well. In MacOS, you can install by running:

```sh
brew install redis
```

## Setting up our Mix project

First, let's setup a Mix project and add the necessary files.

```sh
mix new mini_redis --sup
```

We will add our RESP parser code we implemented later as needed.

## Writing a key value store with GenServer and ETS

Writing a KV store with `ets` wrapped with `GenServer` is pretty straightforward.
We will just wrap the following `ets` functions around our module:

* `:ets.lookup/2`
* `:ets.insert/2`
* `:ets.delete/2`

Since we don't want GenServer mailbox to be the bottleneck of our `ets`, we expose it through
a normal module function instead of a GenServer callback such as `handle_call` and `handle_cast`.
We only need to implement the `init` callback for our `GenServer`.

Here's how the code in `lib/mini_redis/kv.ex`;

```elixir
defmodule MiniRedis.KV do
  use GenServer
  require Logger

  @table :kv

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def get(key) do
    case :ets.lookup(@table, key) do
      [{^key, value}] -> {:ok, value}
      _ -> {:error, :not_found}
    end
  end

  def set(key, value) do
    :ets.insert(@table, {key, value})
    :ok
  end

  def delete(key) do
    :ets.delete(@table, key)
    :ok
  end

  # GenServer callbacks
  @impl true
  def init(opts) do
    pid = :ets.new(@table, [:set, :named_table, :public])
    Logger.info("Starting KV with ETS table #{pid}...")
    {:ok, opts}
  end
end
```

It should be pretty much self explanatory and easy to understand since we are just
building a wrapper around it.

{{% callout title="Why do we need to wrap `ets` in a `GenServer` module instead of a normal module?" %}}
This is because our `ets` process is stateful and it need to be owned by a process. Hence,
we will need `GenServer` as our parent process for the `ets`.

Here's how the `ets` documentation describe it:

> Each table is created by a process. When the process terminates, the table is
> automatically destroyed. Every table has access rights set at creation.
{{% /callout %}}


We will also need to have our application supervisor start it, let's
update our code in `lib/mini_redis/application.ex`:

```diff
children = [
  # Starts a worker by calling: MiniRedis.Worker.start_link(arg)
  # {MiniRedis.Worker, arg}
+ MiniRedis.KV
]
```

Our KV store is now done. Let's start writing our Redis server.

## Writing the Redis server with `gen_tcp`

Let's start with the code we get from the Elixir official guide on `gen_tcp`.
In `lib/mini_redis/server.ex`:

```elixir
defmodule MiniRedis.Server do
  require Logger

  def accept(port) do
    # The options below mean:
    #
    # 1. `:binary` - receives data as binaries (instead of lists)
    # 2. `packet: :line` - receives data line by line
    # 3. `active: false` - blocks on `:gen_tcp.recv/2` until data is available
    # 4. `reuseaddr: true` - allows us to reuse the address if the listener crashes
    #
    {:ok, socket} =
      :gen_tcp.listen(port, [:binary, packet: :line, active: false, reuseaddr: true])

    Logger.info("Accepting connections on port #{port}")
    loop_acceptor(socket)
  end

  defp loop_acceptor(socket) do
    {:ok, client} = :gen_tcp.accept(socket)
    serve(client)
    loop_acceptor(socket)
  end

  defp serve(socket) do
    socket
    |> read_line()
    |> write_line(socket)

    serve(socket)
  end

  defp read_line(socket) do
    {:ok, data} = :gen_tcp.recv(socket, 0)
    data
  end

  defp write_line(line, socket) do
    :gen_tcp.send(socket, line)
  end
end
```

Everything is just an exact copy pasta from Elixir offical guides. Next, let's
add it as the children of our application supervisor:

```diff
children = [
   # Starts a worker by calling: MiniRedis.Worker.start_link(arg)
   # {MiniRedis.Worker, arg}
   MiniRedis.KV
+  {Task, fn -> MiniRedis.Server.accept(String.to_integer(System.get_env("PORT") || "6379")) end}
]
```

You can test if it's working by running the following in your terminal:

```
telnet localhost 6379
```

and you'll see the following output in your console:

```
Trying 127.0.0.1...
Connected to localhost.
Escape character is '^]'.
```

you can enter any message and it'll reply back the same message you send:

```
Trying 127.0.0.1...
Connected to localhost.
Escape character is '^]'.
hello
hello
world
world
```

You can exit telnet by using `Ctrl + ]` and type in `close`.

## Integrating our parser into the TCP server

Now that we have a working TCP server, the next step would be integrating the parser we wrote
previously into our TCP server.

Let's add the parser we have wrote to our current project. In
`lib/mini_redis/parser.ex`:

```elixir
defmodule Parser do
  def encode(commands) when is_list(commands) do
    result = "*#{length(commands)}\r\n"

    Enum.reduce(commands, result, fn command, result ->
      result <> "$#{String.length(command)}\r\n#{command}\r\n"
    end)
  end

  def decode(string) when is_binary(string) do
    %{commands: commands} =
      string
      |> String.trim()
      |> String.split("\r\n")
      |> Enum.reduce(%{}, fn reply, state ->
        case reply do
          "*" <> length ->
            state
            |> Map.put(:type, "array")
            |> Map.put(:array_length, String.to_integer(length))

          "$" <> length ->
            state
            |> Map.put(:type, "bulk_string")
            |> Map.put(:bulk_string_length, String.to_integer(length))

          value ->
            value = String.trim(value)
            Map.update(state, :commands, [value], fn list -> [value | list] end)
        end
      end)

    Enum.reverse(commands)
  end
end
```

This is the first step to make our echo TCP server to become a minimally
working Redis server. But before that, let's recap a bit on how Redis work in general.

As mentioned in our previous post, Redis client send multiple lines of input as
a command to communicate with the Redis server.

The parser we wrote assumed
that we will received a full complete lines of input that can form a command.

However, that's not the case of our TCP server. Each line is received on its
own. This mean that, during the `read_line` our TCP server, we will received
the following:

```
line 1: *3\r\n
line 2: $3\r\n
line 3: SET\r\n
line 4: $5\r\n
line 5: mykey\r\n
line 6: $3\r\n
line 7: foo\r\n
```

instead of:

```
line 1: *3\r\n$3\r\nSET\r\n$5\r\nmykey\r\n$3\r\nfoo\r\n
```

To see this in action, we are going to hardcode some implementation for
demonstration purpose. The first step we want to achieve is to return `OK` for
every set command that our Redis server received.

Let's start with updating our helper function to suit our needs:

```diff
   defp read_line(socket) do
-    {:ok, data} = :gen_tcp.recv(socket, 0)
-    data
+    :gen_tcp.recv(socket, 0)
   end

-  defp write_line(line, socket) do
+  defp reply(socket) do
-    :gen_tcp.send(socket, line)
+    :gen_tcp.send(socket, "+OK\r\n")
   end
```

Here we rename our `write_line` to `reply` and have it hardcoded to
always return `+OK\r\n`, which is what is expected by the Redis client on
successful set command.

Next, let's update our `loop_acceptor` and `serve` function:

```elixir
defp loop_acceptor(socket) do
  {:ok, client} = :gen_tcp.accept(socket)
  serve(client, 0)
  loop_acceptor(socket)
end

# Added a count state, so we could keep track how many lines
# of input we have received so far.
defp serve(socket, count) do
  case read_line(socket) do
    {:ok, data} ->
      count = count + 1
      IO.inspect(data, label: "line #{count}")

      # Since we know a SET command always have 7 lines,
      # we hardcoded this logic for the time being so that
      # it reply to the client correctly.
      #
      # Without doing so, our client will end up being timeout.
      if count == 7 do
        reply(socket)
        serve(socket, 0)
      else
        serve(socket, count)
      end
    {:error, reason} ->
      Logger.info("Receive error: #{inspect(reason)}")
  end
end
```

To see it action:

```sh
# In terminal
iex -S mix

# In another terminal
redis-cli SET key value
```

Here's the output you'll see:

```sh
# Terminal 1
╰─➤  iex -S mix
Erlang/OTP 24 [erts-12.3] [source] [64-bit] [smp:10:10] [ds:10:10:10] [async-threads:1]

Compiling 1 file (.ex)

21:38:42.808 [info]  Starting KV with ETS table kv...

21:38:42.812 [info]  Accepting connections on port 6379
Interactive Elixir (1.13.3) - press Ctrl+C to exit (type h() ENTER for help)
iex(1)> line 1: "*3\r\n"
line 2: "$3\r\n"
line 3: "SET\r\n"
line 4: "$3\r\n"
line 5: "key\r\n"
line 6: "$5\r\n"
line 7: "value\r\n"

21:38:47.785 [info]  Receive error: :closed

# Terminal 2
╰─➤  redis-cli SET key value
OK
```

From here, there are multiple ways we could implement the integration between
our parser and our TCP server. Here's some of the way I could think of:

- Keep track of previous line in our state.
- Keep track of previous parts (line that has been parsed) in our state.

I'll leave this part as a practice for anyone who are interested to get their
hands dirty.

---

_Purposely left blank for those who want to implement themselves_

...

...

...

...

...

---

For the ease of implementation, I'll go with the first approach, so instead of
tracking the count, we will track the previous lines in our state:

```elixir
defp loop_acceptor(socket) do
  {:ok, client} = :gen_tcp.accept(socket)
  serve(client, "")
  loop_acceptor(socket)
end

defp serve(socket, state) do
  case read_line(socket) do
    {:ok, data} ->
      # Append the line to the end.
      state = state <> data

      # Notice that our return value for our parser have changed.
      #
      # Now we are expecting a tuple, to let us know whether
      # the commands is decoded successfully or is still incomplete.
      case Parser.decode(state) do
        {:ok, commands} ->
          IO.inspect(commands, label: "commands")
          reply(socket)
          serve(socket, "")

        {:incomplete, _} ->
          serve(socket, state)
      end

    {:error, reason} ->
      Logger.info("Receive error: #{inspect(reason)}")
  end
end
```

And here's our changes for our parser:

```elixir
defmodule Parser do
  def encode(commands) when is_list(commands) do
    # remain the same...
  end

  def decode(string) when is_binary(string) do
    state =
      string
      |> String.trim()
      |> String.split("\r\n")
      |> Enum.reduce(%{}, fn reply, state ->
        case reply do
          "*" <> length ->
            state
            |> Map.put(:type, "array")
            |> Map.put(:array_length, String.to_integer(length))
            |> Map.update(:commands, [], fn list -> list end)

          "$" <> length ->
            state
            |> Map.put(:type, "bulk_string")
            |> Map.put(:bulk_string_length, String.to_integer(length))
            |> Map.update(:commands, [], fn list -> list end)

          value ->
            value = String.trim(value)
            Map.update(state, :commands, [value], fn list -> [value | list] end)
        end
      end)

    if length(state.commands) == state.array_length do
      {:ok, Enum.reverse(state.commands)}
    else
      {:incomplete, state}
    end
  end
end
```

While this work well, it's not the most efficient implementation as we are
parsing the line every single time on every new incoming new line.

To see our latest progress:

```sh
# In terminal
mix run --no-halt

# In another terminal
redis GET key
redis-cli SET key value
```

Here's the output of my terminal:

```sh
╰─➤  mix run --no-halt

21:51:59.237 [info]  Starting KV with ETS table kv...

21:51:59.241 [info]  Accepting connections on port 6379
commands: ["GET", "key"]

21:52:00.965 [info]  Receive error: :closed
commands: ["SET", "key", "value"]

21:52:05.080 [info]  Receive error: :closed
```

Once we have the commands, the rest is fairly straightforward to integrate. If
you're up to the challenge, try to write the code your own!

---

_Purposely left blank for those who want to implement themselves_

...

...

...

...

...

---


## Integrating our Redis Server with KV store

Since we have the commands now, all we need to do is just match our commands to
the action we need to call in our KV store.


Let's first update our `reply` function to make suit our need:
```elixir
defp reply(socket, data) do
  :gen_tcp.send(socket, data)
end
```

This allow us to send different response based on the returned value we get
from our KV store. Next, we'll implement a `handle_command` function:

```elixir
defp handle_command(socket, command) do
  case command do
    ["SET", key, value] ->
      MiniRedis.KV.set(key, value)
      reply(socket, "+OK\r\n")

    ["GET", key] ->
      case MiniRedis.KV.get(key) do
        {:ok, value} -> reply(socket, "+#{value}\r\n")
        {:error, :not_found} -> reply(socket, "$-1\r\n")
      end
  end
end
```

Notice that here we return `$-1\r\n` to indicate `nil` value to our Redis
client, according to the [RESP protocol
spec](https://redis.io/docs/reference/protocol-spec/#resp-bulk-strings).

Lastly, calling `handle_command` in our `serve` function:

```elixir
defp serve(socket, state) do
  case read_line(socket) do
    {:ok, data} ->
      state = state <> data

      case Parser.decode(state) do
        {:ok, command} ->
          handle_command(socket, command)
          serve(socket, "")

        {:incomplete, _} ->
          serve(socket, state)
      end

    {:error, reason} ->
      Logger.info("Receive error: #{inspect(reason)}")
  end
end
```

Voila, our very first initial version of Redis server is done! It's support
basic `get` and `set` commands. Let's see it in action:

```sh
mix run --no-halt
```

In another terminal:

```sh
╭─kai at Kais-MacBook-Pro.local ~
╰─➤  redis-cli SET key value
OK
╭─kai at Kais-MacBook-Pro.local ~
╰─➤  redis-cli GET key
value
╭─kai at Kais-MacBook-Pro.local ~
╰─➤  redis-cli GET unfound
(nil)
```

But how does it perform against the real Redis server? Let's find out with some
synthetic benchmarking.

## Benchmarking with `redis-benchmark`

We can benchmark our simple Redis server by running the `redis-benchmark`.

Before the benchmark send the actual commands, it also send some `CONFIG` commands to
get some configuration. Let's make sure we handle those as well so that our Redis
server doesn't crash because of unmatched patterns:

```diff
defp handle_command(socket, command) do
  case command do
    ["SET", key, value] ->
      KV.set(key, value)
      reply(socket, "+OK\r\n")

    ["GET", key] ->
      case KV.get(key) do
        {:ok, value} -> reply(socket, "+#{value}\r\n")
        {:error, :not_found} -> reply(socket, "$-1\r\n")
      end
+   _ ->
+     reply(socket, "+OK\r\n")
  end
end
```

With that, we could run the benchmark by running the following command:

```sh
# -t set: to specify to just benchmark SET command
# -p 6000: to specify our Redis server port, by default it is 6379
# -c 1: Limit the parallel client to 1
redis-benchmark -t set -p 6000 -c 1
```

upon running this in my local machine, this is the output I get:

```
╰─➤  redis-benchmark -t set -p 6000 -c 1

ERROR: failed to fetch CONFIG from 127.0.0.1:6000
WARN: could not fetch server CONFIG
====== SET ======
  100000 requests completed in 4.20 seconds
  1 parallel clients
  3 bytes payload
  keep alive: 1
  multi-thread: no

Latency by percentile distribution:
0.000% <= 0.031 milliseconds (cumulative count 1843)
50.000% <= 0.039 milliseconds (cumulative count 79378)
87.500% <= 0.047 milliseconds (cumulative count 94852)
96.875% <= 0.055 milliseconds (cumulative count 97707)
98.438% <= 0.063 milliseconds (cumulative count 98686)
99.219% <= 0.071 milliseconds (cumulative count 99313)
99.609% <= 0.087 milliseconds (cumulative count 99743)
99.805% <= 0.095 milliseconds (cumulative count 99834)
99.902% <= 0.111 milliseconds (cumulative count 99909)
99.951% <= 0.127 milliseconds (cumulative count 99954)
99.976% <= 0.151 milliseconds (cumulative count 99978)
99.988% <= 0.167 milliseconds (cumulative count 99988)
99.994% <= 0.175 milliseconds (cumulative count 99994)
99.997% <= 0.199 milliseconds (cumulative count 99997)
99.998% <= 0.263 milliseconds (cumulative count 99999)
99.999% <= 0.527 milliseconds (cumulative count 100000)
100.000% <= 0.527 milliseconds (cumulative count 100000)

Cumulative distribution of latencies:
99.877% <= 0.103 milliseconds (cumulative count 99877)
99.997% <= 0.207 milliseconds (cumulative count 99997)
99.999% <= 0.303 milliseconds (cumulative count 99999)
100.000% <= 0.607 milliseconds (cumulative count 100000)

Summary:
  throughput summary: 23792.53 requests per second
  latency summary (msec):
          avg       min       p50       p95       p99       max
          0.038     0.024     0.039     0.055     0.071     0.527
```

Result maybe vary based on your hardware specification. 23k requests per second,
not bad.

If we try to bump up the `-c` to multiple clients, weird things happen. In my
local machine, this is how it behaves. It start with:

```
SET: rps=22452.0 (overall: 23231.3) avg_msec=0.041 (overall: 0.039)
```

then the `rps` slowly reduce to:
```
...
SET: rps=0.0 (overall: 6776.8) avg_msec=nan (overall: 0.038))0.038)
...
SET: rps=0.0 (overall: 4649.4) avg_msec=nan (overall: 0.038))0.038)
...
SET: rps=0.0 (overall: 3808.2) avg_msec=nan (overall: 0.038))0.038)
...
...
...
SET: rps=0.0 (overall: 869.3) avg_msec=nan (overall: 0.038)))0.038)
```

and it seems like taking forever to complete the benchmark. After minutes,
here's the output I obtained:

```
╰─➤  redis-benchmark -t set -p 6000 -c 2                                                                               130 ↵

ERROR: failed to fetch CONFIG from 127.0.0.1:6000
WARN: could not fetch server CONFIG
====== SET ======
  100000 requests completed in 679.77 seconds
  2 parallel clients
  3 bytes payload
  keep alive: 1
  multi-thread: no

Latency by percentile distribution:
0.000% <= 0.031 milliseconds (cumulative count 6705)
50.000% <= 0.039 milliseconds (cumulative count 81050)
87.500% <= 0.047 milliseconds (cumulative count 92781)
93.750% <= 0.055 milliseconds (cumulative count 96325)
96.875% <= 0.063 milliseconds (cumulative count 97995)
98.438% <= 0.071 milliseconds (cumulative count 99008)
99.219% <= 0.079 milliseconds (cumulative count 99467)
99.609% <= 0.087 milliseconds (cumulative count 99688)
99.805% <= 0.103 milliseconds (cumulative count 99851)
99.902% <= 0.119 milliseconds (cumulative count 99917)
99.951% <= 0.143 milliseconds (cumulative count 99961)
99.976% <= 0.167 milliseconds (cumulative count 99985)
99.988% <= 0.175 milliseconds (cumulative count 99988)
99.994% <= 0.231 milliseconds (cumulative count 99994)
99.997% <= 0.287 milliseconds (cumulative count 99997)
99.998% <= 0.383 milliseconds (cumulative count 99999)
99.999% <= 0.391 milliseconds (cumulative count 100000)
100.000% <= 0.391 milliseconds (cumulative count 100000)

Cumulative distribution of latencies:
99.851% <= 0.103 milliseconds (cumulative count 99851)
99.992% <= 0.207 milliseconds (cumulative count 99992)
99.997% <= 0.303 milliseconds (cumulative count 99997)
100.000% <= 0.407 milliseconds (cumulative count 100000)

Summary:
  throughput summary: 147.11 requests per second
  latency summary (msec):
          avg       min       p50       p95       p99       max
        0.038     0.024     0.039     0.055     0.071     0.391
```

147 requests per second...

This is because, in our Redis server implementation, we are handling
the incoming requests sequentially:

```elixir
defp loop_acceptor(socket) do
  {:ok, client} = :gen_tcp.accept(socket)
  Logger.info("Accepting client #{inspect(client)}")
  serve(client, "")
  loop_acceptor(socket)
end
```

Here, we are only accepting another client (connection), until we `serve` the
previous client successfully. In short, it's not designed to deal with
concurrent requests.

Let's update our server to deal with it better.

## Handling concurrent requests in our Redis server

I won't go into details on this, as we are essentially just following through
the guide from Elixir website on [Task
Supervisor](https://elixir-lang.org/getting-started/mix-otp/task-and-gen-tcp.html#task-supervisor)
section.

Essentially, we will be serving the client on a separate process using
`TaskSupervisor`:

```elixir
defp loop_acceptor(socket) do
  {:ok, client} = :gen_tcp.accept(socket)
  Logger.info("Accepting client #{inspect(client)}")

  {:ok, pid} =
    Task.Supervisor.start_child(Redis.TaskSupervisor, fn ->
      serve(client, "")
    end)

  Logger.info("Serving new client with pid: #{inspect(pid)}...")
  :ok = :gen_tcp.controlling_process(client, pid)

  loop_acceptor(socket)
end
```

The need of calling `:gen_tcp.controlling_process` has been explained as well
in
the guide mentioned above. Here's a direct quote from it:

> You might notice that we added a line, :ok = :gen_tcp.controlling_process(client, pid).
This makes the child process the “controlling process” of the client socket.
If we didn’t do this, the acceptor would bring down all the clients if it crashed because sockets
would be tied to the process that accepted them (which is the default behaviour).

With this small changes, we can now try to run the benchmark again with more
concurrency:

```sh
redis-benchmark -t set -p 6000 -c 5
```

With 5 clients, we are now at around 60k requests per second:

```
╰─➤  redis-benchmark -t set -p 6000 -c 5                                                                                 1 ↵

ERROR: failed to fetch CONFIG from 127.0.0.1:6000
WARN: could not fetch server CONFIG
====== SET ======
  100000 requests completed in 1.64 seconds
  5 parallel clients
  3 bytes payload
  keep alive: 1
  multi-thread: no

Latency by percentile distribution:
0.000% <= 0.031 milliseconds (cumulative count 80)
50.000% <= 0.079 milliseconds (cumulative count 63429)
75.000% <= 0.087 milliseconds (cumulative count 81300)
87.500% <= 0.095 milliseconds (cumulative count 92622)
93.750% <= 0.103 milliseconds (cumulative count 96208)
96.875% <= 0.111 milliseconds (cumulative count 97747)
98.438% <= 0.119 milliseconds (cumulative count 98535)
99.219% <= 0.135 milliseconds (cumulative count 99291)
99.609% <= 0.159 milliseconds (cumulative count 99715)
99.805% <= 0.175 milliseconds (cumulative count 99826)
99.902% <= 0.199 milliseconds (cumulative count 99916)
99.951% <= 0.247 milliseconds (cumulative count 99952)
99.976% <= 0.423 milliseconds (cumulative count 99976)
99.988% <= 0.607 milliseconds (cumulative count 99988)
99.994% <= 0.671 milliseconds (cumulative count 99994)
99.997% <= 0.911 milliseconds (cumulative count 99997)
99.998% <= 1.103 milliseconds (cumulative count 99999)
99.999% <= 5.255 milliseconds (cumulative count 100000)
100.000% <= 5.255 milliseconds (cumulative count 100000)

Cumulative distribution of latencies:
96.208% <= 0.103 milliseconds (cumulative count 96208)
99.927% <= 0.207 milliseconds (cumulative count 99927)
99.966% <= 0.303 milliseconds (cumulative count 99966)
99.973% <= 0.407 milliseconds (cumulative count 99973)
99.979% <= 0.503 milliseconds (cumulative count 99979)
99.988% <= 0.607 milliseconds (cumulative count 99988)
99.994% <= 0.703 milliseconds (cumulative count 99994)
99.996% <= 0.807 milliseconds (cumulative count 99996)
99.998% <= 1.007 milliseconds (cumulative count 99998)
99.999% <= 1.103 milliseconds (cumulative count 99999)
100.000% <= 6.103 milliseconds (cumulative count 100000)

Summary:
  throughput summary: 60901.34 requests per second
  latency summary (msec):
          avg       min       p50       p95       p99       max
          0.074     0.024     0.079     0.103     0.127     5.255
```

It seems like our requests per second (RPS) scale linearly to our number of
clients. _(Okay, not exactly linearly, but my point is, it does scale as we
increase the number of clients)_.

However, according to Universal Scalability Law, at some point, the system will
not scale linearly with more concurrency but result in a loss of performance.
So, let's push our system further and see how much we can go without it scaling
backward. Let's just start with additional 1 client:

```
redis-benchmark -t set -p 6000 -c 6
```

upon running it, this is the output I get:

```
╰─➤  redis-benchmark -t set -p 6000 -c 6                                                                               130 ↵

ERROR: failed to fetch CONFIG from 127.0.0.1:6000
WARN: could not fetch server CONFIG
Error: Connection reset by peer_msec=nan (overall: nan)
```

Oops, it doesn't even work... When I was implementing it, I was so lost, as I
don't know what went wrong in the first sight.

After benchmarking different part of my code, I reach a conclusion of, the
bottleneck is probably on our TCP server implementation. This is because, I
could have multiple clients to talk to my `KV` store and still performing well.

Knowing that, I research around and study further about `gen_tcp` and finally
found out one of the most important configuration that I need to set.

## Tuning on `gen_tcp` configuration to improve performance

While I was researching around, I came across this [StackOverflow question][6]
regarding why `gen_tcp` performance drop when getting too much concurrent
requests. The last answer, pointed out the `backlog` option in `gen_tcp`, and
suggested that we might want to tune it.

The `backlog` is essentially act like a queue for our TCP server to buffer
incoming requests that we can't handle. Here's what the documentation said:

> {backlog, B}

> B is an integer >= 0. The backlog value defines the maximum length that the queue of pending connections can grow to. Defaults to 5.

Since by default, the `backlog` is set to 5, that explain why our Redis server
start facing issue when there is 6 clients.

Hence, to resolve it, it is as simple as updating the options we provide when
calling `;gen_tcp.listen`:


```diff
+ case :gen_tcp.listen(port, [:binary, packet: :line, backlog: 50, active: false, reuseaddr: true]) do
- case :gen_tcp.listen(port, [:binary, packet: :line, active: false, reuseaddr: true]) do
```

with this changes, we could rerun the benchmark again, and it should work as
expected:

```
╰─➤  redis-benchmark -t set -p 6000 -c 6

ERROR: failed to fetch CONFIG from 127.0.0.1:6000
WARN: could not fetch server CONFIG
====== SET ======
  100000 requests completed in 1.15 seconds
  6 parallel clients
  3 bytes payload
  keep alive: 1
  multi-thread: no

Latency by percentile distribution:
0.000% <= 0.031 milliseconds (cumulative count 126)
50.000% <= 0.063 milliseconds (cumulative count 68203)
75.000% <= 0.071 milliseconds (cumulative count 80358)
87.500% <= 0.079 milliseconds (cumulative count 88028)
93.750% <= 0.095 milliseconds (cumulative count 95108)
96.875% <= 0.111 milliseconds (cumulative count 97548)
98.438% <= 0.127 milliseconds (cumulative count 98671)
99.219% <= 0.143 milliseconds (cumulative count 99235)
99.609% <= 0.167 milliseconds (cumulative count 99652)
99.805% <= 0.199 milliseconds (cumulative count 99828)
99.902% <= 0.239 milliseconds (cumulative count 99910)
99.951% <= 0.335 milliseconds (cumulative count 99952)
99.976% <= 0.591 milliseconds (cumulative count 99976)
99.988% <= 0.879 milliseconds (cumulative count 99988)
99.994% <= 1.215 milliseconds (cumulative count 99994)
99.997% <= 1.559 milliseconds (cumulative count 99997)
99.998% <= 1.591 milliseconds (cumulative count 99999)
99.999% <= 1.599 milliseconds (cumulative count 100000)
100.000% <= 1.599 milliseconds (cumulative count 100000)

Cumulative distribution of latencies:
96.591% <= 0.103 milliseconds (cumulative count 96591)
99.846% <= 0.207 milliseconds (cumulative count 99846)
99.940% <= 0.303 milliseconds (cumulative count 99940)
99.964% <= 0.407 milliseconds (cumulative count 99964)
99.972% <= 0.503 milliseconds (cumulative count 99972)
99.977% <= 0.607 milliseconds (cumulative count 99977)
99.981% <= 0.703 milliseconds (cumulative count 99981)
99.986% <= 0.807 milliseconds (cumulative count 99986)
99.988% <= 0.903 milliseconds (cumulative count 99988)
99.992% <= 1.207 milliseconds (cumulative count 99992)
99.994% <= 1.303 milliseconds (cumulative count 99994)
100.000% <= 1.607 milliseconds (cumulative count 100000)

Summary:
  throughput summary: 86805.56 requests per second
  latency summary (msec):
          avg       min       p50       p95       p99       max
        0.062     0.024     0.063     0.095     0.135     1.599
```

86k requests per second. Seems great!

## Comparing with the real Redis server

It's not clear yet if 86k requests per second of a synthetic benchmark is good
or not. So let's try to compare it with the actual Redis implementation:

```
# In a separate terminal, start the redis server
redis-server

# In current terminal
redis-benchmark -t set  -c 6
```

Here's the output running on my local machine:

```
╰─➤  redis-benchmark -t set  -c 6

====== SET ======
  100000 requests completed in 0.83 seconds
  6 parallel clients
  3 bytes payload
  keep alive: 1
  host configuration "save": 3600 1 300 100 60 10000
  host configuration "appendonly": no
  multi-thread: no

Latency by percentile distribution:
0.000% <= 0.015 milliseconds (cumulative count 846)
50.000% <= 0.039 milliseconds (cumulative count 61555)
75.000% <= 0.047 milliseconds (cumulative count 84651)
87.500% <= 0.055 milliseconds (cumulative count 94735)
96.875% <= 0.063 milliseconds (cumulative count 97384)
98.438% <= 0.079 milliseconds (cumulative count 98798)
99.219% <= 0.095 milliseconds (cumulative count 99381)
99.609% <= 0.111 milliseconds (cumulative count 99693)
99.805% <= 0.127 milliseconds (cumulative count 99865)
99.902% <= 0.135 milliseconds (cumulative count 99907)
99.951% <= 0.159 milliseconds (cumulative count 99963)
99.976% <= 0.167 milliseconds (cumulative count 99977)
99.988% <= 0.183 milliseconds (cumulative count 99988)
99.994% <= 0.231 milliseconds (cumulative count 99994)
99.997% <= 0.439 milliseconds (cumulative count 99997)
99.998% <= 0.447 milliseconds (cumulative count 99999)
99.999% <= 0.455 milliseconds (cumulative count 100000)
100.000% <= 0.455 milliseconds (cumulative count 100000)

Cumulative distribution of latencies:
99.562% <= 0.103 milliseconds (cumulative count 99562)
99.993% <= 0.207 milliseconds (cumulative count 99993)
99.994% <= 0.303 milliseconds (cumulative count 99994)
100.000% <= 0.503 milliseconds (cumulative count 100000)

Summary:
  throughput summary: 120772.95 requests per second
  latency summary (msec):
          avg       min       p50       p95       p99       max
        0.038     0.008     0.039     0.063     0.087     0.455
```

120k requests per second, 40k requests faster than our implementation. Given
that how much code we have written, and how easy it is, I think is fair enough.

One thing I want to note that, since it's a synthetic benchmark, don't take it
super seriously. Our system behave differently on different workload. The main
reason of doing benchmark here in this article, is to provide a better picture of
the performance of our implementation. This help us understand the boundary and
limit of our system and hence, help us to improve it further.

For instance, by comparing both benchmark result against our implementation and
the Redis server, I have found that our implementation have degradaded
performance after passing certain number of clients. At the number of clients
of 15:

```
redis-benchmark -t set -p 6000 -c 15
...
Summary:
  throughput summary: 46339.20 requests per second
  latency summary (msec):
          avg       min       p50       p95       p99       max
        0.313     0.040     0.303     0.543     0.751     3.991
```

I'm ending up with way worse performance than before. That is not the true if I
run the benchmark against the Redis server:

```
redis-benchmark -t set -c 15
...
Summary:
  throughput summary: 176056.33 requests per second
  latency summary (msec):
          avg       min       p50       p95       p99       max
        0.061     0.016     0.055     0.103     0.167     0.695
```

This indicates that our current implementation introduced certain overheads or
have some bottleneck when we have more concurrent requests and it's something
we can improve further.

# Wrap Up

Can you believe that we are able to write a simple Redis server with such a
short time and code? I don't believe it is possible until I tried to
write one.

A lot of systems seem complex and complicated in the first place.
But once you reduce the scope of the system, and try to break it down into
smaller parts, it start to get more manageable. Repeat the process, by slowly
increasing the scope back, and with time, I believe that everyone is able to
understand complex systems.

Will those systems be less complex and complicated? Less likely to be, but we
can always improve our domain knowledge and skills to make those systems to be
more understandable. Only by understanding it, we could make it simple.

Anyway, thanks for reading it until the end and hopefully you have learnt one
or two things throughout this article.

[0]: https://kaiwern.com/posts/2022/01/04/writing-a-simple-redis-protocol-parser-in-elixir/
[1]: https://redis.io/topics/protocol
[3]: https://elixir-lang.org/getting-started/mix-otp/introduction-to-mix.html
[4]: https://elixir-lang.org/getting-started/mix-otp/ets.html
[5]: https://elixir-lang.org/getting-started/mix-otp/task-and-gen-tcp.html
[6]: https://stackoverflow.com/questions/3524146/why-does-the-performance-drop-that-much-when-my-erlang-tcp-proxy-gets-many-concu
