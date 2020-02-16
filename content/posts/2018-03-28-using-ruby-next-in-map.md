---
title: "Using Ruby next in map"
date: 2018-03-28T22:43:41+0800
tags: ["ruby"]
---

While I was refactoring the code base of my client application,
I came accross a code block, similar to this:

```ruby
arr = []
data.each do |d|
  status = d['status']
  next if IGNORED_STATUS.include? status
  arr << d['value']
end
```

I think, "Ha, I can replace `each` with `map` here."

I go ahead, and make the changes.

```ruby
arr = data.map do |d|
  status = d['status']
  next if IGNORED_STATUS.include? status
  d['value']
end
```

_Little did I know that,
this will break the production system in the future._

After the application went live, after a few hours, my client
reported that there were errors in the system disrupting the user from
using it normally. After some investigation, I found out that it is
caused by `nil`. I patched the error quickly by using `compact`.

From something like this:

```ruby
timeslots = get_timeslots(params) # [1, nil, 2, 3]
timeslots.each { |x| ... }
```

to:

```ruby
timeslots = get_timeslots(params).compact # [1, 2, 3]
timeslots.each { |x| ... }
```

Later on, diving into the source code, I found out that the `nil`
is introduced by my own refactored code. It turns out that, inside
a `map`, using `next` will return `nil` instead of skipping it
altogether. I only learn this when I came across this
[blog article](http://code-worrier.com/blog/map-and-next/).
For example:

```ruby
arr = [1,2,3,4,5,6]
arr.map do |i|
  next if i % 2 == 0
  i # Return the value
end

#=> return [1, nil, 3, nil, 5, nil]
#=> instead of [1, 3, 5]
```

Well, thanks myself for not writing test ahead before refactoring the
code base, I get to learn this the hard way.

### Lesson Learned

1. Always write test before refactoring.
2. Using `next` in a `map` return `nil`
3. `Array#compact` can be used to remove `nil` elements.
