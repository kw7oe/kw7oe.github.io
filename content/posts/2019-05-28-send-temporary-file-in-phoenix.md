---
title: Send temporary file in Phoenix
date: 2019-05-28T20:59:00+0800
tags: ["phoenix"]
aliases: [
  "/phoenix/2019/05/28/send-temporary-file-in-phoenix.html"
]
---

**TLDR:** Use `Phoenix.Controller.send_download/3` to send binary as download
to your users.

---

In Phoenix, there are a couple ways of to send file to your users.
The most straightforward one is to programmatically create a file and send
it to user using `Plug.Conn.send_file/5`.

For example:

```elixir
def export(conn, _params) do
  # Create file
  filename = "test.md"
  File.write(filename, "Hello World")

  # Send file
  conn
  |> put_resp_header("content-disposition", ~s(attachment; filename="#{filename}"))
  |> send_file(200, filename)
end
```

However, this approach **creates a file locally in your production server
and require some clean up** after that. _(I don't really know how to delete a file only after the request succeed)_

## Introducing `send_download/3`

Luckily, there is another approach, which is using `Phoenix.Controller.send_download/3`.
This function allow us to send binary directly as a download. Hence, file creation is not needed.

For example:

```elixir
def export(conn, _params) do
  filename = "test.md"

  # Send file
  conn
  |> send_download({:binary, "Hello World"}, filename: filename)
end
```

For more, refer to the [`send_file/5`][1] and [`send_download/3`][2] documentation.

---

<small>This post was first appeared in my [TIL web application](https://til.kaiwern.com/posts/54).

[1]: https://hexdocs.pm/plug/Plug.Conn.html#send_file/5
[2]: https://hexdocs.pm/phoenix/Phoenix.Controller.html#send_download/3
