---
title: "Writing a mini Redis server in Elixir"
date: 2022-04-04T20:32:56+08:00
tags: ['elixir', 'database', 'mini-redis', 'tutorial']
series: "Building mini Redis in Elixir"
---

In the [previous post][0], we wrote a simple [Redis Protocol specification][1] (RESP) parser. That's just a
small part towards to build a mini Redis. Let's continue writing the other parts needed for our mini Redis server.

Here's how the overall architecture looks like:

```
Redis CLI <-> Redis Server (TCP) <-> RESP Parser
                     ↓
              Key Value Store
```

We will use `redis-cli` as the Redis client and write the following parts:

* Redis Server (TCP)
* Key Value (KV) Store

Here's the structure of this post:

* [Writing a KV Store with `GenServer` and `ETS`](#writing-a-key-value-store-with-genserver-and-ets)
* [Writing a mini Redis server](#writing-a-mini-redis-server)
  * [Writing a TCP Server with `gen_tcp`](#writing-a-tcp-server-with-gen_tcp)
  * [Integrating our Redis Server with our RESP parser](#integrating-our-parser-into-the-tcp-server)
  * [Integrating our Redis Server with KV store](#integrating-our-redis-server-with-kv-store)

---

_This post is inspired by [Rust Tokio Mini-Redis Tutorial](https://tokio.rs/tokio/tutorial/setup),
where it walks through the reader to implement a mini Redis with
[`tokio`](https://tokio.rs/). This post is part of
the series of implementing mini Redis in Elixir:_

- [Part 1: Writing a simple Redis Protocol parser in Elixir][0]
- Part 2: Writing a mini Redis server in Elixir
- [Part 3: Benchmarking and writing a concurrent mini Redis in Elixir][6]

---

## Prerequisite

Before we get started, if you're unfamiliar with the following: `GenServer`, `ETS` and `gen_tcp`,
I'll recommend you to work through the
[the official Elixir Guide: Mix and OTP section][3].
Specifically on the following topics:

* [ETS][4]
* [Task and `gen_tcp`][5]

We'll work on top of the implementation of the TCP server from the guide. We will convert it from an echo TCP
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


We will need to have our application supervisor start it, let's
update our code in `lib/mini_redis/application.ex`:

```diff
children = [
  # Starts a worker by calling: MiniRedis.Worker.start_link(arg)
  # {MiniRedis.Worker, arg}
+ MiniRedis.KV
]
```

Our KV store is now done. Let's start writing our Redis server.

## Writing a mini Redis server

A mini Redis server is a TCP server that can parse RESP request and
send RESP response. It performs the operation of storing or
retrieving key value pairs as requested.

Hence, to write a mini Redis server, it means that we need to:

- Write a basic TCP server
- Support RESP request and response in the TCP server
- Perform write and read of key value pairs according to the request.

Let's start with the first step.

### Writing a TCP server with `gen_tcp`

We will reused the echo TCP server code from the Elixir official guide on `gen_tcp`.

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

Everything is just an exact copy pasta from Elixir official guides. Next, let's
add it as the children of our application supervisor, in
`lib/mini_redis/application.ex`:

```diff
children = [
   # Starts a worker by calling: MiniRedis.Worker.start_link(arg)
   # {MiniRedis.Worker, arg}
   MiniRedis.KV
+  {Task, fn -> MiniRedis.Server.accept(String.to_integer(System.get_env("PORT") || "6379")) end}
]
```

We can test it by running the following in our terminal:

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

Simple enough
thanks to the amazing official Elixir guide. Now, let's make it become a little
bit more like a mini Redis server.

### Integrating our parser into the TCP server

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
working Redis server.

Before integrating the parser, let's recap a bit.
Redis client send multiple lines of input as a command to
communicate with the Redis server.

The parser we wrote assumed that we will received a full complete lines
of input that can form a command.  However, that's not the case of our TCP
server. Each line is received on its own. This mean that, during the
`read_line` our TCP server, we will received the following:

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

Let's update our helper function to suit our needs:

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

Here we rename our `write_line` to `reply` and hardcoded it to
return `+OK\r\n`, which is what is expected by the Redis client on
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

We just hardcoded the implementation to stop and reply `OK`  when we receive 7 parts. Notice
that, this time we also logged the error message if there's any.  This
is important as, once our client receive the response, the connection
will be closed by the client, and result in error.

Let's see what we got so far:

```sh
# In terminal
mix run --no-halt

# In another terminal
redis-cli SET key value
```

Here's the output you'll see:

```sh
# Terminal 1
╰─➤ mix run --no-halt

21:38:42.808 [info]  Starting KV with ETS table kv...

21:38:42.812 [info]  Accepting connections on port 6379

line 1: "*3\r\n"
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

Here, we are parsing the line every time a new part of the command is received,
until all the parts required arrived to be form a command. In the event of
incomplete command, our parser will have to let us know, so our TCP server
continue to listen to incoming messages.

Here's the changes for the parser:

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

Pretty straightforward, we check the expected command length with the
commands length we received so far. If it's the same, it means that we receive
all the parts we need for the command and return the commands. Else,
we just let the caller know that it's incomplete.

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


### Integrating our Redis Server with KV store

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

We have integrated  our Redis server with both the RESP parser and our KV store.
It now supports the basic `get` and `set` commands. Let's see it in action:

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

Voila, our mini Redis server is done!

## What's next?

We have completed the basic functionality of a Redis server. However, it's
still very far behind from the real Redis server. For example,
how does our mini Redis perform against the real Redis?

In the [next post][6], we will find out how well our implementation is doing
with synthetic benchmarking. Along the way, we will discovered the limitations of our
current implementation, make some changes and tweak some configurations
to make it more performant. _(Hint: is about concurrency)_

Thanks for reading until the end and, hopefully, I can see you in my [next post][6]!

[0]: {{< ref "/posts/writing-a-simple-redis-protocol-parser-in-elixir.md" >}}
[1]: https://redis.io/topics/protocol
[3]: https://elixir-lang.org/getting-started/mix-otp/introduction-to-mix.html
[4]: https://elixir-lang.org/getting-started/mix-otp/ets.html
[5]: https://elixir-lang.org/getting-started/mix-otp/task-and-gen-tcp.html
[6]: {{< ref "/posts/benchmarking-and-writing-concurrent-mini-redis-server-in-elixir.md" >}}
