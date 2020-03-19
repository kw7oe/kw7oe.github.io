---
title: "Useful Date Functions to Know in Postgresql During Aggregation"
date: 2020-03-19T21:43:08+08:00
draft: true
tags: ["postgresql"]
---

The past months, I have been working on the server side of a feature which
deal with grouping the records by date and aggregating the values.

I have learn a couple of date functions in PostgreSQL that I think might be
useful to write about.

A bit of context on the feature I worked on. We are building steps counter
feature into our mobile, integrating both Google Fit and Apple Health. The data
provided by Apple Health, is especially interesting as they provide the steps
dataset in an hourly interval.

So on the database, we will have a `steps` table as follow:

| Column      | Type                     |
| ----------- | ------------------------ |
| id          | uuid                     |
| count       | int                      |
| started_at  | timestamp with time zone |
| ended_at    | timestamp with time zone |
| data_source | string                   |
| user_id     | uuid                     |

And this is how the records will looks like:

| Field       | Value                                |
| ---         | ---                                  |
| id          | 9b3ebde7-080b-4a0d-9b66-17ce8c02a177 |
| count       | 34                                   |
| started_at  | 2020-02-26 13:00:00+08               |
| ended_at    | 2020-02-26 14:00:00+08               |
| data_source | apple-health-kit                     |
| user_id     | 75c482db-9f6c-49ad-9ded-f22dc2d6f25c |

| Field       | Value                                |
| ---         | ---                                  |
| id          | a09a0fe6-4f34-4e1f-9d36-bdbe56adfe8d |
| count       | 319                                  |
| started_at  | 2020-02-26 12:00:00+08               |
| ended_at    | 2020-02-26 13:00:00+08               |
| data_source | apple-health-kit                     |
| user_id     | 75c482db-9f6c-49ad-9ded-f22dc2d6f25c |

| Field       | Value                                |
| ---         | ---                                  |
| id          | 2ff5231a-4966-492c-8dda-b49b970ab51b |
| count       | 322                                  |
| started_at  | 2020-02-26 11:00:00+08               |
| ended_at    | 2020-02-26 12:00:00+08               |
| data_source | apple-health-kit                     |
| user_id     | 75c482db-9f6c-49ad-9ded-f22dc2d6f25c |

- Convert date to specific timezone with `AT TIME ZONE`
- Truncate date with `date_trunc`
- Extract date parts, such as weekday, month and year with `date_part`.
- Format date with `to_char`

