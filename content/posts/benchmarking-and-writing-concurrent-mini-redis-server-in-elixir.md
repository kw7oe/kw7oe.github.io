---
title: "Benchmarking and writing a concurrent mini Redis in Elixir"
date: 2022-04-05T20:33:16+08:00
draft: true
tags: ['elixir', 'database', 'mini-redis', 'tutorial']
---

In our [previous post][0] of this series, we wrote a mini Redis integrated with
our own RESP parser and a KV store.

In this post, we are going to benchmark it and make changes along the way to
make our mini Redis more performant!

This post consists of the following sections:

* [Benchmarking with `redis-benchmark`](#benchmarking-with-redis-benchmark)
* [Handling concurrent requests in our TCP server](#handling-concurrent-requests-in-our-tcp-server)
* [Tuning on `gen_tcp` configuration to improve performance](#tuning-on-gen_tcp-configuration-to-improve-performance)

---

_This post is inspired by [Rust Tokio Mini-Redis Tutorial](https://tokio.rs/tokio/tutorial/setup),
where it walks through the reader to implement a mini Redis with
[`tokio`](https://tokio.rs/). This post is part of
the series of implementing mini Redis in Elixir:_

- [Part 1: Writing a simple Redis Protocol parser in Elixir][2]
- [Part 2: Writing a mini Redis server in Elixir][0]
- Part 3: Benchmarking and writing concurrent mini Redis server in Elixir

---

## Benchmarking with `redis-benchmark`

We can benchmark our mini Redis server by running the `redis-benchmark`.

Before the benchmark send the actual commands, it also send some `CONFIG` commands to
get some configuration. Let's make sure we handle those as well so that our server doesn't crash because of unmatched patterns:

```diff
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
+   _ ->
+     reply(socket, "+OK\r\n")
  end
end
```

With that, we could run the benchmark by running the following command:

```sh
# In project terminal
mix run --no-halt

# In another terminal
# -t set: to specify to just benchmark SET command
# -c 1: Limit the parallel client to 1
redis-benchmark -t set -c 1
```

upon running this in my local machine, this is the output I get:

```sh
╰─➤  redis-benchmark -t set -c 1

ERROR: failed to fetch CONFIG from 127.0.0.1:6379
WARN: could not fetch server CONFIG
====== SET ======
  100000 requests completed in 6.70 seconds
  1 parallel clients
  3 bytes payload
  keep alive: 1
  multi-thread: no

Latency by percentile distribution:
0.000% <= 0.031 milliseconds (cumulative count 3499)
50.000% <= 0.063 milliseconds (cumulative count 53168)
# ....
100.000% <= 12.223 milliseconds (cumulative count 100000)

Cumulative distribution of latencies:
# ....
99.999% <= 11.103 milliseconds (cumulative count 99999)
100.000% <= 13.103 milliseconds (cumulative count 100000)

Summary:
  throughput summary: 14927.60 requests per second
  latency summary (msec):
        avg       min       p50       p95       p99       max
        0.063     0.024     0.063     0.087     0.159    12.223
```

Result maybe vary based on your hardware specification. 14k requests per second, not bad.

If we try to bump up the `-c` to multiple clients, weird things happen. In my
local machine, this is how it behaves. It start with:

```
SET: rps=12500.0 (overall: 13326.7) avg_msec=0.076 (overall: 0.071)
```

then the `rps` slowly reduce to:
```
...
SET: rps=0.0 (overall: 2423.4) avg_msec=nan (overall: 0.069)).069))
...
...
SET: rps=0.0 (overall: 1817.5) avg_msec=nan (overall: 0.069)).069))
```

and it seems like taking forever to complete the benchmark. After minutes,
here's the output I obtained:

```sh
╰─➤  redis-benchmark -t set -c 2

ERROR: failed to fetch CONFIG from 127.0.0.1:6379
WARN: could not fetch server CONFIG
====== SET ======
  100000 requests completed in 682.69 seconds
  2 parallel clients
  3 bytes payload
  keep alive: 1
  multi-thread: no

Latency by percentile distribution:
0.000% <= 0.031 milliseconds (cumulative count 12)
50.000% <= 0.071 milliseconds (cumulative count 78123)
# ....
100.000% <= 7.671 milliseconds (cumulative count 100000)

Cumulative distribution of latencies:
# ....
99.998% <= 5.103 milliseconds (cumulative count 99998)
99.999% <= 6.103 milliseconds (cumulative count 99999)
100.000% <= 8.103 milliseconds (cumulative count 100000)

Summary:
  throughput summary: 146.48 requests per second
  latency summary (msec):
          avg       min       p50       p95       p99       max
        0.069     0.024     0.071     0.095     0.151     7.671
```

146 requests per second... Seems like something is not right with our
implementation.


### What's making it slow?

Can you guess what it is? The hint is in the title of this post.

Remember the code that we wrote below?

```elixir
defp loop_acceptor(socket) do
  {:ok, client} = :gen_tcp.accept(socket)
  Logger.info("Accepting client #{inspect(client)}")
  serve(client, "")
  loop_acceptor(socket)
end
```

Here, we are only accepting another client (connection), until we `serve` the
previous client successfully. In short, it is handling the incoming requests sequentially. Our code is not written to handle concurrent requests.

Let's update our server to deal with it better.

## Handling concurrent requests in our TCP server

I won't go into details on this, as we are essentially just following through
the guide from Elixir website on [Task
Supervisor](https://elixir-lang.org/getting-started/mix-otp/task-and-gen-tcp.html#task-supervisor)
section.

Essentially, we will be serving the client on a separate process using
`Task.Supervisor`:

```elixir
defp loop_acceptor(socket) do
  {:ok, client} = :gen_tcp.accept(socket)
  Logger.info("Accepting client #{inspect(client)}")

  {:ok, pid} =
    Task.Supervisor.start_child(MiniRedis.TaskSupervisor, fn ->
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

Also, let's don't forget to include the `Task.Supervisor` in our application
supervisor. In `lib/mini_redis/application.ex`:

```diff
children = [
  # Starts a worker by calling: MiniRedis.Worker.start_link(arg)
  # {MiniRedis.Worker, arg}
  MiniRedis.KV,
+ {Task.Supervisor, name: MiniRedis.TaskSupervisor},
  {Task, fn -> MiniRedis.Server.accept(String.to_integer(System.get_env("PORT") || "6379")) end},
]
```

Let's run the benchmark again with more concurrency to see the outcome of
our small changes:

```sh
redis-benchmark -t set -c 5
```

With 5 clients, we are now at around 52k requests per second:

```sh
╰─➤  redis-benchmark -t set -c 5
ERROR: failed to fetch CONFIG from 127.0.0.1:6379
WARN: could not fetch server CONFIG
====== SET ======
  100000 requests completed in 1.92 seconds
  5 parallel clients
  3 bytes payload
  keep alive: 1
  multi-thread: no

Latency by percentile distribution:
0.000% <= 0.031 milliseconds (cumulative count 65)
50.000% <= 0.087 milliseconds (cumulative count 58111)
# ....
100.000% <= 6.751 milliseconds (cumulative count 100000)

Cumulative distribution of latencies:
73.668% <= 0.103 milliseconds (cumulative count 73668)
# ....
100.000% <= 7.103 milliseconds (cumulative count 100000)

Summary:
  throughput summary: 51975.05 requests per second
  latency summary (msec):
          avg       min       p50       p95       p99       max
        0.089     0.024     0.087     0.151     0.199     6.751
```

It seems like our requests per second (RPS) scale linearly to our number of
clients. _(Okay, not exactly linearly, but my point is, it does scale as we
increase the number of clients)_.

### Pushing it by a little bit

However, according to Universal Scalability Law, at some point, the system will
not scale linearly with more concurrency but result in a loss of performance.
So, let's push our system further and see how much we can go without it scaling
backward. Let's just start with additional 1 client:

```
redis-benchmark -t set -c 6
```

upon running it, this is the output I get:

```
╰─➤  redis-benchmark -t set -c 6
ERROR: failed to fetch CONFIG from 127.0.0.1:6379
WARN: could not fetch server CONFIG
SET: rps=0.0 (overall: nan) avg_msec=nan (overall: nan)
```

Oops, it doesn't even work... What could be wrong this time?


{{% callout %}}
When I was implementing it, I was so lost, as I
don't know what went wrong in the first sight.

After benchmarking different part of my code, I reach a conclusion of: the
bottleneck is probably on our TCP server implementation. This is because, I
could have multiple clients to talk to my `KV` store and still performing well.

Knowing that, I research around and study further about `gen_tcp` and finally
found out one of the most important configuration that I need to set.
{{% /callout %}}

Turns out that our bottleneck this time is `:gen_tcp`. There is a
configuration we need to tweak to make it work.

## Tuning on `gen_tcp` configuration to improve performance

While I was researching around, I came across this [StackOverflow question][1]
regarding why `gen_tcp` performance drop when getting too much concurrent
requests. The last answer pointed out the `backlog` option in `gen_tcp` and
suggested tuning it.

The `backlog` is a queue for our TCP server to buffer
incoming requests that can't be handle yet. Here's what the documentation said:

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

```sh
╰─➤  redis-benchmark -t set -c 6
ERROR: failed to fetch CONFIG from 127.0.0.1:6379
WARN: could not fetch server CONFIG
====== SET ======
  100000 requests completed in 1.45 seconds
  6 parallel clients
  3 bytes payload
  keep alive: 1
  multi-thread: no

Latency by percentile distribution:
0.000% <= 0.031 milliseconds (cumulative count 63)
50.000% <= 0.079 milliseconds (cumulative count 59243)
# ....
100.000% <= 1.599 milliseconds (cumulative count 100000)

Cumulative distribution of latencies:
81.055% <= 0.103 milliseconds (cumulative count 81055)
# ....
100.000% <= 1.607 milliseconds (cumulative count 100000)

Summary:
  throughput summary: 68775.79 requests per second
  latency summary (msec):
          avg       min       p50       p95       p99       max
        0.080     0.024     0.079     0.143     0.183     1.599
```

68k requests per second. Seems great!

## Comparing with the real Redis server

It's not clear yet if 68k requests per second of a synthetic benchmark is good
or not. So let's try to compare it with the actual Redis implementation:

```sh
# Make sure we close our Redis server before starting the real one.

# In a separate terminal, start the redis server
redis-server

# In current terminal
redis-benchmark -t set  -c 6
```

Here's the output running on my local machine:

```sh
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
# ....
100.000% <= 0.455 milliseconds (cumulative count 100000)

Cumulative distribution of latencies:
# ....
99.994% <= 0.303 milliseconds (cumulative count 99994)
100.000% <= 0.503 milliseconds (cumulative count 100000)

Summary:
  throughput summary: 120772.95 requests per second
  latency summary (msec):
          avg       min       p50       p95       p99       max
        0.038     0.008     0.039     0.063     0.087     0.455
```

120k requests per second, 60k requests faster than our implementation. Given
that how much code we have written, and how easy it is, I think it is fair enough.


## Note about our benchmark

Since this is a synthetic benchmark, don't take it super seriously. Our system might
behave differently on different workload. The main reason of benchmarking here,
is to provide a better picture for the performance of our implementation. This
help us understand the boundary and limit of our system and hence, help us to
improve it further.

For instance, by comparing both benchmark result of our mini Redis and
the Redis, I have found that our implementation have degradaded
performance after passing certain number of clients. At the number of clients
of 15:

```sh
redis-benchmark -t set -c 15
# ....
Summary:
  throughput summary: 44883.30 requests per second
  latency summary (msec):
          avg       min       p50       p95       p99       max
        0.326     0.048     0.319     0.519     0.719     4.031
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
have some contention  when we have more concurrent requests and it's something
we can improve further.

## What's next?

As mentioend, our current implementation still have some limitations. For
instance, we are spawning a new `Task` for every incoming requests, this could
potentially be replaced by using a pool of processes, with library like
`nimble_pool` or `poolboy`.

Would it result in better performance and resource utilization? I'm not sure.
In theory, it will reduce the resources needed. But who knows, if you want to
dive in further, try to use a pool and run some benchmark to see if it works
better.

If you are interested in this topic, here's some articles that I think you
might
found interesting as well:

- [Handling TCP connections in Elixir](https://andrealeopardi.com/posts/handling-tcp-connections-in-elixir/)
- [Process pools with Elixir's Registry](https://andrealeopardi.com/posts/process-pools-with-elixirs-registry/)

Sometime in the future, maybe there will be a part 4 where we further optimize our
implementation to improve the performance of our mini Redis server. But for
now,
that's the end of this series.

# Wrap Up

Can you believe that we are able to write a mini Redis server with such a
short time and code? I didn't believe it until I tried to do it.

A lot of systems seem complex and complicated in the first place.
But once you reduce the scope of the system, and try to break it down into
smaller parts, it start to get more manageable. Repeat the process, by slowly
increasing the scope back, and with time, I believe that everyone is able to
understand complex systems.

Will those systems be less complex and complicated? Less likely to be, but we
can always improve our domain knowledge and skills to make those systems to be
more understandable. Only by understanding it, we could make it simple.

Anyway, thanks for reading it until the end and hopefully you have learnt one
or two things throughout this series.

[0]: {{< ref "/posts/writing-mini-redis-server-in-elixir.md" >}}
[1]: https://stackoverflow.com/questions/3524146/why-does-the-performance-drop-that-much-when-my-erlang-tcp-proxy-gets-many-concu
[2]: {{< ref "/posts/writing-a-simple-redis-protocol-parser-in-elixir.md" >}}

