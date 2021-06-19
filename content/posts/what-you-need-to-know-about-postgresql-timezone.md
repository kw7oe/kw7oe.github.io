---
title: "What You Need to Know About Postgresql Timezone"
date: 2021-06-19T23:22:41+08:00
draft: true
---

Intro here.

## Getting and Setting your database timezone.

```shell
psql -U postgres
```

```postgres
postgres=# SHOW timezone;
 TimeZone
-----------
 Etc/GMT+8
(1 row)
```

```postgres
postgres=# SET timezone="UTC";
SET
postgres=# SHOW timezone;
 TimeZone
----------
 UTC
(1 row)
```

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
