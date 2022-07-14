---
title: "Last 6 weeks in the Recurse Center"
date: 2022-07-12T16:00:54+08:00
tags: ["recurse-center"]
---

Another 6+ weeks has passed since I wrote about my [first 6 weeks in the Recurse
Center][0] (RC). Can't believe that in a blink of an eye, I have "never graduated" from
my RC batch.

I closed up my previous post with the things I wanted to achieve on my last 6 weeks in RC. In this post, I will first talk about my review of my last 6 week in RC,
starting with a reflection and then review the goals I set out previously. Then,
I'll share about what I like about RC.

This post is structured as follows:

- [Reflection](#reflection)
- [Review](#review)
  - [Achievements](#achievements)
  - [Below Expectations](#below-expectations)
- [What I like about RC](#what-i-like-about-rc)
- [Closing](#closing)

## Reflection

Out of the last 6 weeks of RC, I'm away for RC for a week to travel and deal
with some chores. During that time, I participated some events, wrote some checkin,
but less time is spent on writing code.
Despite the reduced time commitments and work done during that week, I
have learnt a lot more that I expected.

I had this realization after I participated a talk about consensus protocol in
distributed database system by TigerBeetle engineer. In an hour plus of the
talk and Q&A, I had learnt a lot of things that would take more time for me to
discover otherwise. This one event made me my week in RC worthwhile despite
having less focus time than usual.

Being in RC also broaden my horizons way more than I expected. Every
week, I'll never know what new territory I would discover, or what
cool and creative stuff that is possible through programming. I have learnt that
programming isn't just purely about solving technical problems, it can also be
used to generate arts and do a lot of different creative stuff.

Another thing that I realized during my time in RC is that pairing is great.
Having a project that I can pair with people get the best out of my time
in RC. I have learnt so much from pairing with the others.

In retrospect, I also think that having a plan on what I want to do in RC is
great as long as it is loosely held. If I stick to my plan I wrote 12 weeks ago,
I might not enjoy my time here as much. Have a plan, but change things around when
you came across other things you want to do.

Overall, the last 6 weeks was great even there were some hiccups _(due to some
personal issues)_.

## Review

Before I review the goals I had, let's have a quick recap on my goals for
the last 6 weeks in RC:

- Continue to implement and learn about database system.
- Continue writing about implementing a database system in Rust.
- Implement Raft consensus protocol in Rust.
- Build something related to networking.
- Involve more socially such as organizing events, presenting, pairing and
having coffee chats.
- Job hunting.

Out of the 6 items, I think I accomplished 3 of them 🎉

### Accomplishments

Let's first talk about each of the accomplishments I had in detail. You can
also skip to [below expectations](#below-expectations) if you're interested
in things that didn't go quite well.

#### Build something related to networking.

One of the proudest outcome I have during my last 6 weeks in RC is:

> A minimal ngrok like reverse proxy: `rok`.

[`rok`](https://github.com/kw7oe/rok) is implemented in Rust and [Tokio](https://tokio.rs/). The goal of this project is to learn network programming and async Rust. It's one of the proudest project because:

- I can't believe I can write a reverse proxy in such a short time with other
commitments.
- I'm not the only coder. Half of the functionality of the project is a result
of multiple pairings with another batch mate.

This project will not be what it is if I have not paired with the others. Pairing on a project is a great experience for me.

_Throughout my time in RC, pairing is definitely the activities with the highest ROI. You
get to social, have fun and also learn a ton from each other!_

I'm glad that I decided to allocate some time to work on other stuff
other than database system. This has not been possible otherwise!


#### Implement Raft Consensus protocol in Rust

While I didn't end up implementing Raft consensus protocol in Rust, I
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

#### Involve more socially

On the social side of things, I think I'm doing slightly better than my first
6 weeks.

Thanks to the onboarding buddy practice of RC. I get to have a couple of
coffee chat with with my onboarding buddies. Having those conversations were
fun and I always learn something from those conversations.

If you're someone like me who takes time to warm up to social, I would definitely
recommend choosing 12 weeks batch. This allow you to be the onboarding buddy of the
next batch. A little push and responsibilities like this makes me be more
proactive in socializing with people. Normally, RC will arrange people with
similar interests to be your onboarding buddy.

I also participated in a couple of events. One of the most memorable one is the talk about
distributed database design by TigerBeetle engineer. It explain Viewstamped Replication
well and it's part of the reason why I chose to implement VSR instead of Raft.
The talk is available on Youtube [here](https://www.youtube.com/watch?v=rNmZZLant9o).

Sometimes, I do also jump into Coaches _(basically zoom link where people just
hangout)_ and Coffee Consumption Group _(an event for early birds and EU
timezone)_ to just listen in and social a bit.

### Below expectations

Things don't always go well as we planned, so next, let's talk about things
that don't progress as I expected.

Regarding my work on database system, it doesn't progress as much as I hope
for. During the last 6 weeks, I'm implementing the lock manager to allow concurrency
control. And I stopped writing the book for a while, as I realized that the
abstraction of my current implementation might not be a good one, and I'm
afraid of misguiding people. Hence, I decided to put it off for a while and
come back once I have a better understanding of database system implementation.

Job searching has been on and off for me as well. Applied to a couple of
companies and didn't get past the resume stage. Given that experience,
I'm struggling on what I should go for next. Ideally, I
want to pivot my career into system programming, but it's been quite tough to get
an interview given my background and location.

Considering that my time in RC is limited, I decided to postpone it after the end of
my RC batch.

It's not that bad in retrospect as I did make some progress in both areas.

## What I like about RC

Participating RC for a 12 weeks batch is one of the most memorable and beneficial
experience I had in 2022. I have learnt and experienced a lot and would
recommend to anyone who want to become a better programmer or find joy in
computing again. Let's talk about things I really like about RC.

_Disclaimer: These are all based on my personal opinion and experience I had
when doing RC remotely. It might be different from the others experience._


### Serendipity

Every day in RC is full of serendipity. As mentioned a few time above, I always
came across something unexpected whenever I participated in any social events
in RC. I have learnt so much of unknown unknowns throughout my time here.

Sometime, it feels kind of magical after an event or conversation. It's hard to
explain in words, but let me try my best to describe it: _It's a feeling with a
mixture of joy, fulfillment and inspirations you got after each interaction
you have._

### Never Graduate

Do you know that you can still participate in RC events after your batch ended?
If you didn't, now you know. You never graduate in RC, you become the alumni.

While not every alumnus is active in RC, there are still an outstanding amount of
participations of alumni in day to day RC activities.

I think this is part of what make RC a great place. As a participant, you get
to learn and navigate this new unknown territory with the help of the alumni
_(as well as your batch mate and facilitators)_. For example, I have an
alumnus from Malaysia reached out for a coffee chat and share some useful
advices to me.

As an alumnus, your participation is optional. Sometime, people from a
couple of batches ago still participate in events. Even for now, I still
checkin weekly to share about my work and learn about what the others
have been up to as well. It's a really great community to be in even as
alumni.

### Career Service

RC has a great career service! In general, RC career service:

> offers personalized career services to help you find a new job, based on your experience and what you’re looking for next in your career.

Apart from helping you find a new job, they organize events to help people
in their career as well. You could also reach out to them to have a chat about your
career.

The career facilitators have been really helpful and professional. It's also kind of
reaffirming to have people who have expertise in this area and know the market to
talk about our career.

Furthermore, you get to do mock interviews with the alumni. Some of the
alumni will volunteer their time to conduct mock interviews to help folks
to practice job interviewing. I got a lot of constructive feedbacks and felt
more confident after two of the mock interviews I had. Definitely recommend it
to anyone who's looking for jobs.

### Niceties

Another thing I like a lot is about the niceties practice in RC. By the end of
a batch, you are prompt to write some niceties to people who are in batch
together with you, especially for those where their batch is ending.

One of the reason I like this is because, it guides me to reflect and be
proactive to write nice things about people. We often take things for granted
and are not good at expressing our thanks to the people who have helped us
along the way. Niceties help us with that.

Receiving niceties from people is also great. It kind of make you feel
appreciated and more confidence about yourself. Personally, I felt really
heartwarming and confidence about myself after reading the niceties.

### How RC operates

The other plus points of RC are how they operate. There are a couple of things
I like about how RC operates. The onboarding, the first week, the ongoing
improvements the facilitators trying to make, is beyond my expectations.
While there is more I could write about how RC operates well from my
perspective, I guess it's better for me to summarize my thoughts more concisely.

From what I have experienced and observed, RC nails it on managing
expectations and having a good feedback mechanism in place and taking actions
to ensure that the participants get the most out of RC.

The fact that they pivot to having virtual RC and continuously
improving the experience just prove it all. Along my time here in RC, I have
seen a few initiatives started by the facilitators, to help with the challenges
people are facing in RC.

Personally, I think that a company can learn a lot from how RC operates and
some practices it has.

## Closing

To conclude, participating in RC not only makes me a better programmer and reignite
my passion about computing, it also opens up a portal for me to connect with liked
minded people and explore the unknown unknowns about everything.

When I first applied of RC, I thought that I wouldn't get in. When I
get accepted, I thought that I would have a hard time due to the
12 hours timezone difference. Turn out that I was wrong. Having the timezone
difference kind of help me to balance my time between events and focus work.

If you're interested to join, please don't hesitate to apply!

<script async defer src="https://www.recurse-scout.com/loader.js?t=be2ff87ed4d98a9f986aa32a60d57250"></script>

[0]: {{< ref "/posts/first-6-weeks-in-rc.md" >}}
