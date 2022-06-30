---
title: "Last 6 weeks in the Recurse Center"
date: 2022-06-21T16:41:54+08:00
draft: true
tags: ["recurse-center"]
---

In my previous post, I talk about how my first 6 weeks in the Recurse Center
(RC). I also closed up the post with some of the things I wanted to achieve on
my next 6 weeks. In this post, I'm going to reflect about my last 6 weeks in RC
and later on walkthrough and update on the goals I set out.

## Reflection

Out of the the last 6 weeks in RC, I'm travelling and dealing with chores for around
1 week.  During that time, I'm kind of like on and off in RC. I participated some events,
wrote some checkin, but less time is spent on writing code.

Despite the reduced time commitments and work done during that week, I still felt
like I have learnt a lot more and achieve a lot more that I expected. One of
such occassion is when I participated a talk about consensus protocol in
distributed database system by TigerBeetle engineer. In an hour plus of the
talk and Q&A, I had learnt a lot of things that would take quite
a lot more time for me to discover otherwise. This one event made me feel that
my week in RC was not wasted despite having less focus time than usual.

Being in RC also broaden my horizons way more than I expected. Every
week, I'll never know what new territory I would discover, or what
cool and creative stuff that is possible through programming. I have learn that
programming isn't just purely about solving technical problems, it can also be
used to generate arts and do a lot of different creative stuff.

Another thing that I realized during my time in RC is that pairing is great.
Having a project that I can paired with people really get the best out of my time
in RC. I have learnt so much from pairing with the others.

In retrospect, I also think that having a plan on what I want to do in RC is
great as long as it is loosely held. If I stick to my plan I wrote 12 weeks ago,
I might not enjoy my time here as much. Have a plan, but change things around when
you came across other things you want to do.

Overall, the last 6 weeks was great even there were some hiccups.

## Review

A quick recap on the goals of my last 6 weeks in RC:

- Continue to implement and learn about database system.
- Continue writing about implementing a database system in Rust.
- Implement Raft consensus protocol in Rust.
- Build something related to networking.
- Involve more socially such as organizing events, presenting, pairing and
having coffee chats.
- Job hunting.

Out of the 6 items, I think I accomplished 3 of them 🎉

## Accomplishments

Let's start with the good one first.

### Build something related to networking.

One of the proudest outcome I have during my last 6 weeks in RC is:

> A minimal ngrok like reverse proxy: `rok`.

[`rok`](https://github.com/kw7oe/rok) is implemented in Rust and [Tokio](https://tokio.rs/). The goal of this project is to learn network programming and async Rust. It's one of the proudest project because:

- I can't believe I can write a reverse proxy in such a short time with other
commitments.
- I'm not the only coder. Half of the functionality of the project is a result
of multiple pairings with another batch mate.

This project will not be what it is if I have not paired with the others. Pairing on a project is a really great experience for me.

> Throughout my time in RC, pairing is definitely the activities with highest ROI. You
get to social, have fun and also learn a tons from each other!

I'm really glad that I decided to allocate some time to work on other stuff
other than database system. This has not been possible otherwise!


### Implement Raft Consensus protocol in Rust

While I didn't end up implementing Raft consesus protocol in Rust, I
started implementing Viewstamped Replication (VSR) protocol in Elixir. This is
because, VSR has been frequently discussed topic during my batch in RC and has
been implemented partially by one of the batch mate.

Not to mentioned, the VSR paper is also easy to read and understand. The VSR
implementation can be categorised into 4 parts:

- Normal Operation _(replication)_
- View Changes _(primary fails)_
- Recovery
- Reconfiguration

At the time of writing, I have completed up to normal operations and going to
implement the view changes protocol next.

### Involve more socially

On the social side of things, I think I'm doing slightly better than my first
6 weeks.

Thanks to the onboarding buddy practice of RC. I get to have a couple of
coffee chat with with my onboarding buddies. Having those conversation is really
fun and I always learn something from people in RC.

If you're someone like me who takes time to warm up to social, I would definitely
recommend choosing 12 weeks batch. This allow you to be the onboarding buddy of the
next batch. A little push and responsibilities like this really makes me be more
proactive in socializing with people. Normally, RC will arrange people with
similar interests to be your onboarding buddy.

I also Participated a couple of events. One of the most memorable one is the talk about
distributed database design by TigerBeetle engineer. It explain Viewstamped Replication
really well and it's part of the reason why I chose to implement VSR instead of Raft.
The talk is available on Youtube [here](https://www.youtube.com/watch?v=rNmZZLant9o).
Sometimes, I do also jump into Coaches _(basically zoom link where people just
do stuff)_ and Coffee Consumption Group _(an event for early birds and EU
timezone)_ to just listen it and social a bit.

## Below expectations

Things don't always go well as we planned, so next, let's talk about things
that don't progress as I expected.

Regarding my work on database system, it doesn't progress as much as I hope
for. I'm currently still implementing the lock manager to allow concurrency
control. And I stopped writing the book for a while, as I realized that the
abstraction of my current implementation might not be a good one, and I'm
afraid of misguiding people. Hence, I decided to put it off for a while and
come back once I have a better understanding of database system implementation.

Job searching has been on and off for me as well. Applied to a couple of
companies and didn't really get passed the resume stage. Given that experience,
I'm struggling on what I should go for next. Ideally, I
want to pivot my career into system programming but it's been quite tough to get
an interview given my background.

Considering that my time in RC is limited, I decided to postpone it after the end of
my RC batch.

## The good stuff about RC

Despite of not progressing well in my job searching, RC do have a great career service!
The career facilitators has been really helpful and professional in helping me in
my journey to get a job.

Never graduate. Alumni.

Niceties

## Thoughts

12 hours difference in timezone isn't stopping me from having fun. There are
tough time when dealing with sleep cycle, but it's definitely worth it. The
timezone also allow me to easily balance between spending time on events and
focus work.
