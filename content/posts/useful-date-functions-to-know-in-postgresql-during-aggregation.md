---
title: "Useful Date Functions to Know in Postgresql During Aggregation"
date: 2020-03-19T21:43:08+08:00
draft: true
tags: ["postgresql"]
---

The past months, I have been working on the server side of a feature which
deal with grouping records by date and summing up the values.

I have learn a couple of date functions in PostgreSQL that I think might be
useful to write about.


## Context

A bit of context on the feature I worked on. We are building steps counter
feature into our mobile, integrating Apple Health. The data
provided by Apple Health, is especially interesting as they provide the steps
dataset in an hourly interval.

So on the database, we will have a `steps` table as follow:

| Column      | Type                     |
| ----------- | ------------------------ |
| id          | int                      |
| count       | int                      |
| started_at  | timestamp with time zone |
| ended_at    | timestamp with time zone |
| user_id     | int                      |

And this is how the records will looks like:

| Field      | Value                  |
|------------|------------------------|
| id         | 1                      |
| count      | 34                     |
| started_at | 2020-02-26 13:00:00+08 |
| ended_at   | 2020-02-26 14:00:00+08 |
| user_id    | 1                      |

| Field      | Value                  |
|------------|------------------------|
| id         | 2                      |
| count      | 319                    |
| started_at | 2020-02-26 12:00:00+08 |
| ended_at   | 2020-02-26 13:00:00+08 |
| user_id    | 1                      |

We then have a endpoint which provide aggregated data of users
steps count for a specific date range _(this week/month, previous week/month
and etc)_. So basically, to implement the feature we need to:

- Group users steps by date range _(week, month, year)_.
- Sum up users `steps.count` after grouping.
- Populate labels according to provided date range.
  - When range is week, the labels should indicate `Sun..Sat`
  - When range is month, the labels should indicate `1..31`
  - When range is year, the labels should indecate `Jan..Dec`.

Since we are storing the timestamp as `UTC` and our users are using `GMT +8`
timezone, we will also need to consider the timezone while querying the data.
For example, the beginning of a day and end of day of `GMT +8` will be
represented as follows in `UTC`:

```
2020-03-22 16:00:00 to 2020-03-23 15:59:59
```

## Let the lesson begins

Okay, enough of boring context. By implementing the feature above, we are going
to learn the following date functions in PostgreSQL:

- Truncate date with `date_trunc`
- Extract date parts, such as weekday, month and year with `date_part`.
- Format date with `to_char`
- `inserted_at > localtimestamp - interval '14 days'` to list records created
  for the past 14 days.

### Setup

For those who want to get their hands dirty, you can run the following scripts
to setup your database environment to play around with as you go through the
article:

```bash
$ createdb step_db
$ psql step_db
```

Then, copy and paste the following SQL statement into your `psql` console.

1. Create `steps` table.
```sql
CREATE TABLE "steps" (
  "id" SERIAL,
  "count" integer,
  "start_at" timestamptz,
  "end_at" timestamptz,
  "user_id" integer,
  PRIMARY KEY ("id"));
```

2. Insert data from `2020-01-01` to `2020-01-07` at UTC.
```sql
INSERT INTO "steps" (count, start_at, end_at, user_id)
SELECT floor(random() * 50 + 1)::int, d, d + interval '59 minutes 59 seconds', 1
FROM generate_series('2020-01-01'::timestamptz,
                         '2020-01-07 00:00:00'::timestamptz,
                         interval '1 hour') as d;

```

### Grouping records by day with `date_trunc`

Since, our steps value are inserted as hourly instead of daily. We need to
write a query to group the steps count by the date and sum it up. So ideally, the
result should return something like:

| total_count | date       |
|-------------|------------|
| 3423        | 2020-01-01 |
| 4523        | 2020-01-02 |

At the very first sight, I thought we could do something like this and it's
done:

```sql
SELECT sum(count) as total_count, start_at as date
FROM steps
GROUP BY start_at
ORDER BY start_at;
```

But then, after running this query, we will notice that it's group by date and
time and return something like this:

| total_count | date                 |
|-------------|------------------------|
| 31          | 2020-01-01 00:00:00+00 |
| 17          | 2020-01-01 01:00:00+00 |
| 31          | 2020-01-01 02:00:00+00 |

To achieve what we want we need to group by just the date of the row. We can
use `date_trunc` function in PostgreSQL to truncate a timestamp up to part of
the timestamp like `day`, `month`, `hour`, and etc.

```sql
SELECT sum(count) as total_count, date_trunc('day', start_at) as date
FROM steps
GROUP BY date_trunc('day', start_at)
ORDER BY date_trunc('day', start_at);
```

which will return:

| total_count | date                   |
|-------------|------------------------|
| 544         | 2020-01-01 00:00:00+00 |
| 712         | 2020-01-02 00:00:00+00 |

Well close enough to what we want, but how do we remove the time
component of the timestamp when SQL return the result? Format it.

### Format Date

Now we have the query for grouping the rows by date and get the sum of the
steps count. The next step is to learn how we can format the timestamp. In
PostgreSQL, there is a `to_char` formatting function that can convert various
data type to formatted string. And it works on timestamp also.

For example, we can use:

```sql
SELECT to_char('2020-01-01'::timestamptz, 'YYYY-MM-DD');
-- =>  to_char
--     ------------
--     2020-01-01
```

to format the timestamp to return just it's date component. Now, we can update
our previous SQL query to use it:

```sql
SELECT sum(count) as total_count, to_char(start_at, 'YYYY-MM-DD') as date
FROM steps
GROUP BY to_char(start_at, 'YYYY-MM-DD')
ORDER BY to_char(start_at, 'YYYY-MM-DD');
```

which return this result, exactly what we wanted:

| total_count | date       |
|-------------|------------|
| 544         | 2020-01-01 |
| 712         | 2020-01-02 |


### Extract date part


### Converting provided timestamp to specific timezone.

So, let's start by writing a simple basic query to get all the steps in `2020-01-01`.
At the very first time, we would probably write something like this:

```sql
SELECT * FROM "steps" WHERE start_at => '2020-01-01T00:00:00Z' AND start_at <= '2020-01-01T23:59:59Z';
```

But, that's incorrect since the beginning of a day of `2020-01-01` for a user
in `GMT+8` timezone would be `2019-12-31 16:00:00` instead. So we need to
convert the timestamp to user timezone. To do this, we can utilize `AT TIME
ZONE '<TIMEZONE>`

```
steps_db=# SELECT '2020-01-01' AT TIME ZONE 'GMT+8';
      timezone
---------------------
 2019-12-31 16:00:00
(1 row)

steps_db=# SELECT '2020-01-01'::timestamptz AT TIME ZONE 'GMT+8';
      timezone
---------------------
 2019-12-31 16:00:00
(1 row)

steps_db=# SELECT '2020-01-01'::timestamp AT TIME ZONE 'GMT+8';
        timezone
------------------------
 2020-01-01 08:00:00+00
(1 row)
```


## References:

- https://stackoverflow.com/questions/6663765/postgres-default-timezone
