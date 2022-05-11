---
title: "First 6 weeks in the Recurse Center"
date: 2022-05-11T10:00:06+08:00
tags: ["recurse-center"]
categories: ["life"]
draft: true
---

For the past 6 weeks, I have been attending the Recurse Center (RC).
Recurse Center is:

> an educational retreat for programmers who want to become dramatically better
with a community of peers doing the same.

The journey has been fascinating so far. Hence, I want to share my
experience and challenges in RC so far and plan for my remaining 6
weeks in RC.

This post will be structured as follow:

- [Main Goal](#main-goal)
- [Social Experience](#social-experience)
- [Challenges](#challenges)
- [What's Next?](#whats-next)
- [Wrap Up](#wrap-up)

## Main Goal

During my time here, my main goal is to write multiple database system from scratch,
with a focus on the storage engine. Here's a rough plan I initially had:

- **1st month**: Write a storage engine in Rust, which include on disk B+ tree
buffer pool management, concurrency control and recovery mechanism.
- **2nd month:** Write a LSM tree key value (KV) store in Rust, which include using a
custom binary format with checksum and compaction.
- **3rd month:** Write a Raft implementation in Rust, then integrate it into the KV
store to make it a distributed KV store.

I started writing the [database](https://github.com/kw7oe/sqlite-rust) 1 month
before my RC batch started as I know that due to the complexity and the scope, 4 weeks might not be enough.

I was wrong. 6 week in and I haven't done with making
my B+ tree supporting concurrent operations. Anyway, I consider that as
a good progress as I underestimated the complexity.

Apart from getting better at programming, another goal is to social and network.
Attending RC is not only about becoming better alone, it's
about doing so with the community. One of the [guiding
principles](https://www.recurse.com/self-directives) in RC
is to learn generously:

> Learning generously takes many forms. It means sharing your curiosities,
interests, and struggles with others; being open to collaboration; and listening
well and asking good questions when others share their work with you. If you’re
very social and enjoy variety, it might mean hosting events or pairing on
other people’s projects. If you’re focused on one project and work best alone,
it might mean presenting your work and sharing updates as you go.

To me, I want to learn generously by: sharing my work, pairing, and hosting
events, which require me to put myself out there and socialize with people.
So, let's talk a bit about the social experience I have so far!

## Social Experience

I'm never good at nor comfortable with socializing. I know that this is something
I have to work on.

It turns out that RC is an amazing place to do so. It has clear [social
rules](https://www.recurse.com/manual#sub-sec-social-rules).
Everyone is kind and encouraging. It's supportive environment make people more
open to share their vulnerabilities.

But, how do social and network in RC looks like when it's operating virtually?
Zulip, virtual RC and events.

In RC, everyone is free to organize an events. An event is basically a Zoom
session where people come together and discuss about a specific topic. Some of
the events I have participated so far are:

- Daily checkin
- FPGA
- Formal Method Consumption Group
- Wacky Idea Production Group
- Presentations

What I found fascinating about joining these events is the serendipity.
You just discovered amazing ideas and came across knowledge that
you'll never thought of. I always learnt something new and interesting in
every single event I participated.

Apart from events, Zulip and virtual RC are used as the day to day
communication channel. One of the main interaction points with the others is
through Zulip `#checkin` stream, where people write and share their daily
checkin. It's always interesting to read about people thought process and their
challenges there. Sometime, people share links. Thanks to that I discovered
quite a lot of awesome resources.

Virtual RC, is like gather.town. You can have your own desk, adopt pets,
hanging out at the coaches and have coffee chat with the others. I didn't
participate as much in the virtual RC, but if you would like to know more of
what is like, feel free to read: [What is Virtual RC like?](https://www.recurse.com/virtual-rc)

Overall, the social experience in RC has been great and more manageable than I
thought of.

## Challenges

There's no rainbow without rain. While my journey in RC has been great so far,
it's not without it's own challenges. Here's some of the main challenges I
have:

- [12 hours timezone difference](#12-hours-timezone-difference)
- [Socializing](#socializing)
- [Procrastination](#procrastination)

### 12 hours timezone difference

Since I'm living in a GMT+8 timezone, there's a 12 hours different with Pacific timezone.
This mean that the suggested time commitment of 11 am to 5 pm is equivalent to 11 pm to 5 am,
which is when I sleep. Not good.

During the first week, my strategy is to scheduled my time from 11 pm to
2 am for RC and wake up on the next day at 7 am, have some breakfast and take a bath
before continuing my RC hour from 9 am to 12 pm. This work well on the first week as
there's a couple of events such as Meet and Greet and Pair Programming workshop around
11 pm  to 2 am.

However, from the second week onward, a lots of events that I'm interested in happen
around 3 am to 6 am. So I tried a hybrid approach for my sleep cycle. I would go to
bed at 2 am on someday or go to bed at 10 pm so I could wake up at 4 am
to participate an event. This doesn't went really well. Did it for the first 2-3 days and
I have to catch up with my sleep on the rest of the week. **Not recommend
anyone to have a mixed up sleep cycle at all.**

From my third week onwards, I decided to go to bed at 11 pm and wake up at 4
am. Why 4 am? That's the weekly presentation event time, and
some of the event I'm interested in start after 4 am. This has served me
well so far. Here's how my updated schedule looks like:

| Time | Activity |
| --- | --- |
| 10:00 pm to 04:00 am | Sleep |
| 04:00 am to 07:00 am | **RC** |
| 07:00 am to 09:00 am | Breakfast and etc |
| 09:00 am to 12:00 pm | **RC** |
| 12:00 pm to 01:00 pm | Lunch |
| 01:00 pm to 02:00 pm | Nap |
| 02:00 pm to 06:00 pm | **RC**/Personal |
| 06:00 pm to 08:00 pm | Dinner and etc |
| 08:00 pm to 10:00 pm | **RC**/Personal |

You might think:

> Wow you are really discipline!

Not quite, for the past 3 weeks, there were numerous time I sleep at 11
pm and wake up at 5-6 am. My actual schedule is not exactly what I plan
out to be, but it's pretty close to that. Heck, there's one time I miss the
presentation because I overslept.

Switching your sleep schedule takes time. _The last thing you need is to be
harsh on yourself._

Another thing to keep in mind is to keep yourself off
caffeine at least 8 hours before you sleep. There's one day I had a tea on 5 pm
and I kind of regretted it as I can't feel asleep until 2 am.

Waking up at 4 am has it own challenge as well when you're living at a small
place with the others. You might end up affecting other
people sleep as well. So to resolve that, I basically sleep alone in my living room
instead of sleeping with my partner in our bedroom. But it get tricky when I
have a bad stomach in the morning, and the only bathroom in the household is in
the bedroom...

Hopefully for the next 6 weeks I can live up to my schedule!

**TLDR**

- Most events I'm interested in happened around 3 to 6 am. So I decided to start my day at 4 am.
- Having a consistent sleep cycle is important.
- Take nap when you're tired or not having a good sleep quality.
- Avoid caffeine hours before sleep.
- Don't be too harsh on yourself. Switching sleep cycle take time.

### Socializing

As mentioned, socializing is something out of my comfort zone. Most of the
time, I can be socially awkward.

First of all, socializing is a challenge for me partly due to the timezone
differences, and the fact that most of the people are from United
States and Canada. Undeniably, there will be some gaps, especially when people are
discussing about local stuff, sometimes I can't relate as much. But that's not
really an issue for me, as most of the time I'm just listening.

Luckily, RC do have a huge network of alumni and some of them is from Malaysia.
One of the alumni even reach out to have a coffee chat. It is a great
conversation I had in RC.

On top of that, the facilitators in RC are very helpful. Having
conversation with them is reaffirming. Sometimes, they do reach out to
help you. Those actions do give me an extra push to take my own
initiative in socializing.

Apart from that, the batch mates are proactive in interacting with me
especially in my written check in. So having other people to take the first step
does make things easier for me.

Anyway, some of the actions I take to make things better in this regard are:

- Participate in the events I'm interested in.
- Share my thoughts more often. This mean, if there's something in the check in
I found interesting or presentation that's cool, voice it out.
- Have presentation. This is how others can know more about what you're working
on.
- Look for opportunities to help the others. For example, pair with someone
on things you're familiar with.

Here are some other actions I haven't tried out yet:

- Organize events. I'm thinking of organize a database related event but not
sure if I can commit to it.
- Participate social events. Social events are events that's not programming or
education related.
- Have more coffee chat with the others.
- Work on something non database related.

### Procrastination

When you are working at the edge of your abilities, sometimes your mental
energy get drained real quick. Sometimes, you dwell on a problem
for too long it become an inefficient way to spend your time.

When those things happen, I tend to procrastinate. Maybe it's because I'm
tired. Maybe it's because I don't want to feel dumb. Regardless of the reasons,
there will be time I stop being productive and become idle.

In order to overcome those, I tried out a couple of things. These are some
solutions that work quite well for me:

- **Limit the time of intense focus.** I try not to spend more
than 3 hours on a problem without a break in between. This prevent me from
dwelling on a problem, which only have diminishing returns.
- **Have one small win each day.** As we are working at the edge of abilities,
there will be time, where we might not have any outcome or progress on a
particular day.

  Some of the small wins I aimed for every day is reading a small part of a
  paper or write a fragment. Instead of having myself to perform the best of
  everything I set out to, I allow myself to do the smallest possible part,
  and consider that a win.

As a result, while I still get stuck on programming, I'm not being
affected for the rest of my day. I wrote and published a couple of fragments in
2 weeks time. In fact the first fragment I wrote is about this particular
topic: [Solutions I'm trying to have a productive day]({{< ref "fragments/solutions-im-trying-to-have-a-productive-day.md" >}}).

So if you faced similar challenges as me, do give it a try.

Lastly, please know that it's totally okay to be idle sometime. Taking a break might be
all you need to be productive again.

## What's Next?

My first 6 weeks in RC has passed in a blink of an eye. While I didn't progress
well according to my plan in writing multiple database system, it's not
important anymore _(writing database system is important, the fact that I
progress slower is not)_. What's more important is what's next.

I will continue to implement and learn about database system, but I'll
spend less time on it. Perhaps, limit it to 3 hours per day.

Being inspired by [Let's Build a Simple Database](https://cstack.github.io/db_tutorial/)
and [Crafting Intepreters](https://craftinginterpreters.com/), I'm writing a book about
implementing database system in Rust. My goal in the next 6 week is to finish up chapters
on B+ Tree operations and buffer pool management.

I finished writing a couple of chapters, and aimed to finish at least what
"Let's Build a Simple Database" included _(until insert and split internal node)_
before I share it publicly.

Anyway, enough about database system.

One of the reason I'm reducing my time on database system is to explore
other areas such as networking and distributed system. Here's some of the outcome
I'm aiming to achieve:

- Implement Raft consensus protocol in Rust.
- Build some stuff related to networking. I'm thinking of writing a minimal
`ngrok` in Rust.

As I mentioned, RC is about the community and learning generously. So
apart from learning on my own, I plan to involve more socially.
I'll start with having another one or two presentations in RC and
organizing some events. When I'm more comfortable about it, maybe I'll try
out the coffee chat in virtual RC.

Finally, RC ending in another 6 weeks mean that, I need to start applying
for jobs. I'll spend one day per week to write some cover letter and tweak my resume.
Then, spend another day _to accept rejection and be okay with it_.

## Wrap Up

I'm glad that I was accepted into RC. Being in RC has truly broaden my
experience and help me to become a better programmer. Let's hope all the best
for myself in the next 6 weeks in RC.

Last but not least:

<script async defer src="https://www.recurse-scout.com/loader.js?t=be2ff87ed4d98a9f986aa32a60d57250"></script>
