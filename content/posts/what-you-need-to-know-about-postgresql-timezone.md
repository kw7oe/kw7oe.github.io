---
title: "What You Need to Know About PostgreSQL Timezone"
date: 2021-06-19T23:22:41+08:00
draft: true
---

Intro here.

## Getting and Setting your database timezone.

First and foremost, we need to know how to get and set our current database
timezone.

Let's open a `psql` session to try out.

```shell
psql -U postgres
```

### Show Database Timezone
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

### Set Database Timezone

To change our timezone, we can use the `SET timezone` command:

```postgres
SET timezone="UTC";
SET TIME ZONE 'Asia/Kuala_Lumpur';
```

That's all right? Now our database timezone is updated to `Asia/Kuala_Lumpur`
right?

Let's exit our `psql` session, and reenter into it again:

```
postgres#= \q
psql -U postgres
```

Now if we run `SHOW timezone`, it would be `Asia/Kuala_Lumpur` right? Nope.

```
postgres=# SHOW timezone;
 TimeZone
----------
 Etc/GMT+8
(1 row)
```

Wait what? Didn't we just set our timezone? Yeah, but **`SET timezone` is
actually setting the timezone for your `psql` session**. It's not changing the
underlying timezone for the database.

In order to do that, there are two approach:

1. **Use `ALTER DATABASE` command**

    We can alter our database timezone by using the following command:

    ```sql
    ALTER DATABASE postgres SET timezone TO 'Asia/Kuala_Lumpur';
    ```

    In this case, we are setting the timezone of our `postgres` database.
    You might want to change the value to your database name.

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

    However, the changes will not reflect until you manually commnd PostgreSQL
    to reload the new configuration. This can be done with:

    ```sql
    select pg_reload_conf();
    ```

    Now `show timezone` will reflect the updated timezone.

    _Note that this will not work if you have previously run the `ALTER DATABASE`
    command to set the database timezone._ You can undo the action by running
    another `ALTER DATABASE postgres SET timezone TO DEFAULT;` command.


## Understanding the difference between `timestamptz` and `timestamp`

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

Here's another similar example using Malaysia timezone:

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

Notice the other small difference this time is, for the column without
explicitly casting, it is type of `timestamp with timezone` since the input
given are with timezone.


### When input timezone is difference from database timezone

When the timezone is different, `timestamptz` and `timestamp` behave
diffrently:

- For `timestamptz`, PostgreSQL will always convert the input datetime to
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

Here you can see that, no convertion is carried out as PostgreSQL when the
timezone is in UTC and the input is without timezone

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
`Asia/Kuala_Lumpur` when we input datetimew without timezone.

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

Similar with the above, no convertion is carried out, the difference with our
UTC example is, instead of saving as `+00` it is saved as `+08` for
`timestamptz`.

For input with timezone, in this case, we are inputting datetime with UTC
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
  timezone. Here are the possible example:
  - Given datetime without timezone info: `2020-01-01 00:00:00`, no conversion is
    carried out and PostgreSQL assume the input to have the same timezone with
    the database. Hence the output is: `2020-01-01 00:00:00+00`.
  - Given datetime with timezone info that is the same with the database
    timezone: `2020-01-01 00:00:00+00`, no conversion is carried out.
  - Given datetime with timezone info that is different than the database
    timezone: `2020-01-01 00:00:00+08`, conversion is carried out.
- For input, without any explicit casting of type, the behaviour depends on the
  input format. Input with timezone info, is casted to `timestamptz`, while
  input without timezone, is casted to `timestamp`



References:

- https://stackoverflow.com/questions/6663765/postgres-default-timezone
