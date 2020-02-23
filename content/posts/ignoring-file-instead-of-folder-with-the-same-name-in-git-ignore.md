---
title: "Ignoring file instead of folder with the same name in .gitignore"
date: 2020-02-23T17:30:54+08:00
draft: true
tags: ["git"]
---

While migrating this website from Jekyll of Hugo, I faced an issue where my
`/tags` resulting in a `404 Not Found` after deployment. It turned out that
`/tags` is ignored by `git` whenever I build my site.

Then, I realized I have the following line in my `~/.gitignore_global`:
```
tags
```

This is the files that I ignore after start using `ctags` in `vim`. Knowing the
root cause, I knew that I'll need to only ignore `tags` file and not `tags`
directory.

A quick google search regarding how to do this lead me to this
[stackoverflow][0], where the solution is as follow:

```
tags
!tags/
```

Basically, this is telling `git` to ignore `tags` file but **not to ignore**
`tags/` folder.



[0]: https://stackoverflow.com/questions/49420785/git-ignore-file-but-not-folder-with-the-same-name



