---
title: "GenServer"
date: 2020-04-13T21:21:59+08:00
draft: true
tags: ['elixir']
---

In 2019, I once gave a talk about GenServer in a local Elixir meetup. In
the talk, I gave a quick introduction on GenServer and talk about the best
practices of using GenServer.

To prepare for the talk, I have done a lot of research and readings. With
experience working with GenServer in a production environment, I
have also realized that there are a lot of caveats when using GenServer.

While GenServer is easy to use, there are actually a lot of challenges when
using GenServer in a production environment.  So, in this post, I'll attempt
to write down my findings about GenServer.

The post will be break down into following sections:

- Introduction to GenServer
- When you should and shouldn't use GenServer
- Do and Don't of GenServer
- Limitations of GenServer
- Common Usage of GenServer
