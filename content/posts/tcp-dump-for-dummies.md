---
title: "`tcpdump` for Dummies"
date: 2026-02-26T22:18:27+08:00
draft: true
---

There are times when you need to debug an issue in your HTTP service and realize that
your logs don't have enough information. One way to troubleshoot is to capture network traffic
and peek into request and response data.

Sounds hard? It isn't. You can do that with `tcpdump`, then analyze it with Wireshark or its CLI tool,
`tshark`, or ask your favorite LLM to inspect the captured traffic.

Here's a quick write-up on how to capture your HTTP traffic with `tcpdump` and filter it with `tshark`.

## Prerequisites

If you want to follow along, here are the tools we need:

- `tcpdump`
- `tshark`
- `jq`
- `python3` or anything that can spin up a web server.

Here's a minimal Python server implementation with a JSON endpoint, which we will use later when extracting JSON responses:

```python
from http.server import HTTPServer, BaseHTTPRequestHandler
import json

BOOKS = {
    "books": [
        {"name": "The Great Gatsby", "author": "F. Scott Fitzgerald"},
        {"name": "1984", "author": "George Orwell"},
    ]
}

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/books":
            body = json.dumps(BOOKS).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == "__main__":
    print("Server running at http://localhost:8080/books")
    HTTPServer(("localhost", 8080), Handler).serve_forever()
```

Save this as `server.py`, then run it with `python3 server.py`.
Use `curl localhost:8080/books` to simulate traffic with a JSON response.

## Capturing traffic

Capturing traffic with `tcpdump` is straightforward:

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

If you have a server running at port 8080 already, just run `curl localhost:8080` to see some output.

Most of the time, you'll want to capture and write this to a file. This can be achieved by appending `-w <filename>.pcap` to the previous command:

{{< terminal-session title="Write capture to a PCAP file" >}}
{{< terminal-command lang="bash" >}}
sudo tcpdump -i any port 8080 -w output.pcap
{{< /terminal-command >}}
{{< /terminal-session >}}

Now run `curl localhost:8080/books` or `curl localhost:8080` again. You'll notice that no console output is shown while capture is running.
Use Ctrl+C to stop capturing traffic.

```
tcpdump: data link type PKTAP
tcpdump: listening on any, link-type PKTAP (Apple DLT_PKTAP), snapshot length 524288 bytes
^C252 packets captured
8469 packets received by filter
0 packets dropped by kernel
```

You'll see a summary of how many packets were captured and received when it exits.

