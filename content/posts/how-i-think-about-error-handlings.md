---
title: "How I Think About Error Handling"
date: 2020-10-24T20:00:31+08:00
draft: true
---

In this post, I attempt to conceptualize about how I think about error
handling when writing software.

In short, I think there are generally two types of error:

- Broken Invariant
- User facing:
  - Fixable
  - Unfixable


## Broken Invariant

The first type of error is basically broken invariant. Invariant
is a property that remain unchanged. In our context, put it simpler, it's
basically the expectation you have from the system or the assumption you make
when writing the code.

Broken invariant, is often fixable. However, it's not something you can rescue
in runtime of your system. It can be fixed, by modifying your code, or to
change your assumption of the system.

For example, let's say we are writing a register function in a web application,
where we are require to also create the user on external party _(E.g. Stripe
customer, AWS Cognito or Firebase Auth)_:

```elixir
def register(params) do
  with {:ok, user} <- create_user(params),
       # Here we make an assumption that user will always have attribute, `id`
       # and `email`
       {:ok, stripe_user} <- create_stripe_customer(user.id, user.email) do
   {:ok, user}
  end
end
```

On our second line, we have a invariant where successfully created user, will
always have `id` and `email`. Hence, if the function `create_stripe_customer`
throws an error because of `email` is not found in `user`, then our invariant
is broken. What can we do regarding this error:

- Can we fix it on runtime? Nope.
- Can we fix it by changing the code? Yeap. If things go wrong there, is
  probably something wrong with the return value in `create_user`

Having invariant in our system is not bad. It keep us sane and make the system
easier to reason with. It abstract some of the complexity from the system.

And should you attempt to handle the error of a broken invariant? Generally
speaking, no. You should let it throw error, so you get notified.

## User Facing

User facing error is basically any error that might be faced by a user probably
due to their inputs. For example, user might submit an incorrect
password combination, which in turn get an error from the server.

Generally, to decide how to handle user facing error, these are the two
questions you can ask:

- Is there any action by the user that can overcome this error? E.g enter the
  right information.
- Is there any action by the system that can prevent this error to be presented
  to the end user? E.g expecting user to have a payment record, however nothing
  is found, so let's create one for them.

### Error that require user action

For error that require user action, it is crucial to have a good error message.
Error handling is generally very easy to handle, just return an appropriate
error message, and allow the client to display the messages to the user.

### Error that require developer action

Some errors, for example, are due to broken invariants that can be "fixed" on
runtime. For example, you might have a update profile endpoint, where you
expect user to have `profile` record in the database.

However, in some edge cases, you have this `user` that doesn't have any
`profile` associated, and causing your `update_profile` function called to
throw error.

So, your initial code looks something like this:

```elixir
def update_profile(user_id, params) do
  with {:ok, profile} <- get_profile_by(user_id),
       {:ok, profile} <- do_update_profile(profile, params) do
    {:ok, profile}
  end
end

update_profile("id-without-profile", %{name: "John Wick"})
# => {:error, :profile_not_found}
```

However, since the invariant is every user have a profile, we can actually
enforce this in runtime by just creating `profile` record when one is not found
instead of throwing an error:


```elixir
def update_profile(user_id, params) do
  profile = find_or_create_profile!(user_id)
  do_update_profile(profile, params)
end

def find_or_create_profile!(user_id) do
  case get_profile_by(user_id) do
    {:ok, profile} -> {:ok, profile}
    {:error, :profile_not_found} ->
      user = get_user!(user_id)
      # In reality, this might fail if there is a race condition,
      # so you might want to try catch it to refetch profile again
      # if a error is throw due to foreign constraint.
      profile = create_profile!(user)
      {:ok, profile}
  end
end

update_profile("id-without-profile", %{name: "John Wick"})
# => {:ok, %Profile{}}
```

Notice that, we are using `!` here for our `find_or_create_profile!` function
because we are expecting to always be success. This is because:

- The function basically take in inputs that is derived from the system or code
  itself. No additional inputs other than `user_id` is provided.
- Does it mean it would never throw error? No, there are still occasion that it
  might throw error, for example, when our database service went down and we
  can't save to the database successfully. However, all this kind of error,
  is due to the broken our assumption when we write this part of the code.
  This allow us to focus on the business logic itself. Furthermore, there are
  some error that you can't just handle or don't know how to handle gracefully
  where throwing, letting it crash is probably the best approach.

### Error that doesn't require any action

Some error, doesn't really require any action. For example, there is nothing
you can do on runtime when your database/external service is down other than
retrying with backoff and jitter.  Other type of error might require you to
deploy a fix.

So for this kind of error, it's always good to let it fail loudly, so you get
notified and take appropriate action.


# Further Readings:

Here are some of the readings that heavily influence my thought around
error handling. Highly recommend it.

They probably write it 100x better than me.


- [Let it crash (the right
  way...)](https://mazenharake.wordpress.com/2009/09/14/let-it-crash-the-right-way/)
- [Building for reliability at
  HelloSign](https://dropbox.tech/application/building-for-reliability-at-hellosign)

