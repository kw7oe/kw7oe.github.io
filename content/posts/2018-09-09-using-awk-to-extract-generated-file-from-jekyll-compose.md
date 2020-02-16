---
title: Using AWK to extract generated file from jekyll-compose
date: 2018-09-09T22:25:00+0800
tags: ["awk"]
---

Recently, I have been using `jekyll` to make notes. I use `jekyll-compose`
gem to create post using command line. However, the auto open generated file
features isn't working in my machine after the setup.

After a few times on manually opening the generated files in `vim`, I decided
to write a quick shell script to solve this issue.

### Scenario

To generate a new post with `jekyll-compose`, we can run the following command:

```
bundle exec jekyll post <TITLE>
```

and it will output the following:

```
Configuration file: /Users/kai/Desktop/notes/_config.yml
New post created at _posts/<DATE>-<TITLE>
```

So, to generate and open the file involves the following steps:

- Run the command to generate post
- Extract the file path
- Open the file using `vim`

### awk

I came across `AWK` from [Julia Evans zine][1]. It came to my mind again when I want
to extract the file path from the output of the command.

`AWK` is a programming language designed for text-processing. It has very basic
yet important command `print` to output the text. What makes `AWK` different is
it breaks each line into columns _(seperated by space, which can be configure)_, where:

```
print $1
```

means output the first column.

We can also add in a specific condition in front of the `print` command so that
it only execute if the condition is true.

```
CONDITION {print $1}
```

### Implementation

After knowing some basic of `AWK`, we can extract the file path with the
following actions.

#### 1. Extraction

Hence, to extract out the file path from the line `New post created at _posts/<DATE>-<TITLE>`,
we can use the following command:

```
echo 'New post created at _posts/<DATE>-<TITLE>' | awk '{print $5}'
```

`$5` is used since the file path is the fifth column of the line.

#### 2. Only Extract Second Line

Since we just wanted to extract the second line of the command output, the
command above is not enough. What we really wanted is to say:

_if the line is second row, then we extract it_

To achieve that in `AWK`, we can use `AWK` built-in variables `FNR`, which
refers to the current line number of the file, to form a condition.

```
echo -e "Configuration file: /Users/kai/Desktop/notes/_config.yml\nNew post created at _posts/<DATE>-<TITLE>" | awk 'FNR==2{ print $5 }'
```

### Summary

1. You can use `AWK` to print specific column of lines with `awk {print $N}`
2. You can add condition in front of the `print` command if needed.
3. `AWK` contains a handful of built-in variables that are useful for
   text-processing.
4. Code snippet to generate and open the file.

```bash
function newpost() {
  vim $(
    bundle exec jekyll post $1 |
    # substr is used to remove the ending '.' of the extracted string
    awk 'FNR == 2{print substr($5, 1, length($5) - 1)}'
  )
}
```

---

1. If you are interested in more command line tools, you can consider purchase
   [Julia Evans][2] [Byte Size Command Line][3] zine series.

2. It turns out the reason why my `jekyll-compose` configuration doesn't work is
   because of a single typo of `-`. Instead of:

```yml
# The correct one
jekyll_compose:
  auto_open: true
```

I use:

```yml
# The wrong one
jekyll-compose:
  auto_open: true
```

[1]: https://twitter.com/b0rk/status/1000604334026055681
[2]: https://twitter.com/b0rk
[3]: https://gumroad.com/l/bite-size-command-line
