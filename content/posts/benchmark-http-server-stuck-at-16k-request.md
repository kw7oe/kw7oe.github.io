---
title: "Benchmarking HTTP server stuck at 16k requests"
date: 2022-08-09T19:53:53+08:00
draft: true
---

A couple of weeks ago I was working through the article:
[Request coalescing in async Rust](https://fasterthanli.me/articles/request-coalescing-in-async-rust)
and faced a weird issue when reaching the benchmark section of the article.

Here's the core code snippet of our HTTP server:

```rust
async fn run_server() -> Result<(), Box<dyn Error>> {
    let addr: SocketAddr = "0.0.0.0:3779".parse()?;
    let listener = TcpListener::bind(addr).await?;
    loop {
        let (stream, addr) = listener.accept().await?;
        handle_connection(stream, addr).await?;
    }
}
```

In the article, the author managed to have the server perform up to 400k over
10 seconds:

```
$ oha -z 10s http://localhost:3779
Summary:
  Success rate: 1.0000
  Total:        10.0003 secs
  Slowest:      0.0135 secs
  Fastest:      0.0002 secs
  Average:      0.0011 secs
  Requests/sec: 46809.3602
```

However, when I benchmark it locally in my machine:
```
╰─➤  oha -z 10s http://localhost:3779
Summary:
  Success rate:	1.0000
  Total:	10.0034 secs
  Slowest:	6.7146 secs
  Fastest:	0.0001 secs
  Average:	0.0084 secs
  Requests/sec:	1640.2498

  Total data:	304.45 KiB
  Size/request:	19 B
  Size/sec:	30.43 KiB

Response time histogram:
  0.002 [15756] |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
  0.005 [420]   |
  0.007 [119]   |
  0.009 [38]    |
  0.012 [12]    |
  0.014 [0]     |
  0.016 [0]     |
  0.018 [0]     |
  0.021 [0]     |
  0.023 [0]     |
  0.025 [63]    |

# ...

Status code distribution:
  [200] 16408 responses
```

It get capped at 16k requests _(running over 10 seconds)_, regardless of how many time I ran it.

---

Here's the structure of this post:

- [Investigation](#investigation)
  - [Ephemeral Ports](#ephemeral-ports)
  - [TCP `TIME_WAIT` state](#tcp-time_wait-state)
  - [Using `netstat` to show `TIME_WAIT` connections](#using-netstat-to-show-time_wait-connections)
- [Other solution](#other-solution)
- [References](#references)

---

## Investigation

I did some Google search and came across the following StackOverflow questions:

- [ruby - Why does a simple Thin server stop responding at 16500 requests when benchmarking? - Stack Overflow](https://stackoverflow.com/questions/9156537/why-does-a-simple-thin-server-stop-responding-at-16500-requests-when-benchmarkin)
- [sockets - 'ab' program freezes after lots of requests, why? - Stack Overflow](https://stackoverflow.com/questions/1216267/ab-program-freezes-after-lots-of-requests-why/6699135#6699135)

One of the answer mentioned that:

> It sounds like you are running out of ephemeral ports. To check, use the `netstat` command and look for several thousand ports in the `TIME_WAIT` state.

To fix it, one can either configure the ephemeral port range or reduce the maximum segment lifetime
(msl) time with `sysctl`.

### Ephemeral Ports

Apparently, while our computer have 65,535 ports, not all of them can be used
to establish a TCP connection. There's a limit of ephemeral ports. The range of the ephemeral ports
can be obtained by running `sysctl`:

```bash
╰─➤  sudo sysctl net.inet.ip.portrange.first
net.inet.ip.portrange.first: 49152
╰─➤  sudo sysctl net.inet.ip.portrange.last
net.inet.ip.portrange.last: 65535
```
By default, my machine have a total of around 16k ephemeral ports available to
be used, which explain partly why I'm getting stuck at 16k requests during
benchmarking.

Hence, one of the solution is increasing the ephemeral port range:

```
sudo sysctl -w net.inet.ip.portrange.first=32768
```

With this changes, my benchmark locally can now hit up to 34k requests over 10
seconds.

But, doesn't those TCP connection get closed once a request is served? Why does
our system not using the ports from those closed connection? That's because of
the TCP `TIME_WAIT` state.

### TCP `TIME_WAIT` state

When a TCP connection is closed from the server side, the port doesn't
immediately available to be used because the connection will first transits
into `TIME_WAIT` state.  In the `TIME_WAIT` phase, the connection is still kept
around to deal with delayed packets.

By default, the `TIME_WAIT` phase will wait for `2 * msl` time. This can be get/set through
the `net.inet.tcp.msl` with `sysctl` as well.

```
╰─➤  sysctl net.inet.tcp.msl

net.inet.tcp.msl: 15000
```

By default, MacOS have a `msl` time of 15 seconds. Hence, according to the
specs, the connection will have to wait around 30 seconds before it can
transits into `CLOSED` state.

So after 16k requests, my laptop ran out of ephemeral ports, as most of it is
still in `TIME_WAIT` phase. Hence,  my benchmark can only cap at 16k requests.

Hence, the other recommended solution is to reduce the `msl`:

```
╰─➤  sudo sysctl -w net.inet.tcp.msl=1000

net.inet.tcp.msl: 15000 -> 1000
```
However, you should avoid doing so in your production environment. To
understand more about coping with `TIME_WAIT`, I'll suggest you to refer to
this article:

- [Coping with the TCP TIME-WAIT state on busy Linux servers](https://vincent.bernat.ch/en/blog/2014-tcp-time-wait-state-linux)

That's all for the issue I faced. Next, I'm going to cover a bit on how you can use
`netstat` to investigate this problem.

### Using `netstat` to show `TIME_WAIT` connections

Initially, I was trying to use `lsof` to pull out the TCP connection that are
in the `TIME_WAIT` state. Unfortunately, `lsof` doesn't display the TCP state
in its outputs. Hence, I have to use `netstat` instead. If you happen to
know how to use `lsof` to achieve the same, do let me know!

In MacOS, we can use the following arguments with `netstat` to list out all TCP
connections:

```bash
# -p to specify protocol, -n to prevent port name conversion.
netstat -p tcp -n
```

For Linux system, a different argument is needed as the `netstat` in MacOS
behave differently than the one in Linux:

```bash
# -t to specify tcp protocol. -p in Linux show the PID of the program.
# -n behave similarly.
netstat -tn
```

Pairing with `grep`, we can filter out other TCP connections that we are not
interested in:

```bash
╰─➤  netstat -p tcp -n  | grep TIME_WAIT
tcp6       0      0  2001:f40:925:dc8.61797 2404:6800:4001:8.443   TIME_WAIT
tcp6       0      0  2001:f40:925:dc8.61798 2404:6800:4001:8.443   TIME_WAIT
tcp4       0      0  127.0.0.1.3779         127.0.0.1.61801        TIME_WAIT
tcp4       0      0  127.0.0.1.3779         127.0.0.1.61807        TIME_WAIT
tcp4       0      0  127.0.0.1.3779         127.0.0.1.61802        TIME_WAIT
tcp4       0      0  127.0.0.1.3779         127.0.0.1.61800        TIME_WAIT
tcp4       0      0  127.0.0.1.3779         127.0.0.1.61804        TIME_WAIT
tcp4       0      0  127.0.0.1.3779         127.0.0.1.61805        TIME_WAIT
tcp4       0      0  127.0.0.1.3779         127.0.0.1.61799        TIME_WAIT
```

With this, you can easily check if you have a bunch of TCP connections stuck
in the `TIME_WAIT` state.

## Other solution

While we can tweak our `net.inet` configuration to partly solve the issues,
it's really not the best solution, since there's a limit on how much we can
tweak.

The root cause is due to how we write HTTP server code. We are continuously
accepting new connections using new ports. Instead, we can use a proper HTTP server
library like [`axum`][0] or [`hyper`][1] to handle those better for us.

I haven't figure out how exactly it works underneath, but I'm under the
impression that it reuse the ports instead. If you happen to know how it works,
do let me know!

## References

Here are some of the other useful resources I have came across when attempting to
understand more about this issue:

- [Brian Pane » Blog Archive » Changing the length of the TIME_WAIT state on Mac OS X](http://web.archive.org/web/20090210151520/http://www.brianp.net/2008/10/03/changing-the-length-of-the-time_wait-state-on-mac-os-x/)
- [What is the purpose of TIME WAIT in TCP connection tear down? - Network Engineering Stack Exchange](https://networkengineering.stackexchange.com/questions/19581/what-is-the-purpose-of-time-wait-in-tcp-connection-tear-down)
- [tcp - What could cause so many TIME_WAIT connections to be open? - Stack Overflow](https://stackoverflow.com/questions/33177370/what-could-cause-so-many-time-wait-connections-to-be-open)

Hope you find it helpful as well!

[0]: https://github.com/tokio-rs/axum
[1]: https://github.com/hyperium/hyper
