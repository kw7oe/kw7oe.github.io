---
title: Using Tesseract OCR in Elixir/Phoenix
date: 2019-06-03T18:04:00+0800
tags: ["elixir", "phoenix", "tutorial"]
aliases: [
  '/elixir/phoenix/2019/06/03/using-tesseract-ocr-in-elixir-phoenix.html'
]
---

Lately, I am exploring the use of OCR in [Expendere][1] (my expense tracking
application) and came across [Tesseract OCR][2].

At the time of writing this blog post, there is no native binding of Tesseract OCR in Elixir.
However, there are two Elixir wrapper available on GitHub:

- [tesseract-ocr-elixir][3]
- [tesseract-elixir][4]

Both wrapper use `System.cmd/3` to invoke the `tesseract` command line
interface and return the results of the executed command.

Seeing there are wrappers available out there, I quickly grab one and scaffold
a Phoenix application to test it out.

## Code

In this code example, I will be using wrapper from [tesseract-ocr-elixir][3].

In `mix.exs`, add `tesseract-ocr-elixir` as dependency:

```elixir
def deps do
  [
    ...,
    {:tesseract_ocr, "~> 0.1.0"}
  ]
end
```

In `page_controller.ex`:

```elixir
defmodule OcrWeb.PageController do use OcrWeb, :controller

  def index(conn, _params) do
    render(conn, "index.html")
  end

  def create(conn, %{"upload" => %Plug.Upload{} = upload}) do
    result = TesseractOcr.read(upload.path)
    render(conn, "show.html", result: result)
  end
end

```

In `router.ex`, add this under `scope "/"`:

```elixir
get "/", PageController, :index
post "/upload", PageController, :create
```

In `templates/page/index.html.eex`:

```eex
<%= form_for @conn, Routes.page_path(@conn, :create),
                    [multipart: true], fn f-> %>
    <%= file_input f, :upload, class: "form-control" %>
    <%= submit "Upload", class: "btn btn-primary" %>
<% end %>
```

In `templates/page/show.html.eex`:

```eex
<h1>Result:</h1>

<%= @result %>
```

**Demo**

![Demo](/images/tesseract-demo.gif)

Voila, a simple OCR application is done. The demo application is available at [GitHub][5].

[1]: https://expendere.herokuapp.com
[2]: https://github.com/tesseract-ocr/tesseract
[3]: https://github.com/dannnylo/tesseract-ocr-elixir
[4]: https://github.com/bchase/tesseract-elixir
[5]: https://github.com/kw7oe/phoenix-ocr-demo
