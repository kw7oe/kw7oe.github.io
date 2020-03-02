---
title: "AWS EC2 Disk Space Full"
date: 2020-03-02T20:59:55+08:00
draft: true
tags: ["aws", "devops"]
---

In Naluri, the digital healthcare startup I am currently working for, use AWS
infrastructure extensively. For instance, we build our Elixir/Phoenix
application release on a seperate EC2 instance.

Sometimes, if our engineers are unlucky, their build process will failed
because of **the lack of disk space** in our build server.

Having to deal with this issue a couple of time have taught me a few things.
Here, I am sharing the common approaches we use to clean up our
EC2 disk space.

This post assume that you have run `df -hT` and have something as below:

```
Filesystem     Type      Size  Used Avail Use% Mounted on
udev           devtmpfs  2.0G     0  2.0G   0% /dev
tmpfs          tmpfs     396M   41M  355M  11% /run
/dev/xvda1     ext4      7.7G  7.7G   70M  59% /
```

## Identifying the root cause

Before cleaning up our disk space, we need to know which directories are taking
up most of the space.

To do this, you'll probably need to have the `sudo` access. First, run the
following command:

```
cd /
du -ah . | sort -rh | head -20
```

Let's have a quick breakdown on what the commands above are doing:

- `cd /` to change directoy to our `/`.
- `du -ah .` get all files and directories (`-a`) and print the sizes in a human readable format (`-h`)
- `sort -rh` sort the result in the reverse order (`-r`) by comparing
  human readable numbers, e.g., 2K 1G (`-h`)
- `head -20` basically take the top 20 results of the sorted list.


After running this, you might see something like:

```
du: cannot read directory './proc/27089/task/27089/fd': Permission denied
du: cannot read directory './proc/27089/task/27089/fdinfo': Permission denied
du: cannot read directory './proc/27089/task/27089/ns': Permission denied
du: cannot read directory './proc/27089/fd': Permission denied
```

Don't be afraid, nothing is breaking. By the end of the result, you will see
something like this:

```
7.7G	.
3.7G	./usr
1.4G	./home/deploy
1.4G	./home
1.3G	./home/deploy/app/build
1.3G	./home/deploy/app
878M	./var
747M	./usr/lib
676M	./snap
530M	./var/lib
530M	./snap/core
355M	./usr/src
...
```

Now, we see that `/usr` are occupying a lot of the space. We can `cd /usr` and
run `du -ah . | sort -rh | head -20` again to see which directories in `/usr`
take up the most spaces.
