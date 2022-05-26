---
title: "Handy `lsof` command to know"
date: 2022-05-26T17:32:46+08:00
draft: true
---

When working with lower level network programming, we often want to know the information
about our OS network connections. There are a couple of command line that can
help us to achieve that like `netstat`, `ss` and `lsof`.

`netstat` is one of the commonly used command line, available on almost
every OS, however, it's really hard to learn it. While `ss` is splendid to use,
unfortunately, it's not available for MacOS. That left us with `lsof`, which is
short of `list open files`.

So, let me share some of the `lsof` options I found useful day to day.

### `lsof -i :<PORT>`

List all the network connection on port `<PORT>`. Example:

```bash
# List all connection listening or connecting to port 1313

╰─➤  lsof -i :1313
COMMAND   PID USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
firefox   771  kai   48u  IPv4 0x2eddb902ae36cf51      0t0  TCP localhost:64030->localhost:bmc_patroldb (ESTABLISHED)
firefox   771  kai   93u  IPv4 0x2eddb902aa4dd9e1      0t0  TCP localhost:64021->localhost:bmc_patroldb (ESTABLISHED)
hugo    32849  kai    7u  IPv4 0x2eddb902b289fa31      0t0  TCP localhost:bmc_patroldb (LISTEN)
hugo    32849  kai  118u  IPv4 0x2eddb902a91a84c1      0t0  TCP localhost:bmc_patroldb->localhost:64021 (ESTABLISHED)
hugo    32849  kai  127u  IPv4 0x2eddb902a8f6d9e1      0t0  TCP localhost:bmc_patroldb->localhost:64030 (ESTABLISHED)
```

How about multiple ports? Or a range of ports? Or does it support wildcard?

Turns out that `lsof -i` support more than just a single port. It support
taking in a range of ports `-i :3000-4000` or multiple ports `-i :300,4000`. As
far as I know, wildcard seems to be not supported but I might be wrong. Here's
some demonstration:

```bash
# Listing port numbers from 3001 to 4000

╰─➤  lsof -P -i :3001-4000 -s TCP:LISTEN
COMMAND    PID USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
rapportd   519  kai   11u  IPv4 0x2eddb9077fb98929      0t0  UDP *:3722
server   72892  kai    9u  IPv4 0x2eddb902a7186511      0t0  TCP localhost:3001 (LISTEN)
server   72892  kai   12u  IPv4 0x2eddb902ad6e2511      0t0  TCP localhost:3004 (LISTEN)
server   72892  kai   15u  IPv4 0x2eddb902ae8299e1      0t0  TCP localhost:3003 (LISTEN)
beam.smp 72915  kai   53u  IPv4 0x2eddb902b1b44f51      0t0  TCP localhost:4000 (LISTEN)

# Listing only port numbers 3001 and 4000

╰─➤  lsof -P -i :3001,4000 -s TCP:LISTEN
COMMAND    PID USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
server   72892  kai    9u  IPv4 0x2eddb902a7186511      0t0  TCP localhost:3001 (LISTEN)
beam.smp 72915  kai   53u  IPv4 0x2eddb902b1b44f51      0t0  TCP localhost:4000 (LISTEN)
```

Wait, what is `-s TCP:LISTEN` and `-P`? That's what we are going to cover next.


### `lsof -i :<PORT> -s TCP:LISTEN`

List the TCP connection that is listening to `<PORT>`.
This filter out connections that are connecting to `PORT`
as clients. Example:

```bash
# List the connection listening to port 1313.

╰─➤  lsof -i :1313 -s TCP:LISTEN
COMMAND   PID USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
hugo    32849  kai    7u  IPv4 0x2eddb902b289fa31      0t0  TCP localhost:bmc_patroldb (LISTEN)
```

Notice that, there's not `1313` anywhere in our result! That's because `hugo`
use the port name `bmc_patroldb` instead of port number!

{{% callout title="How is port name defined?" %}}

Based on what I found [here][0] on StackExchange, the port name is defined in our `/etc/services`. Here's how my `/etc/services` files looks like:

```
#			   Don Stedman <dones@stisystems.com>
bmc_patroldb    1313/udp    # BMC_PATROLDB
bmc_patroldb    1313/tcp    # BMC_PATROLDB
```

Hence, `bmc_patroldb` is shown instead of the port number.

{{% /callout %}}

So, the next command will be come in handy if you would like to prevent that
conversion from happening.

### `lsof -P`

This basically prevent the conversion of port numbers to port names. Here's
what the `man` page said:

> inhibits the conversion of port numbers to port names for network files.

By combining the above command with `-P` here's what we can get:

```bash
╰─➤  lsof -P -i :1313 -s TCP:LISTEN
COMMAND   PID USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
hugo    32849  kai    7u  IPv4 0x2eddb902b289fa31      0t0  TCP localhost:1313 (LISTEN)
```

[0]: https://unix.stackexchange.com/questions/611406/how-to-assign-a-friendly-name-to-a-port-number-in-linux
