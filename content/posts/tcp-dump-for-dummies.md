---
title: "`tcpdump` for Dummies"
date: 2026-02-26T22:18:27+08:00
draft: true
---

Capturing traffic that bind to any network interfaces on port 4000 and writing the output
to the `output.pcap` file:

```bash
sudo tcpdump -i any port 4000 -w output.pcap
```

To analyze it, you'll need to use `tshark`, the CLI from Wireshark.

Here's an example command to show HTTP traffice from the captured output:

```bash
# -Y is tp filter
# -T is to configure the output. -T fields means we want to print the selected fields configured in -e
# -e is to select the fields to print
tshark -r output.pcap -Y 'http' -T fields -e tcp.stream -e frame.time -e http.request.method -e http.request.uri -e http.response.code
```

Here's the result:

```
1  2026-02-26T22:30:08.699875000+0800  GET  /
1  2026-02-26T22:30:08.747827000+0800       /  200
3  2026-02-26T22:30:09.281135000+0800  GET  /
3  2026-02-26T22:30:09.328320000+0800       /  200
5  2026-02-26T22:30:09.845938000+0800  GET  /
5  2026-02-26T22:30:09.892111000+0800       /  200
```

You can use `tshark -G fields` to see all the available fields. It prints out every fields available, so you'll want
to filter it further using `rg` or `grep`:

```bash
tshark -G fields | rg "http\."
```

You can also use `tshark` to capture the traffic but considering that you might want to do this in a production
environment or remote machine, where installing it is not very viable.

```bash
tshark -r output.pcap -Y 'http.response.code == 200' -T json 2>/dev/null | jq -r '.[]._source.layers.json."json.object"'
```
