---
title: "AWS EC2 Disk Space Full"
date: 2020-03-16T20:59:55+08:00
tags: ["aws", "devops"]
---

_Updates (4th June, 2020): Adding in another potential causes: logs_

The company I am currently working for, uses AWS infrastructure extensively.
For instance, we build our Elixir/Phoenix application release on a seperate EC2 instance.

Sometimes, if our engineers are unlucky, their build process will failed
because of **the lack of disk space** in our build server.

Having to deal with this issue a couple of time have taught me a few things.
Here, I am sharing the common approaches to clean up our EC2 disk space.

This post assume that you have run `df -hT` and have something as below:

```
Filesystem     Type      Size  Used Avail Use% Mounted on
udev           devtmpfs  2.0G     0  2.0G   0% /dev
tmpfs          tmpfs     396M   41M  355M  11% /run
/dev/xvda1     ext4      7.7G  7.7G   70M  59% /
```

# Identifying the root cause

Before cleaning up our disk space, we need to know which directories are taking
up most of the space.

To do this, you'll probably need to have the `sudo` access. First, run the
following command:

```bash
cd /
sudo du -ah . | sort -rh | head -20

# In rare cases, where your disk is really really full and sort
# doesn't work due to that, you can run the following to
# clean up apt-get cache. Alternatively, you can remove certain
# files/folders that you are sure unused.
sudo apt-get clean
```

Let's have a quick breakdown on what the commands above are doing:

- `cd /` to change directoy to our `/`.
- `du -ah .` get all files and directories (`-a`) and print the sizes in a human readable format (`-h`)
- `sort -rh` sort the result in the reverse order (`-r`) by comparing
  human readable numbers, e.g., 2K 1G (`-h`)
- `head -20` basically take the top 20 results of the sorted list.
- `sudo apt-get clean` to clean up apt package cache if the above command can't
  be run due to disk space being too full.


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
- Huge undeleted log files

## Old Linux Header Files

If you happen to see `/usr/src` end up being the directory to occupy the most
space, and `ls /usr/src` shows a lot of files in the form of `linux-headers-*` or
`linux-headers-*-generic`, then you are facing the issue of [linux header files occupying the space][0].

This is what happen to us during the first time.

### Solution

After reading around Google Search results.  I end up refering to this [StackExchange ubuntu question][0]
to resolve the issue.

The author suggest running the following commds:
```bash
sudo apt-get update
sudo apt-get -f install
sudo apt-get autoremove
```

These commands will automatically remove older linux header files.
You can refer to this [StackExchange question][1] regarding whether it's safe to
remove those files.

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

## Deleted, but opened files

If after running `du`, but the result doesn't match up with `df -hT`, then it is
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

but your `df -hT` returning something like this:

```
Filesystem     Type      Size  Used Avail Use% Mounted on
udev           devtmpfs  2.0G     0  2.0G   0% /dev
tmpfs          tmpfs     396M   41M  355M  11% /run
/dev/xvda1     ext4      7.7G  7.7G   70M  59% /
```

where `4.7G` is not equal to `7.7G`. It's very possible that you are facing
the same issue.

### Solution

The solution is found on this [StackExchange answer][3]. According to the
author of the answer, we firstfind out what are the files that took up the
spaces by running the following command:

```bash
sudo lsof | grep '(deleted)'
```

You might see something like this:

```
systemd-j   402                   root  txt       REG              202,1   326224       2308 /lib/systemd/systemd-journald (deleted)
dbus-daem  1032             messagebus  txt       REG              202,1   224208      24312 /usr/bin/dbus-daemon (deleted)
systemd-l  1054                   root  txt       REG              202,1   618520       2307 /lib/systemd/systemd-logind (deleted)
aws       19341                   root   1w       REG              202,1  1504932       3421 /var/log/awslogs.log.1 (deleted)
```

Then, look for the process that are not important or safe to kill and associated with
large file.

For me, it's `aws` logs file that is deleted but still help opened. It took up
disk space of `1504932`.

We can then proceed to kill the process to clear up the identified file by
running the following:

```bash
# kill -9 <pid>
kill -9 19341
```

