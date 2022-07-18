---
title: "Writing PostgreSQL Extension in Rust With pgx"
date: 2022-07-18T15:53:46+08:00
draft: true
tags: ['rust', 'postgresql']
---

Recently, I came across how to write a PostgreSQL extension in Rust with `pgx`
from this [article][0] by [pganalyze][6]. I decided to play around with it. It turns
out to be very straightforward to learn and write a PostgreSQL extension!

`pgx` does make it easy to write a PostgreSQL extensions in Rust! All the code of
this post are written in an evening _(a couple of hours)_ as a first timer learning about
PostgreSQL extension and `pgx`.

In this post, we are going to first walk-through the basic of using `pgx` to
write a PostgreSQL extension. Then, we are going to implement some custom
string manipulation function such as `to_title` and `emojify` and expose it to
PostgreSQL to be used.

The posts will be structured as:

- [Getting Started](#getting-started)
- [Your First Extension](#your-first-extension)
- [`to_title` function](#to_title-function)
- [`emojify` function](#emojify-function)

Please skip to the last 2 sections if you are already well versed with `pgx` or
prefer to follow the [official README][1].

## Getting Started

`pgx` have a great README and examples in their repository, so getting started
is just as easy as following their [instructions][1] in the README. At the time of
this writing, here's the steps needed:

```bash
# Install cargo-pgx to make developing PostgreSQL extension
# with pgx easily.

# You'll going to use it the most during your development
# and testing.
cargo install cargo-pgx

# Initialize pgx so it installed the dependencies it needed.
# You'll only need to run it once.
cargo pgx init
```

With this, you're all setup to write your first PostgreSQL extension in Rust.

## Your First Extension

Let's write an Hello World example as usual. With `pgx`, we can use the
following command to generate our PostgreSQL extension project:

```
$ cargo pgx new hello_world
```

Let's take a look at the generated `src/lib.rs`:

```rust
use pgx::*;

pg_module_magic!();

#[pg_extern]
fn hello_hello_world() -> &'static str {
    "Hello, hello_world"
}

#[cfg(any(test, feature = "pg_test"))]
#[pg_schema]
mod tests {
    use pgx::*;

    #[pg_test]
    fn test_hello_hello_world() {
        assert_eq!("Hello, hello_world", crate::hello_hello_world());
    }

}

#[cfg(test)]
pub mod pg_test {
    pub fn setup(_options: Vec<&str>) {
        // perform one-off initialization when the pg_test framework starts
    }

    pub fn postgresql_conf_options() -> Vec<&'static str> {
        // return any postgresql.conf settings that are required for your tests
        vec![]
    }
}
```

We can see that the file contain three code sections: the implementation, tests
and tests setup. For the rest of our post, we will mainly focus on writing the
implementations and tests.

And in fact, our first extension of Hello World is done. Let's run it!

```rust
cargo pgx run pg14
```

Then, before we run our `hello_hello_world` function, we will need to load
the extension first using `CREATE EXTENSION` command:

```sql
hello_world=# CREATE EXTENSION hello_world;
CREATE EXTENSION

hello_world=# select hello_hello_world();
 hello_hello_world
--------------------
 Hello, hello_world
```

## `to_title` function

Well, that's kind of like cheating. So let's write our very first own
extension, a `to_title` function, which:

> Convert a string to title case.

{{% callout class="warning" %}}

In reality, you might not need this and should just transform it at the
application layer.

{{% /callout %}}

Writing a function is pretty straightforward, it's very similar to writing your
usual Rust function with some caveats. For example, you'll have to ensure
that the arguments and return type of the function is correct. Be sure to check
out the documentation of `pgx` or [here][2].

Enough of intro, let's write some code:

```rust
#[pg_extern]
fn to_title(string: &str) -> String {
}
```

Every function we want to expose to PostgreSQL will need to be annotate with
the `#[pg_extern]`. Here we take in a `&str` _(which are zero-copy)_ and return
a `String` for our function.

The actual implementation of `to_title` is as followed:

```rust
string
    .split(' ')
    .map(|word| {
        word.chars()
            .enumerate()
            .map(|(i, c)| {
                if i == 0 {
                    c.to_uppercase().to_string()
                } else {
                    c.to_lowercase().to_string()
                }
            })
            .collect()
    })
    .collect::<Vec<String>>()
    .join(" ")
```

Hopefully the code is self explainable:

1. We first split the input by space. Alternatively, we could take in the
splitter character from the user as well.
2. Map through each `word`, for each character of the word, we either covert it
to uppercase or lowercase depending on the position, and finally we collect
it to a `String`.
3. Then, collect all the transformed word into a `Vec<String>` and join it
back with space again.

There's probably a more performant and efficient implementation. Let's also
write a simple test case to verify our implementation:

Under `mod tests`:

```rust
#[pg_test]
fn test_to_title() {
    assert_eq!("My Cool Extension", crate::to_title("my cool extension"));
}
```

Now, let's test it by running `cargo test`:

```bash
running 2 tests
building extension with features ` pg_test`
"cargo" "build" "--features" " pg_test" "--message-format=json-render-diagnostics"
   Compiling hello_world v0.0.0 (/Users/kai/workspace/rust/extension/hello_world)
    Finished dev [unoptimized + debuginfo] target(s) in 4.11s

installing extension
     Copying control file to /Users/kai/.pgx/13.7/pgx-install/share/postgresql/extension/hello_world.control
     Copying shared library to /Users/kai/.pgx/13.7/pgx-install/lib/postgresql/hello_world.so
 Discovering SQL entities
  Discovered 5 SQL entities: 1 schemas (1 unique), 4 functions, 0 types, 0 enums, 0 sqls, 0 ords, 0 hashes, 0 aggregates
     Writing SQL entities to /Users/kai/.pgx/13.7/pgx-install/share/postgresql/extension/hello_world--0.0.0.sql
    Finished installing hello_world
test tests::pg_test_to_title ... ok
test tests::pg_test_hello_hello_world ... ok

test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 5.55s

Stopping Postgres
```

Notice that, we are using the `#[pg_test]` annotations instead of `#[test]`.
This allow `pgx` to run the unit test in-process within PostgreSQL. Hence, that
explain the `Stooping Postgres` text in the end of our output.

You'll notice that `pgx` also help you to install the extension by coping some
files that are required by PostgreSQL for an extension.

If you change the `#[pg_test]` to `#[test]`, the test would be run as normal
Rust unit test:

```bash
running 2 tests
test tests::test_to_title ... ok # <-- Rust test get run first

building extension with features ` pg_test`

# ... running other test in Postgres

Stopping Postgres
```

{{% callout %}}

If you ever faced a weird issue where your tests failed even after you fixed
the implementation, try to run `cargo clean` and rerun the tests.

It seems like there's some bug where if a test failed at first, the subsequent
tests will continue to fail. Personally, I faced it in my machine but it could
be just me.

{{% /callout %}}

Now, let's run it in our PostgreSQL:

```bash
cargo pgx run pg14
```

Once you have the `psql` session running, you can check if your extension and
function is available by running the following command:

```bash
# List all the installed extensions
\dx

                   List of installed extensions
    Name     | Version |   Schema   |         Description
-------------+---------+------------+------------------------------
 hello_world | 0.0.0   | public     | hello_world:  Created by pgx
 plpgsql     | 1.0     | pg_catalog | PL/pgSQL procedural language
(2 rows)

# List all functions
\df

                             List of functions
 Schema |       Name        | Result data type | Argument data types | Type
--------+-------------------+------------------+---------------------+------
 public | hello_hello_world | text             |                     | func
(1 row)
```

You'll notice that our new function is not added, so we'll have to reload our
extension by dropping it and creating it again:

```sql
drop extension hello_world; create extension hello_world;
```

Running `\df` again should show you the following:

```
                             List of functions
 Schema |       Name        | Result data type | Argument data types | Type
--------+-------------------+------------------+---------------------+------
 public | hello_hello_world | text             |                     | func
 public | to_title          | text             | string text         | func
(2 rows)
```

Now we can finally test out our `to_title` function:

```sql
select to_title('this is so cool');

    to_title
-----------------
 This Is So Cool
(1 row)
```

With `pgx`, writing a PostgreSQL custom function is really like writing your day to day Rust
function.

The `to_title` function is too simple to write, let's try something slightly
more complex. Something that need an external crate.

## `emojify` function

Next, let's write a `emojify` function that:

> Convert the :shortcode: in a string to emoji.

For example:

| Input | Output |
| --- | --- |
| pgx is so cool :100: | pgx is so cool 💯 |


It should also handle multiple emoji seamlessly.


{{% callout class="warning" %}}

In reality, you might not need this as well since you could probably convert it
in the frontend...

{{% /callout %}}

It turns out that in Rust, we have the amazing [`emojis`][3] crate that we can
use to implement our function. The `emojis` crate provide a
`get_by_shortcode` function to get the emoji by GitHub shortcode.

If you are using the Rust version 1.62.0 and above, you can add the crate by
using `cargo add`:

```bash
cargo add emojis
```

Alternatively, add the following to your `Cargo.toml`:

```toml
[dependencies]
emojis = "0.4.0"
```

With that, implementing the `emojify` function will be pretty straightforward:

```rust
#[pg_extern]
fn emojify(string: &str) -> String {
    string
        .split(' ')
        .map(|word| {
            let chars = word.chars().collect::<Vec<char>>();
            match &chars[..] {
                [':', shortcode @ .., ':'] => {
                    emojis::get_by_shortcode(&shortcode.iter().collect::<String>())
                        .unwrap()
                        .to_string()
                }
                _ => word.to_string(),
            }
        })
        .collect::<Vec<String>>()
        .join(" ")
}
```

As usual, we take in `&str` and return `String` for our function. In the
function, we basically:

1. Split the string by space.
2. Map through each word to check if they are in the format of `:shortcode:`.
   We are using slice pattern matching here to match the string, so we'll need
   to covert it into a `Vec<char>` first.
3. If the pattern matched, we get the shortcode by calling `emojis` function
   and then convert it to String. Else, we return the word unmodified.
4. Lastly, we collect the words into `Vec<String>` and then join it back
    with space.

As usual, let's write a test as well for our function:

```rust
#[pg_test]
fn test_emojify() {
    assert_eq!("pgx is so cool 💯", crate::emojify("pgx is so cool :100:"));
    assert_eq!(
        "multiple emojis: 💯 👍",
        crate::emojify("multiple emojis: :100: :+1:")
    );
}
```

Running `cargo test` should show that all of your tests have passed
successfully. Now, let's run it in PostgreSQL:

```bash
cargo pgx run pg14
```

As usual, running `\df` will show that our new `emojify` function is not
loaded, so let's reload our extension:

```sql
drop extension hello_world; create extension hello_world;
```

Then we can test it by:

```
hello_world=# select emojify('pgx is so cool :100: :+1: :heart:');
       emojify
----------------------
 pgx is so cool 💯 👍 ❤️
(1 row)
```

Yet another PostgreSQL function has been written in Rust.

Notice that here, we didn't implement a proper handling. So `emojify` a
string contain an invalid shortcode will throw an error as shown below:

```
hello_world=# select emojify('pgx is so cool :100: :+1: :love:');
ERROR:  called `Option::unwrap()` on a `None` value
CONTEXT:  src/lib.rs:39:26
```

## Wrap Up

These are not the only thing we can do with `pgx` and PostgreSQL extension, if you would like
to learn more, feel free to look into the [`pgx` examples][4]. Some of the
examples also includes a link to a Twitch video highlight. For instance, I find
the ["Bad Postgres Extension Ideas" with PGX][5] highlight to be really interesting!


[0]: https://pganalyze.com/blog/5mins-postgres-custom-aggregates-rust-sql-pgx
[1]: https://github.com/tcdi/pgx/tree/master#getting-started
[2]: https://github.com/tcdi/pgx#most-postgres-data-types-transparently-converted-to-rust
[3]: https://crates.io/crates/emojis
[4]: https://github.com/tcdi/pgx/tree/master/pgx-examples
[5]: https://www.twitch.tv/videos/694514963
[6]: https://pganalyze.com/blog
