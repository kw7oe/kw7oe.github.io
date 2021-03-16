---
author: Choong Kai Wern
title: Now
date: 2019-05-13
description: What I'm doing now.
keywords: []
---

I'm currently working on a digital health startup in Malaysia as a Software
Engineer. I'm part of the Team Foundation in our Engineering team, where I work
on the foundational layer for the business ranging from identity _(user account
management)_, payment, infrastructure and performance improvement.

Here's some of the problems I aim to solve by the end of 2021:

- Access Control
  - Currently, we are still manually creating IAM users for each engineers.
  - We are moving towards of using AWS SSO with our GSuite as the single
    identity source.
  - At the same time, moving it into assume role approach and setting up least
    priviledge access for our roles and permission sets.
- Observability
  - We have metrics from here and there. However, it's hard for us to answer
    the questions like: "What is the latency for P99 of our services?"
- CI/CD
  - The hard part is actually getting people to start writing tests
- Secret Management and Rotation
  - We are in the migration process of using AWS Parameter Store for
    storing the secret securely, but will explore how can we do secret
    rotation down the road
- Canary deployment
  - Rolling out changes to small portion of trafic by stages

All of these problems are actually solvable with the current state of
technology. The hard part is actually identifying what's the right pathway for
the company depending on the context we are in now and plan out the execution
path. Executing these changes might involves several months of ongoing efforts
before the migration is done fully.

---

Outside of work, my focus is to learn and write. I'm always learning more in
order to deepen and widen my understanding and knowledge on different areas in
software and technology.


