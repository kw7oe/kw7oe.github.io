---
title: "Ruby .() notation"
date: 2017-10-15T18:12:19+0800
tags: ["ruby"]
---

In Ruby, `.()` is a syntatic sugar for `call` method.

```ruby
class Person
  def call
    "Hello World"
  end
end

Person.new.()
#=> Hello World
```

In this example, we declare a `Person` class and `call` method in the class. With this, we can later execute `Person.new.()` to call the `call` method.

Note that, we need to initialize the `Person` object first by calling `new`, since the `call` is a instance method.

If we wanted to just call by `Person.()`, we can do it this way:

```ruby
class Person
  def self.call
    "Hello World"
  end
end

Person.()
#=> "Hello World"

```

Some programming languages such as Python, Swift and Scala initalize object by `Person()`. In Ruby, we can't override the `()` operator to achieve the same effect _(see this [StackOverflow question](https://stackoverflow.com/questions/24351218/how-to-create-an-object-in-ruby-without-using-new?answertab=oldest#tab-top))_. However, we can use `.()` to achieve a similar result:

```ruby
class Person
  def initialize(name, age)
    @name = name
    @age = age
  end

  def self.call(name:, age:)
    self.new(name, age)
  end
end

Person.(name: "Peter", age: 12)
#=> #<Person:0x00007f991b80b8d8 @name="Peter", @age=12>
```

Another way is to use metaprogramming in Ruby. Take a look at this [StackOverflow answer](https://stackoverflow.com/a/24356542) to find out how.