The output is in [PCAP (Packet Capture) file format](https://ietf-opsawg-wg.github.io/draft-ietf-opsawg-pcap/draft-ietf-opsawg-pcap.html). We'll need to use some tools to parse/read its content. Here comes `tshark`.

## Analyzing traffic

First of all, install `tshark` following the instructions [here](https://tshark.dev/setup/install/). Then, we can use `tshark` to show
the captured traffic:

{{< terminal-session title="Read captured traffic with tshark" >}}
{{< terminal-command lang="bash" >}}
# -r to specify file to read
tshark -r output.pcap
{{< /terminal-command >}}
{{< terminal-output lang="text" >}}
    1   0.000000          ::1 → ::1          TCP 88 61870 → 8080 [SYN] Seq=0 Win=65535 Len=0 MSS=16324 WS=64 TSval=1626974093 TSecr=0 SACK_PERM
   ... other logs ...
   18   0.000914    127.0.0.1 → 127.0.0.1    HTTP 56 HTTP/1.0 404 Not Found
   28   0.001073    127.0.0.1 → 127.0.0.1    TCP 56 [TCP Dup ACK 27#1] 8080 → 61871 [ACK] Seq=101 Ack=79 Win=408256 Len=0 TSval=2010179211 TSecr=2798382382
   31   0.700058          ::1 → ::1          TCP 64 8080 → 61872 [RST, ACK] Seq=1 Ack=1 Win=0 Len=0
   96   1.879874    127.0.0.1 → 127.0.0.1    HTTP 133 GET / HTTP/1.1
  185  91.584502    127.0.0.1 → 127.0.0.1    TCP 201 HTTP/1.0 200 OK
  252  93.730777    127.0.0.1 → 127.0.0.1    TCP 56 [TCP Dup ACK 251#1] 8080 → 61895 [ACK] Seq=101 Ack=79 Win=408256 Len=0 TSval=566993429 TSecr=4042384569
{{< /terminal-output >}}
{{< /terminal-session >}}

You can filter by protocol using `-Y`. For example, to show only captured HTTP traffic:

{{< terminal-session title="Filter only HTTP packets" >}}
{{< terminal-command lang="bash" >}}
# -Y stands for display filter.
tshark -r output.pcap -Y 'http'
{{< /terminal-command >}}
{{< terminal-output lang="text" >}}
12   0.000553    127.0.0.1 → 127.0.0.1    HTTP 133 GET / HTTP/1.1
18   0.000914    127.0.0.1 → 127.0.0.1    HTTP 56 HTTP/1.0 404 Not Found
40   0.700393    127.0.0.1 → 127.0.0.1    HTTP 133 GET / HTTP/1.1
47   0.700689    127.0.0.1 → 127.0.0.1    HTTP 56 HTTP/1.0 404 Not Found
67   1.287958    127.0.0.1 → 127.0.0.1    HTTP 133 GET / HTTP/1.1
74   1.288231    127.0.0.1 → 127.0.0.1    HTTP 56 HTTP/1.0 404 Not Found
96   1.879874    127.0.0.1 → 127.0.0.1    HTTP 133 GET / HTTP/1.1
102   1.880078    127.0.0.1 → 127.0.0.1    HTTP 56 HTTP/1.0 404 Not Found
125  90.198950    127.0.0.1 → 127.0.0.1    HTTP 138 GET /books HTTP/1.1
131  90.199257    127.0.0.1 → 127.0.0.1    HTTP/JSON 175 HTTP/1.0 200 OK , JSON (application/json)
151  91.029506    127.0.0.1 → 127.0.0.1    HTTP 138 GET /books HTTP/1.1
159  91.029810    127.0.0.1 → 127.0.0.1    HTTP/JSON 175 HTTP/1.0 200 OK , JSON (application/json)
179  91.584132    127.0.0.1 → 127.0.0.1    HTTP 138 GET /books HTTP/1.1
187  91.584540    127.0.0.1 → 127.0.0.1    HTTP/JSON 175 HTTP/1.0 200 OK , JSON (application/json)
209  92.069515    127.0.0.1 → 127.0.0.1    HTTP 138 GET /books HTTP/1.1
215  92.069889    127.0.0.1 → 127.0.0.1    HTTP/JSON 175 HTTP/1.0 200 OK , JSON (application/json)
237  93.730389    127.0.0.1 → 127.0.0.1    HTTP 133 GET / HTTP/1.1
243  93.730663    127.0.0.1 → 127.0.0.1    HTTP 56 HTTP/1.0 404 Not Found
{{< /terminal-output >}}
{{< /terminal-session >}}

Not very readable, right? We can configure the output format using `-T`:

{{< terminal-session title="Inspect tshark output formats" >}}
{{< terminal-command lang="bash" >}}
tshark --help
{{< /terminal-command >}}
{{< terminal-output lang="text" >}}
... here are the options we care about:
-T pdml|ps|psml|json|jsonraw|ek|tabs|text|fields|?
-j <protocolfilter>      protocols layers filter if -T ek|pdml|json selected
-J <protocolfilter>      top level protocol filter if -T ek|pdml|json selected
-e <field>               field to print if -Tfields selected (e.g. tcp.port,
-E<fieldsoption>=<value> set options for output when -Tfields selected:
--no-duplicate-keys      If -T json is specified, merge duplicate keys in an object
{{< /terminal-output >}}
{{< /terminal-session >}}

We can use `-T fields` in combination with `-e` to control which fields are printed.

{{< terminal-session title="Show selected HTTP fields" >}}
{{< terminal-command lang="bash" >}}
# -T is to configure the output.
# -e is to select the fields to print
tshark -r output.pcap -Y 'http' -T fields -e tcp.stream -e frame.time -e http.request.method -e http.request.uri -e http.response.code
{{< /terminal-command >}}
{{< terminal-output lang="text" >}}
1       2026-03-21T23:53:42.961078000+0800      GET     /
1       2026-03-21T23:53:42.961439000+0800              /       404
3       2026-03-21T23:53:43.660918000+0800      GET     /
3       2026-03-21T23:53:43.661214000+0800              /       404
5       2026-03-21T23:53:44.248483000+0800      GET     /
5       2026-03-21T23:53:44.248756000+0800              /       404
7       2026-03-21T23:53:44.840399000+0800      GET     /
7       2026-03-21T23:53:44.840603000+0800              /       404
9       2026-03-21T23:55:13.159475000+0800      GET     /books
9       2026-03-21T23:55:13.159782000+0800              /books  200
11      2026-03-21T23:55:13.990031000+0800      GET     /books
11      2026-03-21T23:55:13.990335000+0800              /books  200
13      2026-03-21T23:55:14.544657000+0800      GET     /books
13      2026-03-21T23:55:14.545065000+0800              /books  200
15      2026-03-21T23:55:15.030040000+0800      GET     /books
15      2026-03-21T23:55:15.030414000+0800              /books  200
17      2026-03-21T23:55:16.690914000+0800      GET     /
17      2026-03-21T23:55:16.691188000+0800              /       404
{{< /terminal-output >}}
{{< /terminal-session >}}

You can use `tshark -G fields` to see all available fields. It prints every available field, so you'll want
to filter it further using `rg` or `grep`:

{{< terminal-session title="Discover available tshark fields" >}}
{{< terminal-command lang="bash" >}}
tshark -G fields | rg "http\."
{{< /terminal-command >}}
{{< terminal-output lang="text" >}}
... here are some of the fields shown by the command:
F       Response        http.response   FT_BOOLEAN      http    0       0x0  true if HTTP response
F       Request http.request    FT_BOOLEAN      http    0       0x0     true if HTTP request
F       Response line   http.response.line      FT_STRING       http         0x0
F       Request line    http.request.line       FT_STRING       http         0x0
F       Request Method  http.request.method     FT_STRING       http         0x0      HTTP Request Method
F       Request URI     http.request.uri        FT_STRING       http         0x0      HTTP Request-URI
F       Request URI Path        http.request.uri.path   FT_STRING       http 0x0      HTTP Request-URI Path
F       Request URI Path Segment        http.request.uri.path.segment   FT_STRING     http            0x0
F       Request URI Query       http.request.uri.query  FT_STRING       http 0x0      HTTP Request-URI Query
F       Request URI Query Parameter     http.request.uri.query.parameter     FT_STRING        http            0x0     HTTP Request-URI Query Parameter
F       Request Version http.request.version    FT_STRING       http         0x0      HTTP Request HTTP-Version
F       Response Version        http.response.version   FT_STRING       http 0x0      HTTP Response HTTP-Version
F       Full request URI        http.request.full_uri   FT_STRING       http 0x0      The full requested URI (including host name)
F       Status Code     http.response.code      FT_UINT24       http    BASE_DEC      0x0     HTTP Response Status Code
F       Status Code Description http.response.code.desc FT_STRING       http 0x0      HTTP Response Status Code Description
F       Response Phrase http.response.phrase    FT_STRING       http         0x0      HTTP Response Reason Phrase
F       Authorization   http.authorization      FT_STRING       http         0x0      HTTP Authorization header
F       Content-Type    http.content_type       FT_STRING       http         0x0      HTTP Content-Type header
F       Content-Length  http.content_length_header      FT_STRING       http 0x0      HTTP Content-Length header
F       Content length  http.content_length     FT_UINT64       http    BASE_DEC      0x0
F       Content-Encoding        http.content_encoding   FT_STRING       http 0x0      HTTP Content-Encoding header
F       Transfer-Encoding       http.transfer_encoding  FT_STRING       http 0x0      HTTP Transfer-Encoding header
F       User-Agent      http.user_agent FT_STRING       http            0x0  HTTP User-Agent header
F       Host    http.host       FT_STRING       http            0x0     HTTP Host
F       Accept  http.accept     FT_STRING       http            0x0     HTTP Accept
F       Referer http.referer    FT_STRING       http            0x0     HTTP Referer
F       Accept-Language http.accept_language    FT_STRING       http         0x0      HTTP Accept Language
F       Accept Encoding http.accept_encoding    FT_STRING       http         0x0      HTTP Accept Encoding
F       Date    http.date       FT_STRING       http            0x0     HTTP Date
F       Server  http.server     FT_STRING       http            0x0     HTTP Server
F       Location        http.location   FT_STRING       http            0x0  HTTP Location
{{< /terminal-output >}}
{{< /terminal-session >}}

The `-Y` argument can also be used to filter output further. For example, we can use the following query
to show all traffic that has a 200 status code:

{{< terminal-session title="Filter by HTTP status code" >}}
{{< terminal-command lang="bash" >}}
tshark -r output.pcap -Y 'http.response.code == 200' -T fields -e tcp.stream -e frame.time -e http.request.method -e http.request.uri -e http.response.code
{{< /terminal-command >}}
{{< terminal-output lang="text" >}}
9       2026-03-21T23:55:13.159782000+0800              /books  200
11      2026-03-21T23:55:13.990335000+0800              /books  200
13      2026-03-21T23:55:14.545065000+0800              /books  200
15      2026-03-21T23:55:15.030414000+0800              /books  200
{{< /terminal-output >}}
{{< /terminal-session >}}

Or filter by a specific `tcp.stream`:

{{< terminal-session title="Filter by TCP stream" >}}
{{< terminal-command lang="bash" >}}
tshark -r output.pcap -Y 'tcp.stream == 9 and http'
{{< /terminal-command >}}
{{< terminal-output lang="text" >}}
125  90.198950    127.0.0.1 → 127.0.0.1    HTTP 138 GET /books HTTP/1.1
131  90.199257    127.0.0.1 → 127.0.0.1    HTTP/JSON 175 HTTP/1.0 200 OK , JSON (application/json)
{{< /terminal-output >}}
{{< /terminal-session >}}

## Dealing with JSON request/response

If the response body is JSON, `tshark` can output packet data as JSON (`-T json`), and `jq` can extract the fields you care about:

{{< terminal-session title="Extract JSON payload values with jq" >}}
{{< terminal-command lang="bash" >}}
tshark -r output.pcap -Y 'http.response.code == 200' -T json 2>/dev/null | jq -r '.[]._source.layers.json."json.object"'
{{< /terminal-command >}}
{{< terminal-output lang="json" >}}
{"books": [{"name": "The Great Gatsby", "author": "F. Scott Fitzgerald"}, {"name": "1984", "author": "George Orwell"}]}
{"books": [{"name": "The Great Gatsby", "author": "F. Scott Fitzgerald"}, {"name": "1984", "author": "George Orwell"}]}
{"books": [{"name": "The Great Gatsby", "author": "F. Scott Fitzgerald"}, {"name": "1984", "author": "George Orwell"}]}
{"books": [{"name": "The Great Gatsby", "author": "F. Scott Fitzgerald"}, {"name": "1984", "author": "George Orwell"}]}
{{< /terminal-output >}}
{{< /terminal-session >}}

### Conclusion

You can also capture traffic with `tshark`, but `tcpdump` is often the better choice on production or remote machines where installing a full Wireshark toolchain is less practical.
