---
title: "Ignoring file instead of folder with the same name in .gitignore"
date: 2020-02-23T17:30:54+08:00
tags: ["git"]
---

While migrating this website from Jekyll of Hugo, I faced an issue where my
`/tags` resulting in a `404 Not Found` after deployment. It turned out that
`/tags` is ignored by `git` when I build my site.

I then found out the following line in my `~/.gitignore_global`:
```
tags
```

This is the file that I ignore after start using `ctags` in `vim`. Knowing the
root cause, I knew that I'll need to only ignore `tags` file and not `tags`
directory.

A quick google search regarding how to do this lead me to this
[stackoverflow][0], where the solution is changing my `~/.gitignore_global` as
shown below:

```
tags
!tags/
```

Basically, this is how we tell `git` to ignore `tags` file only and **not to ignore**
`tags/` folder.


[0]: https://stackoverflow.com/questions/49420785/git-ignore-file-but-not-folder-with-the-same-name



