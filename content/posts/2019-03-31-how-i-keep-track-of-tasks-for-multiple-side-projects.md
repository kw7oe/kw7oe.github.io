---
title: How I keep track of tasks for multiple side projects
date: 2019-03-31T20:51:00+0800
tags: ["productivity"]
aliases: ["/productivity/2019/03/31/how-i-keep-track-of-tasks-for-multiple-side-projects.html"]
---

If you are like me, having countless side projects and jumping from one to another
from time to time, you might also experience _ending up losing track of what
you should do on each side projects._

Keeping track of tasks in all of your side projects isn't easy without using
any project management software. However, it might feel overkill for personal
projects.

How might one solve it? With a simple **text file and some bash script**.

### Where I left off last time?

Every now and then, when I am working on my side projects, I always forget
what are the last changes I made. Luckily with version control and the
practice of writing good commit message, I can always use `git log` to
view the past commits to get an overview what I should do next and
what have been done.

However, this approach is limited. Sometime, the past commits can't really
tell me what should I do next.

Hence, I use a simple way to keep track of what I need to do in my side
projects, which is a todo list. To be more accurate, a project based todo list,
in a simple file.

### Introducing `.todo` file

The idea is straighforward. I write down my tasks in the `.todo` file located
at the root directory of the project.

To edit it, I just use `vim .todo`. Adding tasks or deleting tasks are the
same as manipulating text. If you're not a `vim` user, you can use any text
editor you prefer.

### Listing the tasks

To get what you need to do on each side projects, is simple. The simplest
apporach is to `cat -n .todo`. This command will show your task in your `.todo`
file, numbered.

In cases where you have wrote a lot of tasks, listing out just like this might
clutter your terminal. To resolve this, we can use `head` to show only the top
few tasks on the `.todo` file. Now our command becomes:

```
cat -n .todo | head -n 5
```

This command will list the top 5 line of your file. To take it further, you can
write a bash function and add it to your `.bashrc` or `.zshrc`.

```bash
function whattodo() {
    cat -n .todo
}
```

Now, everytime I need to know what I need to do for each side projects, I just
`cd` into project directory and run my `whattodo` command.

### Benefits

No extra dependencies is needed. Since, we use the comamnds that are widely
available and also cross compatible to every machine Unix based machine.

---

## Final Thoughts

There are no silver bullets to manage a project. Different project size, might
need different toolings and approach. For instance, this approach is not really
suitable when the project become too large or complex, where the tasks involved
consists of different type of work such as bug fixes, adding features and etc.

For a small, personal side project, I found this method to be quite helpful personally.
