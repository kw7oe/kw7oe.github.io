---
title: "Things I learn while testing files in Rust"
date: 2022-05-20T21:09:09+08:00
tags: ["rust", "testing", "files"]
---

Dealing with files while running tests in Rust can be tricky,
namely running the tests concurrently and dealing with file clean up when a
test fail or panic halfway.

## Concurrency

By default, `cargo test` run your Rust tests in multiple threads.
Depending on your tests, if you're using the same filename in multiple test
cases, it might caused unexpected failures.

The easiest way to overcome this is to limit `cargo test` to run only on a
single thread:

```sh
cargo test -- --test-threads=1
```

However, this will caused your `cargo test` to takes longer time to complete.
To overcome this, use a different filename in each of your
test cases. It can be done dynamically in a thread safe manner utilizing the
current thread information:

```rust
filename = format!("file-{:?}", std::thread::current().id());
// file-ThreadId(1)
```

At the time of writing, the
[`ThreadId`](https://doc.rust-lang.org/std/thread/struct.ThreadId.html) can
only be typecast to `u64` with `as_u64()` in the nightly version.

## File clean up

In general, file clean up can be achieve by calling `std::fs::remove_file` at
the end of each test case:

```rust
let _ = std::fs::remove_file(format!("test-{:?}.db", std::thread::current().id()));
```

However, there will be sometime where you're working on the correct
implementation and running the tests might caused panic and thus not calling
the file clean up code as expected.

We can overcome this by setting up a custom panic hook with
[`std::panic::set_hook`](https://doc.rust-lang.org/std/panic/fn.set_hook.html):

```rust
std::panic::set_hook(Box::new(|p| {
  let _ = std::fs::remove_file(format!("test-{:?}.db", std::thread::current().id()));
  println!("{p}");
}));
```

We are calling `println!("{p}")` again to mimic the default panic behaviour. I
learn about this thanks to [this topic in Rust forum](https://users.rust-lang.org/t/cleaning-up-after-test-failure/15840/6).
