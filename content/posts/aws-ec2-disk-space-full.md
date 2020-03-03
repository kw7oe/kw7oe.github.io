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

```bash
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

Based on my limited experience, the root cause could be one of the following:

- Old Linux header files
- Deleted but opened files

### Old Linux Header Files

If you happen to see `/usr/src` end up being the directory to occupy the most
space, and `ls /usr/src` shows a lot of files in the form of `linux-headers-*` or
`linux-headers-*-generic`, then you are facing the issue of [linux header files occupying the space][0].

To resolve this issue, run the following:

```bash
sudo apt-get update
sudo apt-get -f install
sudo apt-get autoremove
```

Basically, these commands will automatically remove older linux header files.
You can refer to this [StackExchange question][1] regarding whether it's safe to
remove those files.

During my very first time of investigating the issue, this is what happent to
us. After reading around Google Search results. I end up refering to this
[StackExchange ubuntu question][0] to resolve the issue.

After runnning the above command, you'll likely to see the following log
_(where I shamelessly copy from the StackExchange post mentioned above)_:

```
Reading package lists... Done
Building dependency tree
Reading state information... Done
The following packages will be REMOVED:
  linux-aws-headers-4.4.0-1022 linux-aws-headers-4.4.0-1039 linux-aws-headers-4.4.0-1041 linux-aws-headers-4.4.0-1043
  linux-aws-headers-4.4.0-1044 linux-aws-headers-4.4.0-1048 linux-aws-headers-4.4.0-1049 linux-aws-headers-4.4.0-1052
  linux-aws-headers-4.4.0-1054 linux-aws-headers-4.4.0-1055 linux-aws-headers-4.4.0-1057 linux-aws-headers-4.4.0-1060
  linux-aws-headers-4.4.0-1061 linux-aws-headers-4.4.0-1062 linux-aws-headers-4.4.0-1065 linux-aws-headers-4.4.0-1066
  linux-aws-headers-4.4.0-1069 linux-aws-headers-4.4.0-1070 linux-aws-headers-4.4.0-1072 linux-aws-headers-4.4.0-1074
  linux-aws-headers-4.4.0-1075 linux-aws-headers-4.4.0-1077 linux-aws-headers-4.4.0-1079 linux-aws-headers-4.4.0-1083
  linux-headers-4.4.0-1022-aws linux-headers-4.4.0-1039-aws linux-headers-4.4.0-1041-aws linux-headers-4.4.0-1043-aws
  linux-headers-4.4.0-1044-aws linux-headers-4.4.0-1048-aws linux-headers-4.4.0-1049-aws linux-headers-4.4.0-1052-aws
  linux-headers-4.4.0-1054-aws linux-headers-4.4.0-1055-aws linux-headers-4.4.0-1057-aws linux-headers-4.4.0-1060-aws
  linux-headers-4.4.0-1061-aws linux-headers-4.4.0-1062-aws linux-headers-4.4.0-1065-aws linux-headers-4.4.0-1066-aws
  linux-headers-4.4.0-1069-aws linux-headers-4.4.0-1070-aws linux-headers-4.4.0-1072-aws linux-headers-4.4.0-1074-aws
  linux-headers-4.4.0-1075-aws linux-headers-4.4.0-1077-aws linux-headers-4.4.0-1079-aws linux-headers-4.4.0-1083-aws
  linux-image-4.4.0-1022-aws linux-image-4.4.0-1039-aws linux-image-4.4.0-1041-aws linux-image-4.4.0-1043-aws
  linux-image-4.4.0-1044-aws linux-image-4.4.0-1048-aws linux-image-4.4.0-1049-aws linux-image-4.4.0-1052-aws
  linux-image-4.4.0-1054-aws linux-image-4.4.0-1055-aws linux-image-4.4.0-1057-aws linux-image-4.4.0-1060-aws
  linux-image-4.4.0-1061-aws linux-image-4.4.0-1062-aws linux-image-4.4.0-1065-aws linux-image-4.4.0-1066-aws
  linux-image-4.4.0-1069-aws linux-image-4.4.0-1070-aws linux-image-4.4.0-1072-aws linux-image-4.4.0-1074-aws
  linux-image-4.4.0-1075-aws linux-image-4.4.0-1077-aws linux-image-4.4.0-1079-aws linux-image-4.4.0-1083-aws
  linux-modules-4.4.0-1077-aws linux-modules-4.4.0-1079-aws linux-modules-4.4.0-1083-aws
