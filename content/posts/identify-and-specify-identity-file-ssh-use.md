---
title: "Identify and specify Identity File SSH use"
date: 2020-08-20T21:02:01+08:00
---

Recently, I have been looking into improving our access management to our EC2
instances in Naluri and came across EC2 Instance Connect features.
While experementing with it, I have learn a thing or two about `ssh`.

In this post, we are going to cover the following topics:

- Which private keys `ssh` is using?
- How to use only specifc private keys when `ssh`

## Which private keys `ssh` is using?

When I was experimenting with EC2 Instance Connect, I try to ssh with private
key that is supposed to be expired, however, I can still successfully `ssh`
into the application server. This seem weird. So I'll need to find out which
private key that `ssh` used to allow me to access the server. After some google
search, I found the answer [here][0], which is:

```bash
ssh -v user@ip_address
```

After running the above you'll see additional logs on what `ssh` go through
before connecting to the remote server, which looks like this:

```
OpenSSH_7.9p1, LibreSSL 2.7.3
debug1: Reading configuration data /Users/kai/.ssh/config
...
debug1: Authenticating to <ip_address>:<port> as '<user>'
...
debug1: Will attempt key: /Users/kai/.ssh/id_rsa RSA SHA256:LJnPQHkVlt+cqWslxTzObpDezpdjgIKdfh8qa7u4ftM agent
debug1: Will attempt key:  RSA SHA256:klrkbMg/32KGGbqW2GCEeWIx4MQ4aYJZonF0XIexVlI agent
debug1: Will attempt key: kai@KW.local RSA SHA256:utKcZ1r14VeHKyagE7IdqKOkZ+fWVVtk05zpl/K+tQQ agent
...
debug1: Authentications that can continue: publickey
debug1: Next authentication method: publickey
debug1: Offering public key: /Users/kai/.ssh/id_rsa RSA SHA256:LJnPQHkVlt+cqWslxTzObpDezpdjgIKdfh8qa7u4ftM agent
debug1: Server accepts key: /Users/kai/.ssh/id_rsa RSA SHA256:LJnPQHkVlt+cqWslxTzObpDezpdjgIKdfh8qa7u4ftM agent
debug1: Authentication succeeded (publickey).
Authenticated to <ip_address> (via proxy).
...
```

Among these logs the most relevant one are these two lines:

```
debug1: Offering public key: /Users/kai/.ssh/id_rsa RSA SHA256:LJnPQHkVlt+cqWslxTzObpDezpdjgIKdfh8qa7u4ftM agent
debug1: Server accepts key: /Users/kai/.ssh/id_rsa RSA SHA256:LJnPQHkVlt+cqWslxTzObpDezpdjgIKdfh8qa7u4ftM agent
```

Here, the logs specified the fingerprint of public key `ssh` used that
authenticated by the remote server. To identify which key pair is used, we'll
need to get the fingerprint of each key pair we have. We can use `ssh-keygen`
to achieve that:

```bash
ssh-keygen -lf ~/.ssh/id_rsa.pub
#=> 2048 SHA256:LJnPQHkVlt+cqWslxTzObpDezpdjgIKdfh8qa7u4ftM kai@KW.local (RSA)
```

If the fingerprint match _(as in this case)_, than you got it. You know that is
the key pair that successfully get accepted by the remote server. However, if
it doesn't match, try to get the fingerprint of other ssh key pair you have
used before.

## How to use only specific keys when `ssh`

I wanted to test out if I could still ssh in to the remote
server after my SSH key is expired my EC2 Instance Connect. However, if I just
use:

```
# my_rsa_key is expired by now
ssh -i my_rsa_key user@ip_address
```

I would always successfully ssh into the remote server _(since I have another
public key placed in the server)_ . So in order to prevent
`ssh` to attempt other public key that might be accepted the remote server, we
need to tell `ssh` to only use the identity file we provide, which can be done
like this:

```bash
# Note that I am passing private key file
ssh -o IdentitiesOnly=yes -i my_rsa_key user@ip_address
```

With this, `ssh` will only attempt to use the identity file you provided in the
command. However, do note that if the file does not exist, `ssh` will still
attempt to use all the identity files you have.

# Wrap Up

Here, I am just sharing another new things I learn from the internet . Hope it
helps!

[0]: https://serverfault.com/questions/339355/how-to-findout-which-key-was-being-used-to-login-for-an-ssh-session
[1]: https://superuser.com/questions/268776/how-do-i-configure-ssh-so-it-doesnt-try-all-the-identity-files-automatically
