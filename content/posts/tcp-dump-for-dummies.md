---
title: "`tcpdump` for Dummies"
date: 2026-02-26T22:18:27+08:00
draft: true
---

There's time where you want to debug an issue in your HTTP service, and you realized that
your logs doesn't have sufficient information. Well, one of the way is to capture the network traffic
and peak into the requests and response data.

Sounds hard? It isn't. You can just do that with `tcpdump` and then analysing it with Wireshark or it's CLI tool
`tshark`, or ask your favourite LLM to look at the captured traffic and analyse it.

Here's a quick write up on how to capture your HTTP traffic with `tcpdump` and filter it with `tshark`

{{% callout title="Run a simple server to learn along!" class="info" %}}

You can run a minmal web server with python using the following command:
<code>python3 -m http.server 8080</code>, and simulate some traffic with
<code> curl localhost:8080</code>.
{{% /callout %}}

### Capturing traffic

Capturing traffic with `tcpdump` is really straightforward :

{{< terminal-session title="Capture traffic with tcpdump" >}}
{{< terminal-command lang="bash" >}}
# Capturing traffic on port 8080 on any network interface (-i any)
sudo tcpdump -i any port 8080
{{< /terminal-command >}}
{{< terminal-output lang="text" >}}
00:13:14.371043 IP6 localhost.63752 > localhost.http-alt: Flags [S], seq 323445184, win 65535, options [mss 16324,nop,wscale 6,nop,nop,TS val 2380711463 ecr 0,sackOK,eol], length 0
00:13:14.371070 IP6 localhost.63752 > localhost.http-alt: Flags [S], seq 323445184, win 65535, options [mss 16324,nop,wscale 6,nop,nop,TS val 2380711463 ecr 0,sackOK,eol], length 0
00:13:14.371224 IP6 localhost.http-alt > localhost.63752: Flags [S.], seq 3793703022, ack 323445185, win 65535, options [mss 16324,nop,wscale 6,nop,nop,TS val 3134725266 ecr 2380711463,sackOK,eol], length 0
00:13:14.371234 IP6 localhost.http-alt > localhost.63752: Flags [S.], seq 3793703022, ack 323445185, win 65535, options [mss 16324,nop,wscale 6,nop,nop,TS val 3134725266 ecr 2380711463,sackOK,eol], length 0
# ... more logs
00:13:14.372125 IP6 localhost.http-alt > localhost.63752: Flags [.], ack 79, win 6371, options [nop,nop,TS val 3134725267 ecr 2380711464], length 0         00:13:14.372129 IP6 localhost.http-alt > localhost.63752: Flags [.], ack 79, win 6371, options [nop,nop,TS val 3134725267 ecr 2380711464], length 0
{{< /terminal-output >}}
{{< /terminal-session >}}

Most of the time, you'll want to capture and write this to a file. This can be achieved by appending `-w <filename>.pcap` to the previous command:

{{< terminal-session title="Write capture to a PCAP file" >}}
{{< terminal-command lang="bash" >}}
sudo tcpdump -i any port 8080 -w output.pcap
{{< /terminal-command >}}
{{< terminal-output lang="text" >}}
No console output is shown while capture is running.
Press Ctrl+C to stop and save `output.pcap`.
{{< /terminal-output >}}
{{< /terminal-session >}}

