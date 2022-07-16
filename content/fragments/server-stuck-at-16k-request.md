---
title: "Server Stuck at 16k Request"
date: 2022-07-09T21:53:53+08:00
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

It get capped at 16k requests, regardless of how many time I ran it.

## Investigation

Core ideas:

- Discover that those TCP connection is in TIME_WAIT state.
- Why it can't be reused?
- Talk about `netstat`.
- Why stuck at 16k requests?
- There's a limit of empheral ports.
- Talk about `sysctl`

I spent some of my time to research further and turn out that:

There's a limit of ephemeral port. Every time our `TcpListener` accept a new connection, it will
use one of the ephemeral port. The range of the ports can be obtained by
running `sysctl`:

```bash
╰─➤  sudo sysctl net.inet.ip.portrange.hifirst
net.inet.ip.portrange.hifirst: 49152
╰─➤  sudo sysctl net.inet.ip.portrange.hilast
net.inet.ip.portrange.hilast: 65535
```

By default, my machine have a total of around 16k ephemeral ports available to
be used. So that explain partly why I'm getting stucked at 16k requests during
benchmarking.

But here come's the question:

> aren't we closing the ports after a request is served?

Yes. If that's the case, why the ports aren't avaiable to be used?

It turn out that, according to the TCP spec, once a socket is close, it will go into `TIME_WAIT` phase.
In the `TIME_WAIT` phase, the connection is still kept around to deal with
delayed packets.

By default, the `TIME_WAIT` phase will wait for `2 * MSL time`. This can be set through the `net.inet.tcp.msl`
with `sysctl` as well.

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
- [tcp - What could cause so many TIME_WAIT connections to be open? - Stack Overflow](https://stackoverflow.com/questions/33177370/what-could-cause-so-many-time-wait-connections-to-be-open)
- [Coping with the TCP TIME-WAIT state on busy Linux servers](https://vincent.bernat.ch/en/blog/2014-tcp-time-wait-state-linux)
