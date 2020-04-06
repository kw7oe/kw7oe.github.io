---
title: "Timezone Draft"
date: 2020-04-06T21:26:20+08:00
draft: true
---

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



- https://stackoverflow.com/questions/6663765/postgres-default-timezone
