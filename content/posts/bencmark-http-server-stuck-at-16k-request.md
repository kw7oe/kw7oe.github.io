---
title: "Benchmarking HTTP server stuck at 16k requests"
date: 2022-08-08T10:53:53+08:00
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

## Investigation

I did some Google search and came across the following StackOverflow questions:

- [ruby - Why does a simple Thin server stop responding at 16500 requests when benchmarking? - Stack Overflow](https://stackoverflow.com/questions/9156537/why-does-a-simple-thin-server-stop-responding-at-16500-requests-when-benchmarkin)
- [sockets - 'ab' program freezes after lots of requests, why? - Stack Overflow](https://stackoverflow.com/questions/1216267/ab-program-freezes-after-lots-of-requests-why/6699135#6699135)

One of the answer mentioned that:

> It sounds like you are running out of ephemeral ports. To check, use the `netstat` command and look for several thousand ports in the `TIME_WAIT` state.

To fix it, one can either configure the empheral port range or reduce the maximum segment lifetime
(msl) time with `sysctl`.

### Empheral Ports

Apparently, while our computer have 65,535 ports, not all of them can be used
to establish a TCP connection. There's a limit of empheral ports. The range of the empheral ports
can be obtained by running `sysctl`:

```bash
╰─➤  sudo sysctl net.inet.ip.portrange.hifirst
net.inet.ip.portrange.hifirst: 49152
╰─➤  sudo sysctl net.inet.ip.portrange.hilast
net.inet.ip.portrange.hilast: 65535
```
By default, my machine have a total of around 16k ephemeral ports available to
be used, which explain partly why I'm getting stucked at 16k requests during
benchmarking.

Hence, one of the solution is increasing the empheral port range:

```
sudo sysctl -w net.inet.ip.portrange.first=32768
```

With this changes, my benchmark locally can now hit up to 34k requests over 10
seconds.

But, doesn't those TCP connection get closed once a request is served? Why does
our system not using the ports from those closed connection? That's because of
the TCP `TIME_WAIT` state.

## TCP `TIME_WAIT` state

When a TCP connection is closed from the server side, the port doesn't
immediately available to be used because the connection will first transist
into `TIME_WAIT` state.  In the `TIME_WAIT` phase, the connection is still kept
around to deal with delayed packets.

By default, the `TIME_WAIT` phase will wait for `2 * msl time`. This can be get/set through
the `net.inet.tcp.msl` with `sysctl` as well.

```
╰─➤  sysctl net.inet.tcp.msl

net.inet.tcp.msl: 15000
```

By defualt, MacOS have a `MSL time` of 15 seconds. Hence, according to the
specs, the connection will have to wait around 30 seconds before it can
transist into `CLOSED` state.

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


## References

Here are some of the useful resources I have came across when attempting to
understand more about this issue:

- [Brian Pane » Blog Archive » Changing the length of the TIME_WAIT state on Mac OS X](http://web.archive.org/web/20090210151520/http://www.brianp.net/2008/10/03/changing-the-length-of-the-time_wait-state-on-mac-os-x/)
- [What is the purpose of TIME WAIT in TCP connection tear down? - Network Engineering Stack Exchange](https://networkengineering.stackexchange.com/questions/19581/what-is-the-purpose-of-time-wait-in-tcp-connection-tear-down)
- [tcp - What could cause so many TIME_WAIT connections to be open? - Stack Overflow](https://stackoverflow.com/questions/33177370/what-could-cause-so-many-time-wait-connections-to-be-open)

Hope you find it helpful as well!
