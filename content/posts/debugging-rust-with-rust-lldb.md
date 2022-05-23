---
title: "Debugging Rust With `rust-lldb`"
date: 2022-05-23T12:18:40+08:00
draft: true
---

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