After that you can check your disk usage  by using `df -hT` again and you should
now have more free disk space. With this approach, we managed to  free up `3.2G`
of disk space on our build server.

## Huge undeleted log files

Recently, I have also came across another potential causes which is huge
undeleted log files. It's easy to locate the issues by simply running:

```
du -ah . | sort -rh | head -20
```

If your results is something like this, where `/var/log` come up as the top
one, then it's definitely due to logs.

```
7.6G	.
4.5G	./var
3.8G	./var/log
3.4G	./var/log/nginx
1.7G	./usr
1.6G	./var/log/nginx/access.log
882M	./var/log/nginx/error.log.1
696M	./snap
645M	./var/log/nginx/access.log.1
...
324M	./var/lib/snapd
276M	./usr/lib/x86_64-linux-gnu
275M	./snap/core/9066
275M	./snap/core/8935
```

As you can see from the results, in this case `/var/log/nginx` seems like the
culprit. We can then change directory and `ls -lah` _(`-h` to format the
file size to human readable format)_, which result in:

```
total 3.4G
drwxr-xr-x  2 root   adm     4.0K May 31 06:25 .
drwxrwxr-x 11 root   syslog  4.0K Jun  1 01:30 ..
-rw-r-----  1 deploy adm     1.6G Jun  1 02:09 access.log
-rw-r-----  1 deploy adm     645M May 29 06:25 access.log.1
-rw-r-----  1 deploy adm      81K May 17 06:25 access.log.10.gz
-rw-r-----  1 deploy adm     268K May 16 06:25 access.log.11.gz
-rw-r-----  1 deploy adm    1019K May 15 06:25 access.log.12.gz
...
-rw-r-----  1 deploy adm     252M Jun  1 02:07 error.log
-rw-r-----  1 deploy adm     882M May 29 02:34 error.log.1
...
```

While it may seems like the straightforward solution is just `rm access.log`,
but there are some caveat. Before deleting those logs directly, is good to
google search around on how to do it properly, so this is what I found:

- [Deleting nginx log and now nginx won't start](https://serverfault.com/questions/146913/nginx-error-log-was-huge-so-i-deleted-and-created-a-new-one-now-nginx-wont-st)
- [How to erase content of error.log file but keep file intact](https://superuser.com/questions/218214/how-do-erase-the-contents-of-a-error-log-file-but-keep-the-file-intact)
- [Clean nginx logs file](https://stackoverflow.com/questions/32410053/clean-var-log-nginx-logs-file)

Browse those link if you want to learn more about it. But in my case, I am
following the answer on the third link:

```bash
mv access.log access.log.old
# After this command, you should see a new empty access.log file created.
kill -USR1 `cat /var/run/nginx.pid`
rm access.log.old
```

If let's say your largest log file is `access.log.<number>`, generally, it's
safe to delete it directly _(you might need to double check on this, can't
manage to find a source to support my point and this time of writing)_.

At the end, here is the result when I run `df -hT` again:

```
Filesystem     Type      Size  Used Avail Use% Mounted on
udev           devtmpfs  2.0G     0  2.0G   0% /dev
tmpfs          tmpfs     396M   41M  355M  11% /run
/dev/xvda1     ext4      7.7G  4.3G  3.5G  56% /
...
```

All my space is back! And `nginx` is still working properly.


# Conclusion

That's all. These are the findings I discovered while attempting to solve disk
space full issue in our EC2 instances. Hopefully it helps. All the information
are actually available if we managed to search for the right term or key words.

Here are some other resources I refer to that are not mentioned in the article:

- https://stackoverflow.com/questions/20031604/amazon-ec2-disk-full/20032145
- https://serverfault.com/questions/232525/df-in-linux-not-showing-correct-free-space-after-file-removal/232526

[0]: https://askubuntu.com/questions/1183843/ec2-ubuntu-instance-is-full-but-cant-find-why
[1]: https://askubuntu.com/questions/253048/safe-to-remove-usr-src-linux-headers-after-purging-older-linux-images
[2]: https://askubuntu.com/questions/280342/why-do-df-and-du-commands-show-different-disk-usage
[3]: https://superuser.com/questions/905654/dev-xvda1-full-though-there-is-no-temporary-files
