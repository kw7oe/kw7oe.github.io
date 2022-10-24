---
title: "Some useful psql commands to know"
date: 2022-10-24T23:06:38+08:00
tags: ["postgresql", "psql"]
---

### General

If there's only one thing you can takeaway, is the below 2 commands.

- `\?`: Show help for backslash commands.
- `\h [name]`: Show help on SQL commands.

Knowing the frst command, will allow you to quickly find the other commands
you'll need. The second command will basically show the documentation of any
SQL commands. For example, `\h copy` will return the following:

```md
Command:     COPY
Description: copy data between a file and a table
Syntax:
COPY table_name [ ( column_name [, ...] ) ]
    FROM { 'filename' | PROGRAM 'command' | STDIN }
    [ [ WITH ] ( option [, ...] ) ]
    [ WHERE condition ]

COPY { table_name [ ( column_name [, ...] ) ] | ( query ) }
    TO { 'filename' | PROGRAM 'command' | STDOUT }
    [ [ WITH ] ( option [, ...] ) ]

# ...
```

### Formatting:

Sometimes, you might want to quickly know how long does a query take to return
or happen to query a row with a lot of data. The following `psql` meta commands
will help with the issues above:

- `\timing`: Turn on timing of commands _(including SQL commands)_.
- `\x`: Expand output. Useful for data with lots of columns or very long.

Here's, how turning on `\timing` will looks like:

```sql
example=# select count(*) from contents;
 count
-------
    66
(1 row)

Time: 3.875 ms
```

For `\x`, each column of each row will be printed on a separate line as follow:

```sql
example=# select * from tags;
-[ RECORD 1 ]--------------------
id          | 1
name        | html
inserted_at | 2022-09-09 07:06:47
updated_at  | 2022-09-09 07:06:47
-[ RECORD 2 ]--------------------
id          | 2
name        | css
inserted_at | 2022-09-09 07:06:47
updated_at  | 2022-09-09 07:06:47
-[ RECORD 3 ]--------------------
id          | 3
name        | elixir
inserted_at | 2022-09-09 07:06:47
updated_at  | 2022-09-09 07:06:47
```

### Info:

Apart from formatting and some general commands, there are quite a few useful
`psql` meta commands that is useful to get a better overview of our database
schemas, indexes, views and users:

- `\d[+]`: List all tables, views and sequences.
- `\dt[+]`: List all tables.
- `\di[+]`: List all indexes.
- `\dT[+]`: List all data types.
- `\dx`: List all extensions.
- `\du`: List all roles (users).

For example, to know what are the tables available in your database, you can
just use the `\dt` command:

```psql
example# \dt
               List of relations
 Schema |       Name        | Type  |  Owner
--------+-------------------+-------+----------
 public | admin_users       | table | postgres
 public | contents          | table | postgres
 public | contents_tags     | table | postgres
 public | schema_migrations | table | postgres
 public | tags              | table | postgres
```

You could get more information about a particular table by adding the table
at the end. For example, `\d tags`:

```psql
                                          Table "public.tags"
   Column    |              Type              | ... | Nullable | Default
-------------+--------------------------------+-----+----------+----------
 id          | bigint                         |     | not null |   ...
 name        | character varying(255)         |     |          |
 inserted_at | timestamp(0) without time zone |     | not null |
 updated_at  | timestamp(0) without time zone |     | not null |
Indexes:
    "tags_pkey" PRIMARY KEY, btree (id)
    "tags_name_index" UNIQUE, btree (name)
Referenced by:
    TABLE "contents_tags" CONSTRAINT "contents_tags_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES tags(id)
```

Most options also accept an optional `+` behind to show extra information. For
example `\dt+` will include information like persistence, access method and
size of each table.


### Others:

- `\copy`: Copying data from a tables to a file, and vice versa.
- `\! [command]`: Excute command in shell. If no command is provided, it start
an interactive shell.

`\copy` can come in handy when you need to quickly export the data of a table.
Here's how you can quickly export all the rows of a table to a CSV file:

```psql
\copy table_name to 'table.csv';
```

So far, I have not found any usage for `\! [command]`, but I have read
 about how it come in handy for operators.

Anyway, that's all for now, hope you learn something useful!
