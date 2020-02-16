---
title: A note on`application` in mix.exs starting from Elixir 1.4
date: 2018-10-03T21:45:00+0800
tags: ["elixr"]
aliases: ["/elixir/2018/10/03/a-note-on-in-mix-exs-starting-from-elixir-1-4.html"]
---

Starting from Elixir 1.4, we don't need to specify our application lists in
`application`. It is automatically inferred from our dependencies. _(Check the
release notes [here][1])_

Do note that **it only automatically infer the application lists if the
`:applications` key is empty.** If you had already declared your it in your
`mix.exs` like this:

```elixir
def application do
  [
    # Will be automatically inferred starting
    # from Elixir 1.4, if it is empty.
    applications: [:cowboy, :plug]
  ]
end
```

Be sure to clear it to utilize this feature.

Below are the detailed story on how I came across this.

<small>_Disclaimer: The point of this article is summed up above, skip the part below if you're busy._</small>

---

### The Story

Recently, I have been writing a simple Plug web application and came across the
need to use an external database.

`Ecto` and `PostgreSQl` is the thing that come up to my mind.

Hence, I went over the [Ecto documentation][4] and run through the setup in the
application. After going through the steps, and finally run `iex -S mix`, an
error arise.

```
...failed to start child: App.Repo
```

I check my `config.exs`. Nothing wrong.

So, I go through the documentation again and again, to check if I miss out anything.
No, nothing wrong. The documentation didn't mentioned the need to add `ecto`
and `postgrex` in the `application`. After googling around, someone mentioned
that adding it solve the issues.

_I tried, it worked._

But I don't know why. _The documentation can't be wrong right?_

So, I create a new test application and follow the documentation again.

_And, it works._

So, I delete this line of code in my `mix.exs`:

```elixir
applications: [:cowboy, :plug]
```

_And, it works._

### The Why

Hence, I guess that Mix actaully automatically start the applications needed
for us. So, I search through the documentations of different version of Mix
_([1.4.5][2] vs [1.3.4][2])_, and finally found out that since Elixir 1.4,
Mix has this new feature. It is also mentioned in the [release notes of Elixir 1.4][1].

However there is one condition. **It only automatically infer the applications list if the
`:applications` key is empty.** That explains why it didn't work in my
application because I already declared the list manually, as shown below:

```elixir
def application do
  [
    mod: {App.App, []},
    extra_applications: [:logger],
    # Can be removed for Elixir >= 1.4.
    # Since it is automatically inferred.
    applications: [:cowboy, :plug]
  ]
end
```

### The Lessons

- Application lists can be automatically inferred in for Elixir >= 1.4
- _Documentation can be wrong. But, most of the time, you might be the one who
  are in fault._
- Read release notes.

Thanks for reading through it.

[1]: https://elixir-lang.org/blog/2017/01/05/elixir-v1-4-0-released/
[2]: https://hexdocs.pm/mix/1.3.4/Mix.Tasks.Compile.App.html#content
[3]: https://hexdocs.pm/mix/1.4.5/Mix.Tasks.Compile.App.html#content
[4]: https://hexdocs.pm/ecto/getting-started.html#content
