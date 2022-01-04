---
title: "Writing a simple Redis Protocol parser in Elixir"
date: 2022-01-04 21:01:05+08:00
tags: ["elixir", "redis", "parser"]
---

Today, we are going to write a parser that parse
[Redis Protocol](https://redis.io/topics/protocol) in Elixir.

There are tons of supported [commands](https://redis.io/commands) in Redis.
Since this is our first attempt on implementing it, we will only be focusing
on the [`GET`](https://redis.io/commands/get) and
[`SET`](https://redis.io/commands/set).

At the end of this post, you should be able to **write a simple parser to
parse request/response by Redis client/server**. Here's how this post is structured:

- [Redis Protocol Specification](#redis-protocol-specification)
- [Writing our Parser](#writing-our-parser)

Before getting into the implementation, let's learn about the
Redis Protocol Specification first.

---

_This post assume you have
prior knowledge of setting up Elixir project with `mix` as the post only
includes code snippets instead of full fledge working example._

_I am working on the Livebook notebook, and will update the post with `Run in
Livebook` once it's up._

_This post is inspired by [Rust Tokio Mini-Redis Tutorial](https://tokio.rs/tokio/tutorial/setup),
where it walks through the reader to implement a mini Redis with
[`tokio`](https://tokio.rs/). If things go well, this would also be a similar
series._

---

# Redis Protocol Specification

Redis Protocol Specification (**RESP**) is the protocol Redis client and server
used to communicate with each other.

As mentioned aboved, it consists of multiple commands, and it's not ideal
to go through every of them in this post. Hence, I'll just cover the basic we need
to know for this post.

## Supported Types

RESP basically support the following types. To allow us to differentiate
different types, the protocol use the first byte as an identifier:

* **Simple Strings**, where the first byte of the reply is "+"
* **Errors**, where the first byte of the reply is "-"
* **Integers**, where the first byte of the reply is ":"
* **Bulk Strings**, where the first byte of the reply is "$"
* **Arrays**, where the first byte of the reply is "\*"

Most importantly, all of it will be ending with `\r\n`.

Types such as array and bulk strings might contain multiple lines and `\r\n`.
In order to get the full data, we will need to parse through multiple lines.

In general, this is what you need to know about each type:

| Type           | Description                                                                            |
| -------------- | -------------------------------------------------------------------------------------- |
| Simple Strings | Used by the server as it's reply.                                                      |
| Errors         | Used by the server to indicate errors.                                                 |
| Integers       | Used by the server to return integer results such as `INCR`.                           |
| Bulk Strings   | Used by the client/server for string inputs and results.                               |
| Arrays         | Used by client to send commands to server or server to return a collections to clients |

To know more, read the [documentation from
the Redis website](https://redis.io/topics/protocol).

## Simple Strings vs Bulk Strings

Simple Strings is used to represent non binary safe string. It has less overhead
since it doesn't require the length of the string to be known. Normally this is
used as a return result from the server. For example, many result of Redis command
return `+OK\r\n` on success.

Bulk Strings, on the other hand, is used to represent binary safe string, up to 512MB in length.
To aids with parsing the string, a length is required to be included. This mean that, we are
able to parse the string correctly as the length is provided. An example of bulk string
is as follow:

```
$6\r\nfoobar\r\n
```

To represent an empty string, the following is used:

```
$0\r\n\r\n
```

In the case where you need to represent `nil`, the following format can be used:

```
$-1\r\n
```

where a `-1` length is used, which is also called Null Bulk String. This is what we need
to return from the server if a `GET` command should return `nil`.

### But what is binary safe and non binary safe string?

Binary safe string means that the string can contain any character, including characters like
`\0` that used to indicate a string is terminated in `C`.

Non binary safe string means the string cannot contain those character that might be used
to indicate a termination.

To understand more, you can refer to the answers in this
[StackOverflow question](https://stackoverflow.com/questions/19990140/what-is-the-difference-between-binary-safe-strings-and-binary-unsafe-strings).

## How to send commands to server?

Now that we know the basic structure of how our reply would looks like, let's talk about
how a command is represented in RESP, especially `GET` and `SET` command.

### `GET` command

From the `GET` command [documentation](https://redis.io/commands/get), we know that
the command support one argument. So to represent it as arrays, it will look something as follow:

```
["GET", "key"]
```

But, what would the raw command looks like if we were to send to the server as a client encoded it as RESP?

Let's apply what we know about RESP. We know that we need to:

- Encode the above to represent 2 data type, `Array`
and `Bulk String`. Hence, it will contain multiple parts.

This is what we need to send to the server to represent a `GET` command:

```
*2\r\n$3\r\nGET\r\n$3\r\nkey\r\n
```

To make it easier to understand, let's break down each parts into separate lines:

```shell
// Indicate an array with 2 elements
*2\r\n

// Indicate the first element is a Bulk String of 3 character
$3\r\n

// Actual content of the first element
GET\r\n

// Indicate the second element is a Bulk String of 3 character
$3\r\n

// Actual content of the second element
key\r\n
```

### `SET` command

For `SET` command, we will be focusing on the basic one without supporting the
additional options:

```
["SET", "key", "value"]
```

I'll leave it as an exercise for you to come up with the raw reply. If you have
trouble coming up with it, try to break it into multiple parts first, and then
encode it with RESP.

Divide and Conquer.

<!-- livebook:{"livebook_object":"cell_input","name":"SET Input","reactive":true,"type":"text","value":"*3\\r\\n$3\\r\\nSET\\r\\n$3\\r\\nkey\\r\\n$5\\r\\nvalue\\r\\n"} -->

## Are you correct?

How do we know if we have the correct answer? Let's pull in `redix`, a Elixir Redis client.


```elixir
Mix.install([:redix])
```

Since `redix` library include the `Redix.Protocol` module that is in charge
of parsing the protocol, we will use it to verify our answer.

```elixir
["SET", "key", "value"]
|> Redix.Protocol.pack()
|> IO.iodata_to_binary()

#=> "*3\r\n$3\r\nSET\r\n$3\r\nkey\r\n$5\r\nvalue\r\n"
```

By now, we should able to understand how RESP works. So let's proceed to the next stage
where we write our code to encode and decode the raw input to a data structure and vice versa.

# Writing our Parser

Before we started to write our own parser, let's write some test case to help with us to verify
our implementation easily. Note that, we are using `redix` here as well to
verify our implementation.

```elixir
defmodule ParserTest do
  use ExUnit.Case, async: true

  describe "GET" do
    test "GET is encoded correctly" do
      input = ["GET", "key"]

      our_output = Parser.encode(input)

      redix_output =
        input
        |> Redix.Protocol.pack()
        |> IO.iodata_to_binary()

      assert our_output == redix_output
    end

    test "GET is decoded correctly" do
      input = "*2\r\n$3\r\nGET\r\n$3\r\nkey\r\n"
      our_output = Parser.decode(input)
      {:ok, redix_output, ""} = Redix.Protocol.parse(input)

      assert our_output == redix_output
    end

    test "encode and decode" do
      reply = "*2\r\n$3\r\nGET\r\n$3\r\nkey\r\n"
      assert reply == reply |> Parser.decode() |> Parser.encode()

      list = ["GET", "KEY"]
      assert list == list |> Parser.encode() |> Parser.decode()
    end
  end
end

ExUnit.run()
```

If you run the code above, you'll get `Parser.decode/1` undefined error since we haven't
implement our module yet. So let's write some code!

```elixir
defmodule Parser do
  def encode(_commands) do
    # your impl
  end

  def decode(_string) do
    # your impl
  end
end

ExUnit.run()
```

If you're up to the challenge, implement the above first and utilize
the existing test to verify your implementation.

---

_Purposely left blank for those who want to implement it themselves first_

...

...

...

...

...

---

Are you ready for my version of implmentation? Here it is.

```elixir
defmodule Parser do
  def encode(commands) when is_list(commands) do
    result = "*#{length(commands)}\r\n"

    Enum.reduce(commands, result, fn command, result ->
      result <> "$#{String.length(command)}\r\n#{command}\r\n"
    end)
  end

  def decode(string) when is_binary(string) do
    %{commands: commands} =
      string
      |> String.trim()
      |> String.split("\r\n")
      |> Enum.reduce(%{}, fn reply, state ->
        case reply do
          "*" <> length ->
            state
            |> Map.put(:type, "array")
            |> Map.put(:array_length, String.to_integer(length))

          "$" <> length ->
            state
            |> Map.put(:type, "bulk_string")
            |> Map.put(:bulk_string_length, String.to_integer(length))

          value ->
            value = String.trim(value)
            Map.update(state, :commands, [value], fn list -> [value | list] end)
        end
      end)

    Enum.reverse(commands)
  end
end

ExUnit.run()
```

### Encode

Writing the `encode/1` is fairly straightforward since we already know how to represent
arrays and bulk string in RESP. All we need to do is to first specify the `Array` type and then
concantenate it with all the `Bulk String` type we have by looping through it with `Enum.reduce/2`.

### Decode

`decode/1` can be quite tricky to write.  Here, we are not utilizing the type and length
information from our input.

I am kind of making a lot of assumption in the implementation as we know that we are only interested
in any value that is not starting with type definition (\*, $ and etc).

The implementation turn the following from:

```
*3\r\n$3\r\nSET\r\n$5\r\nmykey\r\n$3\r\nfoo\r\n
```

into:

```
*3
$3
SET <-- What we want
$5
mykey <-- What we want
$3
foo <-- What we want
```

and further convert it into:

```
["SET", "mykey", "foo"]
```

by ignoring any line that indicate the type.

It can also be implemented as a recursive function that might result in a better readability.
Is this the ideal implementation? Definitely not! But this is a good start.

# Wrap Up

It isn't as hard as you think, right? Obviously, there are space of improvements of our parser.
But once you understand the building blocks of how Redis Protocol works it wouldn't be hard to
write a _simple_ one.

However, what we have done here is not perfect. There are tons of use cases and potential error
cases that we didn't handle. My implementation could be improved to utilize the length included
in `Array` and `Bulk String` type.

Next up, we would be integrating this parser into our TCP server so that we can write a mini
Redis server. With that, do you think our current parser implementation would
still work?

Stay tuned.
