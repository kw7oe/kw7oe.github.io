---
title: "Server Stuck at 16k Request"
date: 2022-07-09T21:53:53+08:00
draft: true
---

A couple of weeks ago, while I was working through the code in the article:
[Request coalescing in async Rust](https://fasterthanli.me/articles/request-coalescing-in-async-rust), I
failed to replicate the benchmark performance of the HTTP server written in Rust tokio.

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

However, when I attempt to benchmark the same code in my machine with `oha`, I
always get capped at around 16k requests.

I spent some of my time to research further and turn out that:

There's a limit of ephemeral port so the code of accepting a new connection will
always use one of its port.

According to the TCP spec, once a socket is close, it will go into `TIME_WAIT` phase,
which will wait for `2 * MSL time`, which can be set through the `net.inet.tcp.msl` with `sysctl`.

So after 16k requests, my laptop ran out of ephemeral ports, as most of it is still in `TIME_WAIT` phase.
By defualt, MacOS have a `MSL time` of 15 seconds:

```
╰─➤  sysctl net.inet.tcp.msl
net.inet.tcp.msl: 15000
```

Hence, that explain why over 10 seconds, my benchmark can only cap at 16k
requests.

## References

- [ruby - Why does a simple Thin server stop responding at 16500 requests when benchmarking? - Stack Overflow](https://stackoverflow.com/questions/9156537/why-does-a-simple-thin-server-stop-responding-at-16500-requests-when-benchmarkin)
- [Brian Pane » Blog Archive » Changing the length of the TIME_WAIT state on Mac OS X](http://web.archive.org/web/20090210151520/http://www.brianp.net/2008/10/03/changing-the-length-of-the-time_wait-state-on-mac-os-x/)
- [What is the purpose of TIME WAIT in TCP connection tear down? - Network Engineering Stack Exchange](https://networkengineering.stackexchange.com/questions/19581/what-is-the-purpose-of-time-wait-in-tcp-connection-tear-down)

