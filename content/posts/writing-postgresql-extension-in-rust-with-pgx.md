---
title: "Writing PostgreSQL extension in Rust With pgrx"
date: 2022-07-20T10:07:46+08:00
tags: ['rust', 'postgresql', 'pgrx']
slug: "writing-postgresql-extension-in-rust-with-pgx"
---

{{% callout %}}

`pgx` has renamed to `pgrx` in around [April 2023][9]. The following post has
also been updated to replace `pgx` with `pgrx` instead.

{{% /callout %}}

Recently, I came across how to write a PostgreSQL extension in Rust with `pgrx`
from this [article][0] by [pganalyze][6]. I decided to play around with it. It turns
out to be very straightforward to learn and write a PostgreSQL extension!

`pgrx` does make it easy to write a PostgreSQL extensions in Rust! All the code of
this post are written in an evening _(a couple of hours)_ as a first timer learning about
PostgreSQL extension and `pgrx`.

In this post, we are going to first walk through the basic of using `pgrx` to
write a PostgreSQL extension. Then, we are going to implement some custom
string manipulation function such as `to_title` and `emojify` and expose it to
PostgreSQL to be used.

The posts will be structured as:

- [Getting Started](#getting-started)
- [Your First Extension](#your-first-extension)
  - [`to_title` function](#to_title-function)
  - [`emojify` function](#emojify-function)
- [Wrap Up](#wrap-up)

Please skip to the last 2 sections if you are already well versed with `pgrx` or
prefer to follow the [official README][1].

_All the codes are available in [this GitHub repository](https://github.com/kw7oe/pgrx_string_demo)._

## Getting Started

`pgrx` have a great README and examples in their repository, so getting started
is just as easy as following their [instructions][1] in the README. Be sure to
check if you have the [System Requirements][10] as mentioned in the README before
running the following steps.

At the time of this writing, here are the steps needed:

```bash
# Install cargo-pgrx to make developing PostgreSQL extension
# with pgrx easily. You'll be going to use it the most during
# your development and testing.
#
# If the following command failed, please check the
# System Requirements in the README:
#
# https://github.com/pgcentralfoundation/pgrx?tab=readme-ov-file#system-requirements
cargo install --locked cargo-pgrx

# Initialize pgrx, so it installed the dependencies it needed.
# You'll only need to run it once.
cargo pgrx init
```

With this, you're all setup to write your first PostgreSQL extension in Rust.

## Your First Extension

Let's write a Hello World example as usual. With `pgrx`, we can use the
following command to generate our PostgreSQL extension project:

```
$ cargo pgrx new hello_world
```

Let's take a look at the generated `src/lib.rs`:

```rust
use pgrx::prelude::*;

pgrx::pg_module_magic!();

#[pg_extern]
fn hello_hello_world() -> &'static str {
    "Hello, hello_world"
}

#[cfg(any(test, feature = "pg_test"))]
#[pg_schema]
mod tests {
    use pgrx::prelude::*;

    #[pg_test]
    fn test_hello_hello_world() {
        assert_eq!("Hello, hello_world", crate::hello_hello_world());
    }

}

/// This module is required by `cargo pgrx test` invocations.
/// It must be visible at the root of your extension crate.
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
cargo pgrx run pg15
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

Our hello world is done! To quit the `psql`, just type in `\q` and press enter.

### `to_title` function

Well, that's kind of like cheating. So let's write our own
extension for real. We'll start with something simple, a `to_title` function,
which convert a string to title case.

{{% callout class="warning" %}}

In reality, you might not need this and should just transform it at the
application layer.

{{% /callout %}}

Writing a custom PostgreSQL function is straightforward. It's similar to writing your
usual Rust function with some caveats. For example, you'll have to ensure
that the arguments and return type of the function is correct. Be sure to check
out the documentation of `pgrx` or [here][2].

Enough of intro, let's write some code:

```rust
#[pg_extern]
fn to_title(string: &str) -> String {
}
```

Every function we want to expose to PostgreSQL will need to be annotated with
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

There's probably a more performant and efficient implementation. Do let me
know if you managed to come up with a better implementation.

Let's also write a simple test case to verify our implementation:

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
    Building extension with features pg_test pg13
    # ...
test tests::pg_test_hello_hello_world has been running for over 60 seconds
test tests::pg_test_to_title has been running for over 60 seconds
  Installing extension
     Copying control file to /Users/kai/.pgrx/13.14/pgrx-install/share/postgresql/extension/hello_world.control
     Copying shared library to /Users/kai/.pgrx/13.14/pgrx-install/lib/postgresql/hello_world.so
    Finished installing hello_world

    # ...

Success. You can now start the database server using:

    /Users/kai/.pgrx/13.14/pgrx-install/bin/pg_ctl -D /Users/kai/workspaces/hello_world/target/pgrx-test-data-13 -l logfile start

test tests::pg_test_hello_hello_world ... ok
test tests::pg_test_to_title ... ok

test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 84.07s

stopping postgres (pid=80363)
```

Notice that, we are using the `#[pg_test]` annotations instead of `#[test]`.
This allows `pgrx` to run the unit test in-process within PostgreSQL. Hence, that
explain the `stopping postgres` text in the end of our output.

You'll notice that `pgrx` also help you to install the extension by coping some
files that are required by PostgreSQL for an extension.

If you change the `#[pg_test]` to `#[test]`, the test would be run as normal
Rust unit test:

```bash
running 2 tests
test tests::test_to_title ... ok # <---- Rust test get run first
    Building extension with features pg_test pg13
     Running command "/Users/kai/.rustup/toolchains/stable-x86_64-apple-darwin/bin/cargo" "build" "--features" "pg_test pg13" "--no-default-features" "--message-format=json-render-diagnostics"
  Installing extension
     Copying control file to /Users/kai/.pgrx/13.14/pgrx-install/share/postgresql/extension/hello_world.control
     Copying shared library to /Users/kai/.pgrx/13.14/pgrx-install/lib/postgresql/hello_world.so
    Finished installing hello_world
test tests::pg_test_hello_hello_world ... ok

test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 2.26s

stopping postgres (pid=6902)
```


Now, let's run it in our PostgreSQL:

```bash
cargo pgrx run pg15
```

Once you have the `psql` session running, you can check if your extension and
function is available by running the following command: `\dx` and `\df`:

```bash
# List all the installed extensions
\dx

                   List of installed extensions
    Name     | Version |   Schema   |         Description
-------------+---------+------------+------------------------------
 hello_world | 0.0.0   | public     | hello_world:  Created by pgrx
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

With `pgrx`, writing a PostgreSQL custom function is really like writing your day to day Rust
function.

The `to_title` function is too simple to write, let's try something slightly
more complex. Something that need an external crate.

### `emojify` function

Next, let's write a `emojify` function that convert the `:shortcode:` in a string to emoji.
For example:

| Input | Output |
| --- | --- |
| pgrx is so cool :100: | pgrx is so cool 💯 |


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
emojis = "0.6.1"
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
   We are using [slice pattern][8] matching here to match the string, so we'll need
   to convert it into a `Vec<char>` first.
3. If the pattern matched, we get the shortcode by calling `emojis` function
   and then convert it to String. Else, we return the word unmodified.
4. Lastly, we collect the words into `Vec<String>` and then join it back
    with space.

As usual, let's write a test as well for our function:

```rust
#[pg_test]
fn test_emojify() {
    assert_eq!("pgrx is so cool 💯", crate::emojify("pgrx is so cool :100:"));
    assert_eq!(
        "multiple emojis: 💯 👍",
        crate::emojify("multiple emojis: :100: :+1:")
    );
}
```

Running `cargo test` should show that all of your tests have passed
successfully. Now, let's run it in PostgreSQL:

```bash
cargo pgrx run pg15
```

As usual, running `\df` will show that our new `emojify` function is not
loaded, so let's reload our extension:

```sql
drop extension hello_world; create extension hello_world;
```

Then we can test it by:

```
hello_world=# select emojify('pgrx is so cool :100: :+1: :heart:');
       emojify
----------------------
 pgrx is so cool 💯 👍 ❤️
(1 row)
```

Yet another PostgreSQL function has been written in Rust.

Notice that here, we didn't implement a proper handling. So `emojify` a
string contain an invalid shortcode will throw an error as shown below:

```
hello_world=#  select emojify('pgrx is so cool :100: :+1: :love:');
ERROR:  called `Option::unwrap()` on a `None` value
```

## Wrap Up

These are not the only thing we can do with `pgrx` and PostgreSQL extension, if you would like
to learn more, feel free to look into the [`pgrx` examples][4] and [articles][7] section.
Some examples includes a link to a Twitch video highlight. For instance, I find
the ["Bad Postgres Extension Ideas" with PGX][5] highlight to be fascinating!

I haven't tried out writing my own PostgreSQL aggregates, if you want to learn
more about it, I would suggest the following resources:

- [How PostgreSQL aggregation works](https://www.timescale.com/blog/how-postgresql-aggregation-works-and-how-it-inspired-our-hyperfunctions-design-2/)
- [PostgreSQL Aggregates with Rust](https://hoverbear.org/blog/postgresql-aggregates-with-rust/)

The first article by Timescale is really recommended for someone who are new
to the internals of PostgreSQL aggregates, and the second article covers some
basic of `pgrx`, PostgreSQL aggregates and ending up with writing
aggregates in Rust with `pgrx`.

Hopefully, you learn a thing or two from this post!

[0]: https://pganalyze.com/blog/5mins-postgres-custom-aggregates-rust-sql-pgx
[1]: https://github.com/pgcentralfoundation/pgrx/tree/master#getting-started
[2]: https://github.com/pgcentralfoundation/pgrx?tab=readme-ov-file#mapping-of-postgres-types-to-rust
[3]: https://crates.io/crates/emojis
[4]: https://github.com/pgcentralfoundation/pgrx/tree/master/pgrx-examples
[5]: https://www.twitch.tv/videos/694514963
[6]: https://pganalyze.com/blog
[7]: https://github.com/pgcentralfoundation/pgrx/tree/master/articles
[8]: https://blog.thomasheartman.com/posts/feature(slice_patterns)
[9]: https://github.com/pgcentralfoundation/pgrx/issues/1106
[10]: https://github.com/pgcentralfoundation/pgrx?tab=readme-ov-file#system-requirements
