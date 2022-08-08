---
title: "Debugging Rust With `rust-lldb`"
date: 2022-07-20T10:18:40+08:00
draft: true
---

During my time in Recurse Center recently, I was implementing a multi-threaded
B+ tree index in Rust. I was implementing a well known algorithm to support
concurrent operations in B+ Tree index called latch crabbing. The gists of it is:

> Traversing from root to leaf node, hold the parent lock if and only if
a split or merge operation might occur.

The algorithm sounds pretty straightforward but implementing it is another story,
especially for someone who's quite new to concurrent programming.

Throughout the process, I faced tons of deadlock and stack overflow _(due to
infinite retry, hoping that a lock will be released)_. At first, I was debugging it
mainly through lots of logging. I logged the operation name and state before and after
certain operations to find out where it is blocked and what caused the
deadlock. Since, I'm a really good print debugger, I never felt the need to use
a proper debugger.

Until, one of the batch mate from Recurse Center offer to pair with me and
suggested that I used a debugger. Since I had previously tried using
`rust-lldb` to look at the stack trace of a stack overflow execution, we
decided to use `rust-lldb` as our debugger.

Turns out, it's really pretty handy for debugging concurrency problems. But,
support of `lldb` on Rust has it's own limitation. So, a few occasion
of my debugging fallback to using logging.

## How to add specific breakpoint on my code?

A trick I use is to add a conditional that just `print` stuff, so I could later
set a breakpoint in the debugger. For example, if I don't want the
breakpoint to be trigger every time a test case passed:

```rust {linenos=inline,hl_lines=5,linenostart=199}
let result = do_something();
let expected_result = expected_result();

if result != expected_result {
  println!("oops");
}

assert_eq!(result, expected_result);
```

Then later, in my `rust-lldb`, I could set a breakpoint on line 203
specifically before running it:

```
breakpoint set --file "src/table.rs" --line=203
```


## TLDR

In terminal

```bash
rust-lldb -- target/debug/deps/sqlite-62c42937f3d7c32e concurrent_delete_and_select
```

In `rust-lldb` console:

```bash
run

# Ctrl + C to stop execution at any point of time

# List all running threads
thread list

# Switch the context to thread <thread_id>
thread select <thread_id>

# Show the backtrace of the current thread
bt

# Show all backtrace
bt all

# Jump to a specific frame in the backtrace
frame select 30

# View all variable in a particular frame
frame variable

# Set a specific breakpoint
breakpoint set --file "src/table.rs" --line=773

# Print the content of a variable
p variable_name
```


## Limitation

`Option`, or any sort of `Enum` type can't be printed in `rust-lldb`.


## References

https://lldb.llvm.org/use/map.html

