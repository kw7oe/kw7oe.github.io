---
title: "TIL: Indexing `NULL` in Oracle Database"
date: 2019-02-18T21:32:00+0800
tags: ["til", "database index"]
aliases: ["/til/database index/2019/02/18/til-indexing-null-in-oracle-database.html"]
---

Oracle database does not index a row if all the indexed columns are `NULL`

For instance, let say we have a `users` table where we index `role` column to improve the query performance.

```sql
SELECT * from users WHERE role IS NULL
```

The index does not work for such query in Oracle database. This is because when Oracle database is inserting the new record of `user` where the `role` is `NULL`, it does not add the created row to the index. Hence, the index is not useful when querying with `NULL`

### Solutions

Use a constant expression that can never be `NULL`.

```sql
CREATE INDEX users_role ON users (role, 'user')
```

or we can use a concatenated index (multi-column index) and ensure that the the other column of the index must have a `NOT NULL` constraint.

```sql
CREATE INDEX users_role ON users (role, id)
```

For more detailed explanation and source, refer to [NULL in Oracle Database][1]

---

<small>This post was first appeared in my TIL web application at [here](https://til.kaiwern.com/posts/4).

[1]: https://use-the-index-luke.com/sql/where-clause/null
