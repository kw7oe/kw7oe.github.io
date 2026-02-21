---
title: "Unblock 0.0.0.0 Connections on macOS via CLI"
date: 2026-02-20T22:12:20+08:00
draft: false
---

You are running a web server on a remote machine, binding to `0.0.0.0`. You tried
to access it through tailscale, but it takes forever to load.

This happens because, the first time you bind your server to `0.0.0.0`, it is
blocked by the MacOS Application Firewall by default.

If you have access to the GUI, there'll be a popup to prompt you to allow
the connections.

However, since we are remotely accessing our machine and
don't have access to the GUI, we'll need to allow it programmatically through
running some CLI command.

This can be achieved through the `socketfilterfw` command.

## Solution

To unblock it, just add the application to the firewall through the following
command:

```bash
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add <path_to_binary>
```

To find out the path, you could use[^1]:

```bash
lsof -i :<port> | awk 'FNR==2{ print $2 }' | xargs ps | awk 'FNR==2{ print $5 }'
```

You could verify what applications are enabled with:

```bash
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --list
```

For example, here's the output from my machine:

```
❯ sudo /usr/libexec/ApplicationFirewall/socketfilterfw --list
Password:
Total number of apps = 28
1 : /nix/store/g5bv4gi6p7ryhs2hbaryxs6ivsxa6lqc-nodejs-22.14.0/bin/node
             (Allow incoming connections)
2 : /usr/libexec/audioclocksyncd
             (Allow incoming connections)
3 : /usr/libexec/ContinuityCaptureAgent
             (Allow incoming connections)
4 : /Users/kai/Library/Arduino15/packages/builtin/tools/mdns-discovery/1.0.12/mdns-discovery
             (Allow incoming connections)
5 : /opt/homebrew/Cellar/nmap/7.98/bin/nmap
         (Allow incoming connections)
```

## Example

For example, the first time you start a web server through `python3` with the
following command:

```bash
python3 -m http.server 8888 --bind 0.0.0.0
```

and try to `curl` it with tailscale ip:


```bash
curl 100.123.119.12:8888
```

It would takes forever to load.

To fix this, we first extract the binary path by using the following command:


```bash
# replace :8888 with your webserver port.
❯ lsof -i :8888 | awk 'FNR==2{ print $2 }' | xargs ps | awk 'FNR==2{ print $5 }'
/opt/homebrew/Cellar/python@3.14/3.14.2/Frameworks/Python.framework/Versions/3.14/Resources/Python.app/Contents/MacOS/Python
```

Then, run the following command to allow it in the firewall:

```bash
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /opt/homebrew/Cellar/python@3.14/3.14.2/Frameworks/Python.framework/Versions/3.14/Resources/Python.app/Contents/MacOS/Python
```

That's it. Hope this helps!

[^1]: For a detailed explanation of the `awk` command and how it extracts the file path, see [Using AWK to extract generated file from jekyll-compose]({{< ref "2018-09-09-using-awk-to-extract-generated-file-from-jekyll-compose.md" >}}).
