---
title: "Essential Date Functions for Grouping in PostgreSQL"
date: 2020-04-14T18:43:08+08:00
tags: ["postgresql"]
---

The past months, I have been working on a feature which
deal with grouping records by date and summing up values.

I have learn a couple of date functions in PostgreSQL that are very useful when
it comes to grouping records together based on datetime column.

In this post, we will go through a bit of the context of the feature I work on,
and we will walk through the process of implementing it. Along the way, I'll
share the date function I learned.


## Context

A bit of context on the feature I worked on. We are building a steps counter
feature into our mobile, integrating Apple Health and Google Fit. The data
provided by Apple Health is especially interesting as they provide the steps
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
But for the simplicity of this post, I'll skip that part, since dealing with
different timezone can be a post for another day.

## Let the lesson begins

Okay, enough of boring context. By implementing the feature above, we are going
to learn the following date functions in PostgreSQL:

- Truncate date with `date_trunc`
- Extract date parts, such as weekday, month and year with `date_part`.
- Format date with `to_char`

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

Do change the series date range if you want to generate more data.

### Grouping records by day with `date_trunc`

Since, our steps value are inserted as hourly instead of daily. We need to
write a query to group the steps count by the date and sum it up. So ideally, the
result should return something like:

| total_count | date       |
|-------------|------------|
| 3423        | 2020-01-01 |
| 4523        | 2020-01-02 |

At the very first sight, you might thought we could do something like this and it's
done:

```sql
SELECT sum(count) as total_count, start_at as date
FROM steps
GROUP BY start_at
ORDER BY start_at;
```

But then, after running this query, it will actually return something like this:

| total_count | date                 |
|-------------|------------------------|
| 31          | 2020-01-01 00:00:00+00 |
| 17          | 2020-01-01 01:00:00+00 |
| 31          | 2020-01-01 02:00:00+00 |

The initial query we wrote, its grouping by datetime instead of date. To achieve
what we want, we need to group by just the date of the row.

To do that, We can use `date_trunc` function in PostgreSQL to truncate a timestamp
up to part of the timestamp like `day`, `month`, `hour`, and etc _(For the full
options, refer [here][0])_.

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

Close enough to what we want, but how do we remove the time
component of the timestamp when SQL return the result? We can format it.

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

So, let's say we wanted to show the label of the count in the format of
weekdays if the results show is in the week range _(from Monday to Sunday)_. We
could also achieve it with `to_char` like this:

```sql
SELECT sum(count) as total_count,
  to_char(start_at, 'YYYY-MM-DD') as date,
  to_char(start_at, 'Dy') as label
FROM steps
GROUP BY to_char(start_at, 'YYYY-MM-DD'), to_char(start_at, 'Dy')
ORDER BY to_char(start_at, 'YYYY-MM-DD');
```

We need to add the formating to the `GROUP BY` also since we are selecting it.
With this, the result will be as follow:

| total_count | date       | label |
|-------------|------------|-------|
| 544         | 2020-01-01 | Wed   |
| 712         | 2020-01-02 | Thu   |

We are using the template patterns of `Dy` here which formatted the date to the
day name such as Mon, Tue, Wed _(For the full list of patterns available, refer
to the [here][1])_.

But, be aware of this approach when we use `ORDER BY` with `to_char` that return alphabet
instead of integer in string. For example, let say we want to group by month and
sum the steps count, we might do something like this:

```sql
SELECT sum(count) as total_count,
  to_char(start_at, 'YYYY-MM') as date,
  --- 'Mon' template pattern  will format 2020-01-01 to 'Jan'
  to_char(start_at, 'Mon') as label
FROM steps
GROUP BY to_char(start_at, 'YYYY-MM'), to_char(start_at, 'Mon')
ORDER BY to_char(start_at, 'Mon');
```

This will not return the order of rows from Jan to Dec, instead it would look
something like this:

| total_count | date    | label |
|-------------|---------|-------|
| 17936       | 2020-04 | Apr   |
| 19160       | 2020-08 | Aug   |
| 3921        | 2020-12 | Dec   |
| 17714       | 2020-02 | Feb   |

where the label is sorted **alphabetically** since the column type is string.

One way to prevent this from happening is used the approach shown above, where we
`ORDER BY to_char(start_at, 'YYYY-MM')` instead, since the value formatted is
integer in string, it will still be sorted as expected.

The other approach would be using `date_part` to extract part of the timestamp
instead of `to_char`. The difference between `date_part` from `to_char` is
`date_part` always return number _(to be exact is `double precision`)_ type.
With `to_char` you have more options to format your date.

```sql
SELECT sum(count) as total_count,
  to_char(start_at, 'YYYY-MM') as date,
  date_part('month', start_at) as label
FROM steps
GROUP BY to_char(start_at, 'YYYY-MM'), date_part('month', start_at)
ORDER BY date_part('month', start_at);
```

which return:

| total_count | date    | label |
|-------------|---------|-------|
| 18701       | 2020-01 | 1     |
| 17714       | 2020-02 | 2     |
| 19495       | 2020-03 | 3     |

## Wrap Up

Through the post, we have gone through the business requirement and
implemented it iteratively using different date function in PostgreSQL. To sum
up:

- `date_trunc` to truncate date. It is useful when our data is stored in date
   time granularity and we want it to group by date/month/year.
- `to_char` to format date. It is very powerful as we can also used it to
  extract part of the date, use it in grouping and etc. But, beware when you
  are using it in `ORDER BY` clause as it is sorted alpabetically.
- `date_part` to extract part of the date. It is useful when we need to extract
  part of the date as integer. Perhaps, we want to use it for calculation or in
  `ORDER BY` clause.

Utilizing these few function I have managed to implement aggregation of data
for different period such as:

- Showing daily steps for the current/past week where labels are Mon, Tues, ...,
  Sun
- Showing daily steps for the current/past month where labels are 1, 2, ..., 31
- Showing monthly steps for the current/past year where labels are Jan, Feb,
  ..., Dec

There are probably more use cases of these date functions that I haven't come
across yet. So, don't let this post limit your usage.

[0]: https://www.postgresql.org/docs/9.1/functions-datetime.html#FUNCTIONS-DATETIME-EXTRACT
[1]: https://www.postgresql.org/docs/9.1/functions-formatting.html#FUNCTIONS-FORMATTING-DATETIME-TABLE
