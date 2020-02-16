---
title: A note about using 'fetch' in JS
date: 2018-04-11T22:43:41+0800
tags: ["javascript"]
aliases: ["/javascript/2018/04/11/a-note-about-using-fetch-in-js.html"]
---

Another story about fixing bug. This story is related to the native web
API `fetch`, which is used to make request.

### Backstory

After serveral days of having my first production application online,
my client inform me that, the application has a bug, _again_.
The button was not working as expected for one of the users.
Long story short, we found out that the bug occurs in iOS 10.2.1.
So, I downloaded the Simulator for iOS 10.2 to start debugging.

### Issue

It turns out that `fetch` is not supported in iOS 10.2. In this
case, I can:

- replace `fetch` with `axios`
- use `fetch` polyfill

to solve the issue.

### Lesson Learned

1. `fetch` is not supported for iOS 10.2 and below.
2. How to debug a web application using Simulator.
3. Having more information about the environment when the bug occured
   is always helpful.
