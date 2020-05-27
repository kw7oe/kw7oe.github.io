---
title: "Introduction to Hugo"
date: 2020-05-21T20:27:24+08:00
draft: true
---

I have been playing around with Hugo since last year. After getting a hold of
it, I started to migrate my personal website from Jekyll to Hugo around
February 2020.

While Hugo has a lot of awesome themes, I can't really find one that I like and
decided to write my own minimal theme, based on the[`hugo-theme-tailwindcss-starter`][0]
theme. With minimal amount of setup, I have managed to redesign my personal
website with Tailwind CSS.

<div class="callout callout-info">
  <h3 style="margin-top: 0">What is Taildwind CSS?</h3>
  <p>
    <a href="https://tailwindcss.com/">Tailwind CSS</a> is a utility-first CSS framework.
    Instead of writing my own utility class like <code>.mb-1 { margin-bottom: 1rem; }</code>,
    Tailwind CSS provides those utitlity classs for us. With some minimum
    configuration with PurgeCSS, we can easily slim down our CSS size by
    removing all those CSS provided by Tailwind CSS that is not used.
  </p>
</div>

Throughout the migration process, I have learnt a thing or two about Hugo and
decided to write about it.

In this post, I am going to cover the follwoing:

- What is Hugo?
- Why Hugo?
- Hugo command line that you need to know
- Hugo File Structure
- Creating your own Hugo Theme
- Deploying to Github Pages

## What is Hugo?

[Hugo][1] is a static site generators. A static site generator is basically a
tool that help you generate the static HTML and CSS files needed for your
website. Instead of writing your own website with barebone HTML and CSS,
a static site generator allows you to abstract your common layout of HTML and
CSS and dynamically generate all the HTML files based on your content files,
which is often in the Markdown format.

Static site generator tools basically help you seperate your design, structure
of your website from your content. It is fast since your server is going to
plain old HTML and CSS file directly.

## Why Hugo?

There is a bunch of static site generators out there, notably Jekyll and Gatsby.js.
Having to use both Jekyll and Gatsby.js, I would say that all of them are equally great.
So, why Hugo? Here are the two main reasons why you should consider Hugo:

### 1. It is fast, in terms of building your website

On my 8GB machine, it takes just aroud 17-20ms to render my changes. This means
that you are able to preview your changes quickly with Hugo. Hugo also claimed
to be the fastest tool of its kind.

### 2. It has a lot of built-in features.

As far as I know, Hugo includes a lot of features for content management
that I have not widely seen in other static site generator such as:

- Estimated reading times with `.ReadingTime` function.
- Word counts with `.WordCount` function.
- [Table of Content](https://gohugo.io/content-management/toc/)
- [Summary](https://gohugo.io/content-management/summaries/)
- [Image Processing](https://gohugo.io/content-management/image-processing/)
  _(Gatsby.js do also have amazing image plugins)_

While a lot of the above can also be implemented with external plugins for
other static site generator, Hugo just have it built-in, which is a huge win
for me personally, as I don't have to find what's the best library/plugins I
should use.

<div class="callout callout-info">
  <p>
    Other reason like  Hugo Themes is not mentioned as it is not unique to Hugo.
    Jekyll, Gatsby.js and most static site generator all have great themes
    available for used.
  </p>
</div>

## CLI commands to know

After [installing Hugo](https://gohugo.io/getting-started/installing/), you can
use the `hugo` command to do a few things with your Hugo project. Here are some
of the basic one that you need to know:

- `hugo new site <site-name>` to initialized your Hugo project.
- `hugo new <category>/<file>.<format>` to create your content files. For
  example, `hugo new posts/hello-world.md` will create a
  `<hugo-project>/content/posts/hello-world.md` file.
- `hugo server -D` to start your Hugo server, where `-D` specify that draft
  content is enabled.
- `hugo` to build your static sites.
- `hugo --help` to see all of the available commands for `hugo`.

`hugo new` and `hugo server -D` are the two commands that you will use day to
day when working with Hugo.

## Core concepts and file directory structure


[0]: https://github.com/dirkolbrich/hugo-theme-tailwindcss-starter
[1]: https://gohugo.io/
