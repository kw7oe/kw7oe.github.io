---
title: Using Markdown for Static Pages in Rails
date: 2018-11-27T22:04:00+0800
tags: ["ruby", "rails"]
aliases: ["/ruby/rails/2018/11/27/using-markdown-for-static-pages-in-rails.html"]
---

Markdown is great for formatting our writing to be publish as HTML. If you're a
developer, you probably used Markdown before. `README` of [GitHub][1] repositories
are mostly written in Markdown.

While developing web applications, there will be static pages such as
about page and FAQ page. Most of the time, we have to write it in HTML, which can
be unpleasant.

Luckily, we can still use Markdown to write the static pages in Rails application
and compile it into HTML.

## General Steps

The steps involved are straightforward.

1. Write Markdown
2. Compile the Markdown
3. Rails use the compiled HTML to serve the user.

There are two approaches:

1. Compile the Markdown file on runtime, which means, the file is only compiled when
   there is a request.
2. Precompile the Markdown file into `<filename>.html.erb` first.

## Compilation of Markdown during runtime

To compile a Markdown file during runtime in Rails, we need to know how to:

- Compile Markdown file in `ruby`
- Render the compiled HTML as views
- Bind ERB environment if instance variables `@variable` is used in the view

To compile a Markdown file is fairly straighforward in `ruby`:

```ruby
# gem install kramdown if not found
require 'kramdown'

file = File.read('about.md')
html = Kramdown::Document.new(file, {input: "GFM"}).to_html
# Configuring {input: "GFM"} to set kramdown to use GFM parser
# instead of the defaut one. GFM parser can parse Github Flavour Markdown.
p html
#=> <html>...</html>
```

To use it in a Rails application:

Add `kramdown` to `Gemfile`

```ruby
gem 'kramdown', require: false
# require: false since we are going to require it only
# when we need it
```

In the `app/views/pages/about.md`:

```
### Hi, <%= @name %>
```

In the `app/views/pages/about.html.erb`:

```erb
<%= raw @content %>
# We want the raw output of the @content instead of escaped
```

In the `app/controllers/pages_controller.rb`:

```ruby
require 'kramdown'

class PagesController < ApplicationController
  def about
    file_path = lookup_context.find_template("#{controller_path}/#{action_name}")
      .identifier.sub(".html.erb", ".md")
    @name = "Kai"

    # Compiled with ERB
    result = ERB.new(
      File.read(file_path)
    ).result(binding)

    # Convert MD to HTML
    @content = Kramdown::Document.new(result, {input: "GFM"}).to_html
  end
end
```

All the views file are self-explanatory, so let's just focus on the controller.

First of all, we need to get the `md` file in our controller. We can achieive
it by hardcoding it like `file_path = "../views/pages/about.md"`. But it is
better to make it dynamically look up the right `md` file depending on the
action of the controller.

So we use:

```ruby
template = lookup_context.find_template("#{controller_path}/#{action_name}")
#=> app/views/pages/about.html.erb
template.identifier
#=> "/Users/.../app/views/pages/about.html.erb"
template.identifier.sub(".html.erb", ".md")
#=> "/Users/.../app/views/pages/about.md"
```

How I know I should use this method to lookup for the file? Google search leads me to this [Stackoverflow][2] question and answer.

After that, we need to compile the `md` file first with `ERB` since we are `erb` syntax. After that, we just need to convert the result to HTML using `kramdown`.

The benefit of this approach is:

- Don't need to manually compile the `md` files.
- Can be used to compile dynamic Markdown files.

## Precompile the Markdown file

Another approach, is more troublesome, but has less overhead, since the server don't need to recompile the same Markdown file everytime someone visit to the page.

Instead of compile during runtime, we compile manually everytime after we
update our Markdown file. Rails just serve the `.html.erb` that we
converted from the Markdown files to the visitors.

The steps taken are:

- Find all the `.md` files in `app/views/pages`
- Compile every `.md` files to `.html.erb`

To do that, we can write a `rake` task. Add the following code into your
`Rakefile`.

```ruby
# Get all files in /app/views/page ending with md
SOURCE_FILES = Rake::FileList.new("app/views/pages/*md")

# Define a task
task :compile_md => SOURCE_FILES.pathmap("%X.html.erb")

# Define rule for the task
rule '.html.erb' => SOURCE_FILES do |t|
  require 'kramdown'
  content = Kramdown::Document.new(File.read(t.source), {input: "GFM"}).to_html
  File.write(t.name, content)
end
```

This code block is a bit tricky. To summarize, what it does is scan through all
the `.md` files located in `/app/views/page` and compile it into `.html.erb` if
any changes is made.

We can then run `rake compile_md` to manually compile our Markdown file into
`erb` file after we updated our Markdown file.

With this approach, do note that we did not handle `erb` syntax. Hence, there
is a gotcha. If you need to use `erb` syntax, you need to write plain `html`
instead. To demonstrate:

```
### Hello

This is my first sentence.

Total view:
{::nomarkdown}
<span><%= view_count %></span>
{:/nomarkdown}
```

The benefits of this approach is:

- Compilation of Markdown does not happen during runtime. Hence, save some
  computation time.

## Summary

That's all. I know there are a lot of magic happening on the `rake` task I wrote above.

To further understand the `rake` task, I would suggest these tutorials from Avdi
Grimm's rake series as suggested in `rake` README:

- [Rake Basics](http://www.virtuouscode.com/2014/04/21/rake-part-1-basics/)
- [Rake File Lists](http://www.virtuouscode.com/2014/04/22/rake-part-2-file-lists/)
- [Rake Rules](http://www.virtuouscode.com/2014/04/23/rake-part-3-rules/)

A sample application for this post can be found at my [Github][3].

[1]: https://github.com
[2]: https://stackoverflow.com/questions/34126212/get-path-of-corresponding-controller-action-view-file
[3]: https://github.com/kw7oe/sample-md-static-pages

---

**Footnote**

1. <small>I am sorry if this post is a bit messy. I am still not quite good at writing and structuring lengthy tutorial.</small>
