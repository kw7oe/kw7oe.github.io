---
title: "Writing a custom Vim Command"
date: 2022-04-26T19:27:35+08:00
draft: true
tags: ["vim"]
---

Recently I have been implementing B+ Tree on disk in Rust, and require to inspect
the data structure a lot while debugging. So a lot of time, I'll be print
debugging:

```rust
println!("{:?}", node);
```

Since B+ Tree operations often involve several phases, I have to do this a lot
of time. Depending on which operation I'm implementing, I might need to print
at different line. It felt really repetitive to do that.

Hence, I decided to write a `vim` command to insert the `println!` code
snippet! By the end of this short post, we will have a `:Rd` _(Rust debug)_ command
that take it a argument and output the print statement.

```vimrc
:Rd node
"=> will insert println!("{:?}", node) into our file.
```

## What is a command?

Before we go into writing our own `vim` command, let's briefly talk about
what's even a command in `vim`. A command is basically, the thing you run by
using `:`. One of the example is `vim-fugitive` command:

```vim
:Git diff
```

A user-defined command  always start with a capital letter.

## Defining a command

It turns out defining a command is pretty straightforward, by using the
`:command` command. From `:help command`:

```vim
:com[mand][!] [{attr}...] {cmd} {repl}
			Define a user command.  The name of the command is
			{cmd} and its replacement text is {repl}.  The
			command's attributes (see below) are {attr}.  If the
			command already exists, an error is reported, unless a
			! is specified, in which case the command is
			redefined.  There is one exception: When sourcing a
			script again, a command that was previously defined in
			that script will be silently replaced.
```

So let's define a simple command. Add the following to the end of your `.vimrc`:

```vimrc
:command MyCommand echo "Hello World"
```

After that, we can open up our `vim` and run `:MyCommand` and it should show in
the space where we insert our command:

```
Hello World
```

Good start, but not what we want. We want the command to be inserting text into
our current file.

## Command to insert text

If we want to insert text, we will need to use the `:put` command, which is the
`p` in normal mode.

```vimrc
:command MyCommand put "Hello World"
```

But this doesn't work as expected, running `:MyCommand` will just paste the
previously yanked text. Here's what's the docs said from `:help put`:

```
:[line]pu[t] [x]
      Put the text [from register x] after [line] (default
			current line).  This always works |linewise|, thus
			this command can be used to put a yanked block as new
			lines.
			If no register is specified, it depends on the 'cb'
			option: If 'cb' contains "unnamedplus", paste from the
			+ register |quoteplus|.  Otherwise, if 'cb' contains
			"unnamed", paste from the * register |quotestar|.
			Otherwise, paste from the unnamed register
			|quote_quote|.
```

Since we didn't specified any register, it's pasting content from our `""`
register, which is the unnamed register.

To paste an expression, we will need to use the expression register `"=`, as
mentioned in the docs:

```
:[line]pu[t] [x]
            ....

			The register can also be '=' followed by an optional
			expression.  The expression continues until the end of
			the command.  You need to escape the '|' and '"'
			characters to prevent them from terminating the
			command.  Example: >
				:put ='path' . \",/test\"
			If there is no expression after '=', Vim uses the
			previous expression.  You can see it with ":dis =".

```

So, let's fix our previous mistake:

```vimrc
:command MyCommand put ='Hello World'
```

## Taking in argument in our command

To take in command in our custom `vim` command, we will need to specify the
attribute while defining our command. Here's the documentation from `:help
command`:

```
Argument handling ~                         *E175* *E176* *:command-nargs*
By default, a user defined command will take no arguments (and an error is
reported if any are supplied).  However, it is possible to specify that the
command can take arguments, using the -nargs attribute.  Valid cases are:

	-nargs=0    No arguments are allowed (the default)
	-nargs=1    Exactly one argument is required, it includes spaces
	-nargs=*    Any number of arguments are allowed (0, 1, or many),
		    separated by white space
	-nargs=?    0 or 1 arguments are allowed
	-nargs=+    Arguments must be supplied, but any number are allowed

Arguments are considered to be separated by (unescaped) spaces or tabs in this
context, except when there is one argument, then the white space is part of
the argument.

Note that arguments are used as text, not as expressions.  Specifically,
"s:var" will use the script-local variable in the script where the command was
defined, not where it is invoked!  Example:
    script1.vim: >
	:let s:error = "None"
	:command -nargs=1 Error echoerr <args>
<   script2.vim: >
	:source script1.vim
	:let s:error = "Wrong!"
	:Error s:error
Executing script2.vim will result in "None" being echoed.  Not what you
intended!  Calling a function may be an alternative.
```

Key takeaways here are we need to use `-ngargs=1` to specify we take in a
single argument and use `<args>` for the placeholder where we want to
substitute our text.

With all these information provided, want to take on the challenge to write
`:Rd`?

```vimrc
:Rd node
"=> will insert println!("{:?}", node) into our file.
```

---

_Purposely leave blank for anyone who want to take on the challenge..._

...

...

...

...

---

## Final Solution

Here's the `vim` command to insert the Rust print debugging code snippet:

```vim
:command -nargs=1 Rd put ='println!(\"<args>: {:?}\", <args>);'
```

That's all, sweet and simple. This post is not possible without the following
StackOverflow question:

- [How to insert the result of a command into the text in vim? - Unix & Linux Stack Exchange](https://unix.stackexchange.com/questions/8101/how-to-insert-the-result-of-a-command-into-the-text-in-vim)
