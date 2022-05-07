---
title: "Logging Thread ID in Rust"
date: 2022-05-07T15:14:16+0800
tags: ["rust"]
---

Recently, I am working on implementing concurrent operations for B+ Tree
index in Rust. Dealing with concurrency bugs can be pain in the ass and
and being able to print the thread ID along with by my debug message definitely
help me understand the interleaving operations better.

Here I'm going to share how I do it.

### Env Logger

I was using [`env_logger`](https://docs.rs/env_logger/latest/env_logger/) to
log my message. Upon realizing that `std::thread::current()` allow me to get
the information of the current thread executing my code, and it have the `id()`
method, I start to inject the info into my log as needed:

```rust
let thread_id = std::thread::current().id();
info!("{}: fetch page {page_id}", thread_id);
```

Soon, I realize that I can format the log records by default
using the `Builder::format` method. So I ended up with this:

```rust
use std::io::Write;

env_logger::builder()
    .format(|buf, record| {
        let ts = buf.timestamp_micros();
        writeln!(
            buf,
            "{}: {:?}: {}: {}",
            ts,
            std::thread::current().id(),
            buf.default_level_style(record.level())
                .value(record.level()),
            record.args()
        )
    })
    .init();
```

which will log my message in the following format:

```
2022-05-07T07:26:33.119900Z: ThreadId(7): INFO: fetch page 1
```

### Tracing

Later on, I switch to using [`tracing`](https://github.com/tokio-rs/tracing)
and the setup is much simpler as follow:

```rust
let format = tracing_subscriber::fmt::format().with_thread_ids(true);
tracing_subscriber::fmt().event_format(format).init();
```

It turns out `tracing_subscriber` formatter come with the `with_thread_ids`
method to include your thread id in your logs once set to `true`. Here's
how the messsage look like:

```
May 07 15:38:42.197  INFO ThreadId(01) sqlite::table::test: fetch page 1
```

There are more configuration methods that might be useful for you such as `with_thread_names`,
so do have a look at the
[documentation](https://docs.rs/tracing-subscriber/latest/tracing_subscriber/fmt/struct.SubscriberBuilder.html)!