0 upgraded, 0 newly installed, 75 to remove and 205 not upgraded.
After this operation, 3214 MB disk space will be freed.
```

Try `df -hT` again and you should find your disk space get freed up.

### Deleted, but opened files

If after running `du` the result doesn't match up with `df -hT`, then it is
possible that you have some files that is deleted but held open by some
application or process.

The second time when our build server experiencing disk usage full issue, I
tried removing linux header files as mentioend above, but it doesn't free up
much space.

It takes me a while to figure out what is happening. To summarize, I have learn
that `du` and `df` sometimes give different disk usage because of these deleted
but in use file, after searching about it and came across this [StackExchange answer][2].

For instance, if your `du` returning something like this:

```
4.7G	.
1.7G	./usr
1.4G	./home/deploy
...
```

and your `df -hT` returning something like this:

```
Filesystem     Type      Size  Used Avail Use% Mounted on
udev           devtmpfs  2.0G     0  2.0G   0% /dev
tmpfs          tmpfs     396M   41M  355M  11% /run
/dev/xvda1     ext4      7.7G  7.7G   70M  59% /
```

where `4.7G` is not equal to `7.7G`.

I refer to this [StackExchange answer][3] to resolve this issue. Basically, we first run
the following command as `sudo` to find out what the files that took up the spaces:

```bash
lsof | grep '(deleted)'
```

You might see something like this:

```
systemd-j   402                   root  txt       REG              202,1   326224       2308 /lib/systemd/systemd-journald (deleted)
dbus-daem  1032             messagebus  txt       REG              202,1   224208      24312 /usr/bin/dbus-daemon (deleted)
systemd-l  1054                   root  txt       REG              202,1   618520       2307 /lib/systemd/systemd-logind (deleted)
aws       19341                   root   1w       REG              202,1  1504932       3421 /var/log/awslogs.log.1 (deleted)
```

Look for the process that are not important or safe to kill and associated with
large file.

For me, it's `aws` logs file that is deleted but still help opened. It took up
disk space of `1504932`.

Knowing the file, we then proceed to kill the process to clear up the file by
running the following:

```bash
# kill -9 <pid>
kill -9 19341
```

After that you can check your disk usage  by using `df -hT` again and you should
now have more free disk space. With this approach, we managed to  free up `3.2G`
of disk space on our build server.



## References

- https://stackoverflow.com/questions/20031604/amazon-ec2-disk-full/20032145
- https://serverfault.com/questions/232525/df-in-linux-not-showing-correct-free-space-after-file-removal/232526
- https://superuser.com/questions/905654/dev-xvda1-full-though-there-is-no-temporary-files
- https://www.digitalocean.com/community/questions/cannot-find-what-is-filling-up-disk-space-dev-vda1-is-100-full
- https://askubuntu.com/questions/280342/why-do-df-and-du-commands-show-different-disk-usage

[0]: https://askubuntu.com/questions/1183843/ec2-ubuntu-instance-is-full-but-cant-find-why
[1]: https://askubuntu.com/questions/253048/safe-to-remove-usr-src-linux-headers-after-purging-older-linux-images
[2]: https://askubuntu.com/questions/280342/why-do-df-and-du-commands-show-different-disk-usage
[3]: https://superuser.com/questions/905654/dev-xvda1-full-though-there-is-no-temporary-files
