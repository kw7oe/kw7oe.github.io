---
title: "Register in Vim"
date: 2017-10-24T22:05:00+0800
tags: ["vim"]
aliases: ["/vim/2017/10/24/register-in-vim.html"]
---

For the past months, I have started to use `vim` in some occasions. One day, I came across a vim video, ["Let Vim Do the Typing"](https://www.youtube.com/watch?v=3TX3kV3TICU){:target="\_blank"}, and discover the use of **register** in `vim`. Basically, the concept of register in `vim` is very similar to the register in our computer. It is a temporary memory space for `vim` to store text.

### How to use it?

In normal mode, `"r` will allow us to select the register `r`. The charcter after `"` is the register you selected. You can choose any register you like from `a-z`.To check the content of every register, use the command `:reg`. For specific registers, just provide the register name as arguments to the command, e.g `:reg r`.

In insert mode, you can insert the content of a register by `Ctrl-r` + `r`. You'll notice the current cursor will turn into `"` when `Ctrl-r` is pressed.

### Basic Usage

We can copy any text and save it to a specific register, which persists even after `vim` is quit. For example, we can yanked/copy current link and store to register `e` by `"eyy`.

We can also paste the content of register `e` by `"ep`. Or, go into insert mode and `Ctrl-r` + `e` to paste the content of the selected register.

### Wrapping Up

This is just a basic introduction of register in `vim`. There is still a lots of details and usage of register I didn't cover in this post. For more details, feel free to refer to the resources below:

- [Vim registers: The basics and beyond](http://www.brianstorti.com/vim-registers/){:target="\_blank"}
- [How do I use vim registers?](https://stackoverflow.com/questions/1497958/how-do-i-use-vim-registers){:target="\_blank"}
