---
title: "What You Need to Know About PostgreSQL Timezone"
date: 2021-06-19T23:22:41+08:00
draft: true
---

How many time have you been bitten up by timezone in PostgreSQL?

I'm not sure about you but every time I work with timezone, I get f*cked by it.
Every single time, I have to reread [certain resources][7] and google search again to
make sure I am understanding the behavior of it correctly.

It's time for me to a put a stop on this now. Hence, I'm writing this post to
layout what everyone need to understand and know when dealing with PostgreSQL
timezone.

Throughout this post, you'll learn about:

- [Getting and setting your database
  timezone](#getting-and-setting-your-database-timezone)
- [Understanding the difference between timestamp and timestamptz](#understanding-the-difference-between-timestamp-and-timestamptz)
- [Behaviour of `AT TIME ZONE`](#behaviour-of-at-time-zone)
- [POSIX timezone](#posix-timezone)

I'm going to use `Asia/Kuala_Lumpur` and `UTC` timezone through the post
when demonstrating the behaviour. `Asia/Kuala_Lumpur` is 8 hours ahead UTC (+08).
Do keep that in mind.


# Getting and setting your database timezone

First and foremost, we need to know how to get and set our current database
timezone.

Let's open a `psql` session to try out.

```shell
psql -U postgres
```

## Show Database Timezone
To show the current timezone of our PostgreSQL, it is as simple as:

```postgres
SHOW timezone;
```

**Output:**
```
 TimeZone
-----------
 Etc/GMT+8
(1 row)
```

## Set Database Timezone

To change our timezone, we can use the `SET timezone` command:

```postgres
SET timezone="UTC";
SET TIME ZONE 'Asia/Kuala_Lumpur';
SHOW timezone;
```

**Output:**
```
     TimeZone
-------------------
 Asia/Kuala_Lumpur
 (1 row)
 ```

You can check all of the supported timezone names by using the following query:

```sql
select * from pg_timezone_names;
```

---

Let's exit our `psql` session, and reenter into it again. If
we run `SHOW timezone`, it would be `Asia/Kuala_Lumpur` right? Nope.

```
postgres=# SHOW timezone;
 TimeZone
----------
 Etc/GMT+8
(1 row)
```

**`SET timezone` is actually setting the timezone for your
`psql` session**. It's not changing the underlying timezone
for the database.

In order to do that, there are two approach:

1. **Use `ALTER DATABASE` command**

    We can alter our database timezone by using the following command:

    ```sql
    ALTER DATABASE postgres SET timezone TO 'Asia/Kuala_Lumpur';
    ```

    In this case, we are setting the timezone of our `postgres` database.

2. **Update `postgresql.conf` file, and reload your configuration.**

    Alternatively, you can update your PostgreSQL configuration file. If you
    are not sure where does the file located at, you can use the following
    command to find out:

    ```sql
    postgres=# SHOW config_file;
                                   config_file
    -------------------------------------------------------------------------
     /Users/kai/Library/Application Support/Postgres/var-9.6/postgresql.conf
    (1 row)
    ```

    Then you can go over that file and edit the timezone by searching for the
    `timezone` keyword. You should see something like this and make the changes
    needed:

    ```
    timezone = 'Asia/Kuala_Lumpur'
    ```

    However, the changes will not reflect until you manually command PostgreSQL
    to reload the new configuration. This can be done with:

    ```sql
    select pg_reload_conf();
    ```

    Now `show timezone` will reflect the updated timezone.

    _Note that this will not work if you have previously run the `ALTER DATABASE`
    command to set the database timezone._ You can undo the action by running
    another `ALTER DATABASE postgres SET timezone TO DEFAULT;` command.

_I am able to wrote this up thanks to this [StackOverflow question][8]._

# Understanding the difference between `timestamp` and `timestamptz`

Let start from reviewing the information from the official [PostgreSQL documentation][1] to
understand the difference of these two date time data type.

## Timestamp without time zone
`timestamp` refers to `timestamp without time zone`. Here's excerpt from the
documentation that you need to know:

> In a literal that has been determined to be timestamp without time zone,
> PostgreSQL will silently ignore any time zone indication.
> That is, the resulting value is derived from the date/time fields in the input value,
> and is not adjusted for time zone.

The main takeaway here are:

- PostgreSQL ignore timezone offset when the data type is `timestamp`.
- PostgreSQL derived the value from the date/time fields in the input.
- PostgreSQL do not adjust the input. No conversion will be carried out.

## Timestamp with time zone
`timestamptz` refers to `timestamp with time zone`. There are two key parts you
need to understand about this data type: how PostgreSQL is **storing** the
value and how it **output** the value.

### Storing
Here's the excerpt from the documentation that you need to know on how the value is stored:

> For timestamp with time zone, the internally stored value is always in UTC (Universal Coordinated Time
> , traditionally known as Greenwich Mean Time, GMT). An input value that has an explicit time zone
> specified is converted to UTC using the appropriate offset for that time zone.
> If no time zone is stated in the input string, then it is assumed to be in the time zone indicated
> by the system's TimeZone parameter, and is converted to UTC using the offset for the timezone zone.

The main takeaway here are:

- PostgreSQL always store the value internally in UTC.
- PostgreSQL will convert the input with timezone offset to UTC.
- PostgreSQL will assume the input timezone is the same as the system's
  timezone if no timezone offset is specified.

### Output
Here's the excerpt from the documentation that you need to know on how the value is outputted:

> When a timestamp with time zone value is output, it is always converted from UTC to the current
> timezone zone, and displayed as local time in that zone. To see the time in another time zone,
> either change timezone or use the AT TIME ZONE construct (see Section 9.9.3).

The main takeaway here are:

- PostgreSQL always convert the stored value _(in UTC)_ to the current system
  timezone for output.
- We can use `AT TIME ZONE` construct to see the date time in another time
  zone.

## Examples

After reading the above and you understand the core difference between
`timestamp` vs `timestamptz`, that's great, you can just skip to the next
section.

If you're still feeling confused, spin up your `psql` session and follow along
below. We will be going through two different scenario with two different
system timezone:

1. When input timezone is the same with database timezone
2. When input timezone is different with the database timezone

For a more readable output, you can run `\x` on your `psql` session.

```
\x
Expanded display is on
```

### When input timezone is the same with database timezone
When you are storing your timestamp in the same timezone as your
database timezone, there are no difference between `timestamptz`
and `timestamp` in the final tiemstamp value stored.

The only difference is that the `timestamptz` data will include
the offset (`+00`) with them.

```sql
SET timezone="UTC";
SELECT
  '2020-01-01 00:00:00' as timestamp_wtc,
  '2020-01-01 00:00:00'::timestamp as timestamp,
  '2020-01-01 00:00:00'::timestamptz as timestamptz;
-[ RECORD 1 ]-+-----------------------
timestamp_wtc | 2020-01-01 00:00:00
timestamp     | 2020-01-01 00:00:00
timestamptz   | 2019-01-01 00:00:00+00
```

Here's another similar example using Malaysia timezone where our input is also
specifying the timezone offset as well:

```sql
SET timezone="Asia/Kuala_Lumpur";
SELECT
  '2020-01-01 00:00:00+08' as timestamp_wtc,
  '2020-01-01 00:00:00+08'::timestamp as timestamp,
  '2020-01-01 00:00:00+08'::timestamptz as timestamptz;
-[ RECORD 1 ]-+-----------------------
timestamp_wtc | 2020-01-01 00:00:00+08
timestamp     | 2020-01-01 00:00:00
timestamptz   | 2020-01-01 00:00:00+08
```

Notice the difference for the column `timestamp_wtc` without
explicit type casting. It is now type of `timestamp with timezone` since the
input given are with timezone.


### When input timezone is different from database timezone

When the timezone is different, `timestamptz` and `timestamp` behave
differently:

- For `timestamptz`, PostgreSQL will always convert the input date time to
  the timezone of the database.
- For `timestamp`, PostgreSQL will discard the timezone information and store
  it as it is without timezone provided.

Let's first take a look about what happen when we use the input without
timezone and input with a different timezone.

```sql
SET timezone="UTC";
SELECT
  '2020-01-01 00:00:00' as timestamp_wtc,
  '2020-01-01 00:00:00'::timestamp as timestamp,
  '2020-01-01 00:00:00'::timestamptz as timestamptz;
-[ RECORD 1 ]-+-----------------------
timestamp_wtc | 2020-01-01 00:00:00
timestamp     | 2020-01-01 00:00:00
timestamptz   | 2020-01-01 00:00:00+00
```

Here you can see that, no conversion is carried out  when the
timezone is in UTC and the input is without timezone.

Here's what happen when the input have a timezone of `+08`:

```sql
SET timezone="UTC";
SELECT
  '2020-01-01 00:00:00+08' as timestamp_wtc,
  '2020-01-01 00:00:00+08'::timestamp as timestamp,
  '2020-01-01 00:00:00+08'::timestamptz as timestamptz;
-[ RECORD 1 ]-+-----------------------
timestamp_wtc | 2020-01-01 00:00:00+08
timestamp     | 2020-01-01 00:00:00
timestamptz   | 2019-12-31 16:00:00+00
```

This time for `timestamptz`, PostgreSQL will convert the given time to UTC.
So, `2020-01-01 00:00:00` at Kuala Lumpur, is actually just `2019-12-31
16:00:00` in UTC, since Kuala Lumpur timezone is ahead of UTC by 8 hours.

Let's take a look about what happen if our database timezone is in
`Asia/Kuala_Lumpur` when we input date time without timezone.

```sql
SET timezone="Asia/Kuala_Lumpur";
SELECT
  '2020-01-01 00:00:00' as timestamp_wtc,
  '2020-01-01 00:00:00'::timestamp as timestamp,
  '2020-01-01 00:00:00'::timestamptz as timestamptz;
-[ RECORD 1 ]-+-----------------------
timestamp_wtc | 2020-01-01 00:00:00
timestamp     | 2020-01-01 00:00:00
timestamptz   | 2020-01-01 00:00:00+08
```

Similar with the above, no conversion is carried out, the difference with our
UTC example is, instead of saving as `+00` it is saved as `+08` for
`timestamptz`.

For input with timezone, in this case, we are inputting date time with UTC
timezone:
```sql
SET timezone="Asia/Kuala_Lumpur";
SELECT
  '2020-01-01 00:00:00+00' as timestamp_wtc,
  '2020-01-01 00:00:00+00'::timestamp as timestamp,
  '2020-01-01 00:00:00+00'::timestamptz as timestamptz;
-[ RECORD 1 ]-+-----------------------
timestamp_wtc | 2020-01-01 00:00:00+00
timestamp     | 2020-01-01 00:00:00
timestamptz   | 2020-01-01 08:00:00+08
```

As you can expect, PostgreSQL convert the `timestamptz` into
`Asia/Kuala_Lumpur` timezone, so it add 8 hours on the value and associated
with `+08` timezone offset.

### Summary

Having too much example here might make it feel over complicated and hard to
understand. In reality, the behavior can be sum up as:

- For `timestamp`, PostgreSQL will ignore the timezone information and store
  the value provided. In our example, regardless of which timezone our database
  is in and which timezone our input is, the value is always consistently shown
  as: `2020-01-01 00:00:00`.
- For `timestamptz`, PostgreSQL always convert the value into the database
  timezone. There are 3 possible type of datetime given:

  | Input Type | Conversion |
  | --- | --- |
  | Datetime without timezone | No |
  | Datetime with same timezone | No |
  | Datetime wiht different timezone | Yes |

- For input, without any explicit casting of type, the behaviour depends on the
  input format. Input with timezone info, is casted to `timestamptz`, while
  input without timezone, is casted to `timestamp`

# Behaviour of `AT TIME ZONE`

As mentioned above, we can use `AT TIME ZONE` to convert the date time stored
to a different timezone. Sounds easy to understand right? But, always
refer to the documentation first to understand the behavior.

According to [PostgreSQL documentation][2]:
> The AT TIME ZONE converts time stamp without time zone to/from time stamp with time zone, and time values to different time zones.

Basically, this can be summarized into `AT TIME ZONE`:

- convert datetime of `timestamp` to `timestamptz`.
- convert datetime of `timestamptz` to `timestamp`.
- convert time with timezone to a different timezone.

Hence, given different input type, PostgreSQL will behave differently. Let's
take a look at a few simple examples.

## Using with `timestamptz`

Let's start with converting the timezone using `AT TIME ZONE` for `timestamptz`
input.

```sql
SET TIME ZONE 'UTC';
SELECT '2020-01-01 00:00:00+00'::timestamptz AT TIME ZONE 'Asia/Kuala_Lumpur';
```

Before looking at the return value below, let's try to answer yourself.

...

...

**Output:**

```
      timezone
---------------------
 2020-01-01 08:00:00
(1 row)
```

So it's your answer correct?

Our SQL query is basically asking:

> What are the datetime of `2020-01-01 00:00:00` in `UTC (+00)` timezone when we are converting it to `Asia/Kuala_Lumpur (+08)` timezone?

Since, Kuala Lumpur is 8 hours ahead UTC, it shift the datetime forward.

Notice that as mentioned in the documentation, when we use `AT TIME ZONE` to
change the timezone of a `timestamptz`, the return value will be in `timestamp`.

There shouldn't be any surprise for this use case as it is behaving as what we
expected. Let's take a look at another example.

## Using with `timestamp`

Using `AT TIME ZONE` with input of `timestamp` will behave differently.
However, it's not clear for us in the first sight.

```sql
SET TIME ZONE 'UTC';
SELECT '2020-01-01 00:00:00'::timestamp AT TIME ZONE 'Asia/Kuala_Lumpur';
```

Again, try to answer this yourself first, before looking at the output.

...

...

**Output:**

```
        timezone
------------------------
 2019-12-31 16:00:00+00
(1 row)
 ```

Did you answer `2020-01-01 08:00:00` for this one as well? Don't be ashamed of
getting wrong on this one. I made the same mistakes too. But why PostgreSQL
shift the time backward instead of forward when `Asia/Kuala_Lumpur` is 8 hours
ahead UTC?

With this query, we are basically asking:

> What are the datetime of `2020-01-01 00:00:00` in `Asia/Kuala_Lumpur`
> timezone when we are converting it to \<timezone\>?

But notice that, we didn't specify which timezone we are converting to in our
query.

Unlike using with `timestamptz`, where the timezone of the datetime
input is from the `00:00:00+00` and the timezone to be converted to is from `AT
TIME ZONE 'Asia/Kuala_Lumpur`, for `timestamp` we never specified which
timezone we want PostgreSQL to convert to.

So, what PostgreSQL do, is converting it to the current database timezone,
which we set as `UTC` using `SET TIME ZONE 'UTC';`. So the whole query is
equivalent to asking:

> What are the datetime of `2020-01-01 00:00:00` in `Asia/Kuala_Lumpur`
> timezone when we are converting it to UTC timezone?

Since UTC is 8 hours behind `Asia/Kuala_Lumpur`
timezone, we will need to that shift the datetime backward.

So, in other words the above SQL command is similar to:

```sql
SELECT '2020-01-01 00:00:00+08' AT TIME ZONE 'UTC';
```

```
      timezone
---------------------
2019-12-31 16:00:00
1 row)
```

### Summary

To summarized, when we use `AT TIME ZONE` with `timestamp`, we are saying given
this datetime assuming it is in this timezone. So we essentially convert:

```
2020-01-01 00:00:00
```

to

```
2020-01-01 00:00:00+08
```

with `AT TIME ZONE 'Asia/Kuala_Lumpur`. However, since PostgreSQL need to
display the datetime with the current database timezone, it will convert the
timezone again.


## Summary for `AT TIME ZONE`

Assuming that:
- **`given timezone`**: `Asia/Kuala Lumpur`
- **`current database timezone`**: `UTC`

Calling `AT TIME ZONE` with the above info can be summarized as:

| Input | Query | Explanation | Output |
| --- | --- | --- | --- |
| 2020-01-01 00:00:00+00 (timestamptz) | `SELECT '2020-01-01 00:00:00+00'::timestamptz AT TIME ZONE 'Asia/Kuala_Lumpur';` | Given the input, what are the datetime value after converting to the `given timezone`? | 2020-01-01 08:00:00 (timestamp) |
| 2020-01-01 00:00:00 (timestamp) | `SELECT '2020-01-01 00:00:00'::timestamp AT TIME ZONE 'Asia/Kuala_Lumpur';` | Given the input, assuming it is in the `given timezone`, what are the datetime value after converting to our `current database timezone`? | 2019-12-31 16:00:00+00 (timestamptz) |


# POSIX timezone

Last but not least, is knowing about POSIX timezone. If you notice,
throughout the post, I'm avoiding using `Etc/GMT+8` even though that would
convey the hours different clearer.

If you try to replace all of the example query with `Etc/GMT+8`, you'll realize
why.

```sql
SELECT
  '2020-01-01 00:00:00+00' AT TIME ZONE 'Etc/GMT+8',
  '2020-01-01 00:00:00+00' AT TIME ZONE 'Asia/Kuala_Lumpur';
```

```
-[ RECORD 1 ]-----------------
timezone | 2019-12-31 16:00:00
timezone | 2020-01-01 08:00:00
```

How `Etc/GMT+8` behave on PostgreSQL is totally different from what I expected.
At least before I understand POSIX timezone _(thanks to this [StackOverflow
question][5])_.

In this case, `Etc/GMT+8` is interpreted in POSIX standard.

## What is POSIX timezone standard?

According to [PostgreSQL documentation here][3]:

> The offset fields specify the hours, and optionally minutes and seconds, difference from UTC. They have the format hh[:mm[:ss]] optionally with a leading sign (+ or -). The positive sign is used for zones west of Greenwich. (Note that this is the opposite of the ISO-8601 sign convention used elsewhere in PostgreSQL.) hh can have one or two digits; mm and ss (if used) must have two.


Basically, what most of us understand of, is based on `ISO-8601` sign
convention, where `+` indicate the timezone east _(to the right)_ of Greenwich.

However, in POSIX standard, it's completely opposite, where `+` indicate the
zones west _(to the left)_ of Greenwich.

So, rule of thumb, avoid `Etc/GMT**` if you don't to get yourself confuse.

_If you want to understand about the naming of `Etc/..`, you can refer to this
[Wikipedia article about tz database][4]._

# Wrap Up

Hopefully that's helpful to you. While in this post we cover about PostgreSQL
specifically, it's also important to understand the behaviour of the driver you
are using.

For example, `node-postgres` converts date and timestamp columns into **local**
time based on `process.env.TZ` according to the [documentation][6 ].

So make sure, to stop assuming the behaviour and double check the documentation
when something doesn't behave the way you expected.

[1]: https://www.postgresql.org/docs/12/datatype-datetime.html
[2]: https://www.postgresql.org/docs/12/functions-datetime.html#FUNCTIONS-DATETIME-ZONECONVERT
[3]: https://www.postgresql.org/docs/13/datetime-posix-timezone-specs.html
[4]: https://en.wikipedia.org/wiki/Tz_database#Area
[5]: https://unix.stackexchange.com/questions/104088/why-does-tz-utc-8-produce-dates-that-are-utc8
[6]: https://node-postgres.com/features/types
[7]: https://blog.untrod.com/2016/08/actually-understanding-timezones-in-postgresql.html
[8]: https://stackoverflow.com/questions/6663765/postgres-default-timezone
