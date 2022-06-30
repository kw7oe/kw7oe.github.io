---
title: "Adding new rules to iptables"
date: 2022-06-30T12:50:46+08:00
draft: true
---

A while ago, I was trying to deploy a `ngrok` liked [reverse proxy
I implemented](https://github.com/kw7oe/rok) during my time in the Recurse Center to my DigitalOcean droplet.

Since my implementation require to listen to different ports for different
client, I'll need to expose those ports in my remote server in DigitalOcean.

Long story short, it took me a while to figure out that by default DigitalOcean
use `iptables` to block any incoming traffic from other ports.

We can verify this by using the following `iptables` command:

```bash
kai@do:~$ sudo iptables --list
Chain INPUT (policy ACCEPT)
target     prot opt source     destination
ACCEPT     all  --  anywhere   anywhere
ACCEPT     tcp  --  anywhere   anywhere   tcp dpt:ssh
ACCEPT     tcp  --  anywhere   anywhere   tcp dpt:http
ACCEPT     tcp  --  anywhere   anywhere   tcp dpt:https
ACCEPT     icmp --  anywhere   anywhere
ACCEPT     udp  --  anywhere   anywhere   udp spt:ntp
ACCEPT     all  --  anywhere   anywhere   state RELATED,ESTABLISHED
LOG        all  --  anywhere   anywhere   limit: avg 15/min burst 5 LOG level debug prefix "Dropped by firewall: "
DROP       all  --  anywhere   anywhere
```

As you can see, some of the ports allowed are for the `ssh`, `http` and `https`
protocol. To expose other ports, we need to add a new rule under the `INPUT`
chain:

```bash
sudo iptables -I INPUT -p tcp -m tcp --dport 3001 -j ACCEPT
```

With this change, now I could reach the service I'm running on port 3001 by
specifiying the port number by the end of the url:

```
psychic-guide.example.com:3001
```

This is still needed as by default port 80 is used for `http`.
If you would like to learn more about `iptables`, DigitalOcean
have some good resources:

- [Iptables Essentials: Common Firewall Rules and Commands](https://www.digitalocean.com/community/tutorials/iptables-essentials-common-firewall-rules-and-commands)
- [How To List and Delete Iptables Firewall Rules](https://www.digitalocean.com/community/tutorials/how-to-list-and-delete-iptables-firewall-rules)
