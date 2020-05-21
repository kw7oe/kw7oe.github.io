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


[0]: https://github.com/dirkolbrich/hugo-theme-tailwindcss-starter
