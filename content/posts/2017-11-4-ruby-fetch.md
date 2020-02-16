---
title: "Ruby fetch"
date: 2017-11-04T22:43:41+0800
tags: ["ruby"]
---

Today, when I am refactoring a CLI I wrote, I came across a code block where I check whether an index exists in an array _(turns out I don't actually need it, I can just access the array and check if the value is `nil`)_. I went to search of Ruby `Array` documentation to see if such method exists. Then, I came across `Array#fetch` while scrolling through the documetantion.

### Array#fetch

In Ruby `Array`, `fetch` is a method that get the value at position `index` of an array. The difference between `fetch` and `.[]` is `fetch` throws an `IndexError` if the index doesn't exists.

```ruby
array = [1, 2, 3]
array.fetch(0) #=> 1
array.fetch(4) #=> IndexError: index 4 outside of array bounds: -3...3
```

If we take a look at the Ruby documentation of [Array#fetch](https://ruby-doc.org/core-2.4.0/Array.html#method-i-fetch), we'll see that `fetch` has the following definitions:

```ruby
fetch(index) -> Object
fetch(index, default) -> Object
fetch(index) { |index| block } -> Object
```

Which means, we can also provide a default value as the result if the index isn't found. For example:

```ruby
array = [1, 2, 3]
array.fetch(4, 0)
#=> 0
```

Or provide a block to be executed if the index is not found:

```ruby
array = [1, 2, 3]
array.fetch(4) { |index| "The index '#{index}' is not found" }
#=> "The index '4' is not found"
```

### Possible Use Case

`Array#fetch` can be used when we need to provide a default value if the index is not found.

```ruby
users = ['Peter', 'Jane', 'John Wick']
name = users.fetch(4, 'User not found')

puts name
"User not found"
#=> nil
```

For example, we have a method to allow to search other users _(which store in array)_ and print out the name as a response. To handle the scenario where the user is not found, we can implement it by providing a default value with `Array#fetch`. No additional handling code is required.

If you know the other possible use cases of `Array#fetch`, feel free to share it out.