The output is in the [PCAP (Packet Capture) file format](https://ietf-opsawg-wg.github.io/draft-ietf-opsawg-pcap/draft-ietf-opsawg-pcap.html). You'll need to use some tools to parse/read its content.
Here comes `tshark`.

### Analyzing traffic

First of all, install `tshark` following the instructions [here](https://tshark.dev/setup/install/). Then, we can use `tshark` to show
the captured traffic:

{{< terminal-session title="Read captured traffic with tshark" >}}
{{< terminal-command lang="bash" >}}
# -r to specify file to read
tshark -r output.pcap
{{< /terminal-command >}}
{{< terminal-output lang="text" >}}
1   0.000000          ::1 → ::1          TCP 88 63852 → 8080 [SYN] Seq=0 Win=65535 Len=0 MSS=16324 WS=64 TSval=3730493114 TSecr=0 SACK_PERM
... other logs
9   0.000277          ::1 → ::1          HTTP 153 GET / HTTP/1.1
37   0.659747          ::1 → ::1          TCP 232 HTTP/1.0 200 OK
38   0.659767          ::1 → ::1          TCP 232 [TCP Retransmission] 8080 → 63853 [PSH, ACK] Seq=1 Ack=78 Win=407744 Len=156 TSval=2221337942 TSecr=1134574678
39   0.659779          ::1 → ::1          HTTP 1278 HTTP/1.0 200 OK  (text/html)
40   0.659791          ::1 → ::1          TCP 76 63853 → 8080 [ACK] Seq=78 Ack=157 Win=407680 Len=0 TSval=1134574679 TSecr=2221337942
63   1.265045          ::1 → ::1          HTTP 1278 HTTP/1.0 200 OK  (text/html)
... other logs
72   1.265234          ::1 → ::1          TCP 76 [TCP Dup ACK 71#1] 8080 → 63854 [ACK] Seq=1360 Ack=79 Win=407744 Len=0 TSval=3320954713 TSecr=3304093684
{{< /terminal-output >}}
{{< /terminal-session >}}

You could filter it by the protocol using `-Y`. For example, to only show HTTP traffic capture:

{{< terminal-session title="Filter only HTTP packets" >}}
{{< terminal-command lang="bash" >}}
# -Y stands for display filter.
tshark -r output.pcap -Y 'http'
{{< /terminal-command >}}
{{< terminal-output lang="text" >}}
9    0.000277 ::1 → ::1 HTTP 153 GET / HTTP/1.1
15   0.001157 ::1 → ::1 HTTP 1278 HTTP/1.0 200 OK (text/html)
33   0.659044 ::1 → ::1 HTTP 153 GET / HTTP/1.1
39   0.659779 ::1 → ::1 HTTP 1278 HTTP/1.0 200 OK (text/html)
57   1.264089 ::1 → ::1 HTTP 153 GET / HTTP/1.1
63   1.265045 ::1 → ::1 HTTP 1278 HTTP/1.0 200 OK (text/html)
{{< /terminal-output >}}
{{< /terminal-session >}}

Not very readable right? We could configure the output format using `-T`:

{{< terminal-session title="Inspect tshark output formats" >}}
{{< terminal-command lang="bash" >}}
tshark --help
{{< /terminal-command >}}
{{< terminal-output lang="text" >}}
-T pdml|ps|psml|json|jsonraw|ek|tabs|text|fields|?
-j <protocolfilter>      protocols layers filter if -T ek|pdml|json selected
-J <protocolfilter>      top level protocol filter if -T ek|pdml|json selected
-e <field>               field to print if -Tfields selected (e.g. tcp.port,
-E<fieldsoption>=<value> set options for output when -Tfields selected:
--no-duplicate-keys      If -T json is specified, merge duplicate keys in an object
{{< /terminal-output >}}
{{< /terminal-session >}}

We can use `-T fields` in combination of `-e` to  further configure which field to be output

{{< terminal-session title="Show selected HTTP fields" >}}
{{< terminal-command lang="bash" >}}
# -T is to configure the output.
# -e is to select the fields to print
tshark -r output.pcap -Y 'http' -T fields -e tcp.stream -e frame.time -e http.request.method -e http.request.uri -e http.response.code
{{< /terminal-command >}}
{{< terminal-output lang="text" >}}
0       2026-03-15T00:31:15.719233000+0800      GET     /
0       2026-03-15T00:31:15.720113000+0800              /       200
1       2026-03-15T00:31:16.378000000+0800      GET     /
1       2026-03-15T00:31:16.378735000+0800              /       200
2       2026-03-15T00:31:16.983045000+0800      GET     /
2       2026-03-15T00:31:16.984001000+0800              /       200
{{< /terminal-output >}}
{{< /terminal-session >}}

You can use `tshark -G fields` to see all the available fields. It prints out every fields available, so you'll want
to filter it further using `rg` or `grep`:

{{< terminal-session title="Discover available tshark fields" >}}
{{< terminal-command lang="bash" >}}
tshark -G fields | rg "http\."
{{< /terminal-command >}}
{{< terminal-output lang="text" >}}
The command prints many matching field definitions.
Use it to discover valid values for `-e` and `-Y` filters.
{{< /terminal-output >}}
{{< /terminal-session >}}

The `-Y` argument can also be used to fitler the output futher. For example, we can use the following query
to show all the traffic that have 200 status code:

{{< terminal-session title="Filter by HTTP status code" >}}
{{< terminal-command lang="bash" >}}
tshark -r output.pcap -Y 'http.response.code == 200' -T fields -e tcp.stream -e frame.time -e http.request.method -e http.request.uri -e http.response.code
{{< /terminal-command >}}
{{< terminal-output lang="text" >}}
0       2026-03-15T00:31:15.720113000+0800              /       200
1       2026-03-15T00:31:16.378735000+0800              /       200
2       2026-03-15T00:31:16.984001000+0800              /       200
{{< /terminal-output >}}
{{< /terminal-session >}}

Or filter by a specific `tcp.stream`:

{{< terminal-session title="Filter by TCP stream" >}}
{{< terminal-command lang="bash" >}}
tshark -r output.pcap -Y 'tcp.stream == 0 and http'
{{< /terminal-command >}}
{{< terminal-output lang="text" >}}
9   0.000277          ::1 → ::1          HTTP 153 GET / HTTP/1.1
15   0.001157          ::1 → ::1          HTTP 1278 HTTP/1.0 200 OK  (text/html)
{{< /terminal-output >}}
{{< /terminal-session >}}

{{< terminal-session title="Extract JSON payload values with jq" >}}
{{< terminal-command lang="bash" >}}
tshark -r output.pcap -Y 'http.response.code == 200' -T json 2>/dev/null | jq -r '.[]._source.layers.json."json.object"'
{{< /terminal-command >}}
{{< terminal-output lang="text" >}}
Outputs one parsed JSON object per matching response.
{{< /terminal-output >}}
{{< /terminal-session >}}

### Conclusion

You can also use `tshark` to capture the traffic but considering that you might want to do this in a production
environment or remote machine, where installing it is not very viable.
