---
title: "Advent of Code 2018: Day 1 Part 1"
date: 2018-12-01T21:47:00+0800
tags: ["aoc", "elixir"]
---

Advent of Code (AOC) 2018 has finally arrived. This is the first time I participate
in AOC. Last year, when I first heard of AOC, I wanted to participate in it.
But due to heavy workload from university, I just give up on doing it.

This year, it's different, I had graduated and working remotely. Hence, this
year, I can schedule some time to work on this event. I am going to use
`Elixir` to solve the puzzles this year. The codes will be available to
my [GitHub repo][2].

If things go well, I might continue writing down my journey on solving
the puzzles of AOC 2018.

Without further ado, let's start discussing the [puzzles of Day 1][1].

## Part 1

Part 1 is straightforward. A list of frequencies will given, and we have to sum up
the frequencies. For example, from the problem descriptions:

```
Here are other example situations:

    +1, +1, +1 results in  3
    +1, +1, -2 results in  0
    -1, -2, -3 results in -6
```

So, the question of part 1 is:

```
Starting with a frequency of zero, what is the resulting frequency after all of the changes in frequency have been applied?
```

Straight forward and easy right?

**So here is the puzzle inputs:**

```
-9
+7
+5
-13
+6
...
-23
-46
-27
-11
-75223
```

**Solution:**

```elixir
case File.read("input.txt") do
  {:ok, content} ->
    content
    |> String.split()
    |> Enum.map(&String.to_integer/1)
    |> Enum.sum
    |> IO.inspect
  {:error, _} -> IO.puts "Error opening files"
end
```

1. First, we read in the input from `input.txt` using `File.read/1`
2. Next, we split the content by newline using `String.split/1`.
   Now, we have a list of string representing the frequency.
3. Then, we map through the list with `Enum.map/2` and convert the string
   to integer using `String.to_integer/1`.
4. Lastly, we call `Enum.sum/2` to sum frequencies, which loops through every
   element in the list and add it up.

**Performance:**
It takes around 0.3 seconds to compute the answer.

```
$ time elixir part-1.ex

real	0m0.350s
user	0m0.321s
sys	0m0.155s
```

Day 1 Part 1, Done.

---

_Read Part 2 [here][3]._

[1]: https://adventofcode.com/2018/day/1
[2]: https://github.com/kw7oe/advent-of-code-2018
[3]: /aoc/elixir/2018/12/01/advent-of-code-2018-day-1-part-2.html
