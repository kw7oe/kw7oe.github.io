---
title: 'Advent of Code 2018: Day 1 Part 2, How I improve my solution by 34x
faster'
date: 2018-12-01T22:10:00+0800
tags: ['aoc', 'elixir']
---

In the [previous post][1], we had briefly discuss about the solution of Part 1. It
is fairly straightforward. I thought Part 2 is going to be easy too. But man,
I was wrong. It is a bit tricky.

**My initial solution takes around 17 seconds to compute the answer**. I
**made it 34x faster** by changing the data structure. In the end,
the improved solution solves the puzzle in just **0.5 seconds**.

_Code is available at [GitHub][2]. For those who just want to know how the solution
improved by 34x faster, see [here][3]._

Okay, that's the end of some irrelavant stuff. Let's jump straight to the puzzle of Part 2.

## Part 2

Part 2 still uses the same inputs as Part 1.

```
-9
+7 +5
-13
+6
...
-23
-46
-27
-11
-75223
```

This time, the question and scenario are abit different, which make it
tricky.

The problem description states that:

```
You notice that the device repeats the same frequency change list over and over. To calibrate the device, you need to find the first frequency it reaches twice.
```

**For example:**

```
Here are other examples:

    +1, -1 first reaches 0 twice.
    +3, +3, +4, -2, -4 first reaches 10 twice.
    -6, +3, +8, +5, -6 first reaches 5 twice.
    +7, +7, -2, -7, -4 first reaches 14 twice.

Note that your device might need to repeat its list of frequency changes many times before a duplicate frequency is found, and that duplicates might be found while in the middle of processing the list.
```

And the question is:

```
What is the first frequency your device reaches twice?
```

### Problem Breakdown

So the question is asking for the first frequency that reaches twice. But, do
note that **the frequency list can be repeated many times before an asnwer is
found**.

If after the first interation of the frequency list, there is no duplicate
found, the frequency list will go through the second interation again. This
only stops until a duplicate frequency found.

To summarize:

- Find first duplicate of frequency.
- Repeat the frequency list if no duplicate frequency found. <a href="#one"><sup>1</sup></a>
- The initial frequency is 0.
- Upon second iteration, the current frequency will be resumed from the previosu
  iteration. <a href="#two"><sup>2</sup></a>

### Initial Solution

```elixir
defmodule Finder do
  def is_duplicate?(frequency, appeared_frequencies) do
    # Check if the frequency is duplicate in appeared_frequencies
    if Enum.member?(appeared_frequencies, frequency) do

      # Return :halt to halt the reduce_while loop
      # and the duplicate
      {:halt, frequency}
    else
      # Update the appeared_frequencies to include the new frequency

      # Prepend [ element_to_add | rest_of_list ] is used since it
      # has a constant time of adding element to list.
      appeared_frequencies = [ frequency | appeared_frequencies ]

      # Return :cont to continue the reduce_while loop
      # with the frequency and updated appeared_frequencies
      {:cont, {frequency, appeared_frequencies}}
    end
  end

  def accumulate_and_find(frequencies, initial, past_frequencies) do
    frequencies
     # The accumulator for reduce_while is:

     #   initial/prev_frequency -> Initial/Previous Frequency,
     #   past_frequencies/appeared_frequencies -> Past Appeared Frequencies /
     #                                            Appeared Frequencies
    |> Enum.reduce_while({initial, past_frequencies},
      fn (x, {prev_frequency, appeared_frequencies})  ->

        # Calculate the new frequency.
        new_frequency = x + prev_frequency

        # Check if the new frequency is a duplicate

        # Halt if it is.
        # Continue the reduce_while if it is not.
        is_duplicate?(new_frequency, appeared_frequencies)
      end)
  end

  def find_first_duplicate_frequency(frequencies, initial, past_frequencies) do
    case accumulate_and_find(frequencies, initial, past_frequencies) do
      # No duplicates found
      {result, appeared_frequencies} ->
        # Recursively call this method
        # by passing in the frequencies again.

        # However, the next iteration `initial` frequency will be the previous
        # iteration frequency, which is the value of `result`.

        # The `appeared_frequencies in the previous iteration will be pass
        # forward to the next iteration too.

        find_first_duplicate_frequency(frequencies, result, appeared_frequencies)

      # Duplicate found
      result -> result # Return duplicate and end recursive call.
    end
  end
end

case File.read("input.txt") do
  {:ok, content} ->
    frequencies = content
                  |> String.split()
                  |> Enum.map(&String.to_integer/1)

    Finder.find_first_duplicate_frequency(frequencies, 0, [0])
    |> IO.inspect
  {:error, _} -> IO.puts "Error opening files"
end
```

If the comments in the code is not sufficient, here are the more detailed
explanation to help you understand the code _(hopefully)_:

1. First, same as Part 1, we read the content from the file, split it and
   conver every element into integer first.
2. Then, we pass it into `Finder.find_first_duplicate_frequency/3` method,
   with the `frequencies`, initial frequency, and appeared frequencies.
3. In `ind_first_duplicate_frequency`, it will delegate the finding
   duplicate job to `accumulate_and_find/3` and check if the return result
   is a found duplicate or not.
   - If there is no duplicate found, it will call itself recursively, with the same `frequencies`,
     to start the next iteration.
   - The initial frequency will be replaced with the last frequency from the previous iteration.
   - The appeared frequencies from the previous iteration will also be pass forward
     to the next iteration.
4. In `accumulate_and_find/3`, we use `Map.reduce_while/3` to map through each
   elements in the `frequencies` and keep track of the previous frequency and
   appeared frequencies.
   - `reduce_while/3` is used so that we can control when to `halt` the
     looping.
   - It accepts an accumulator, which in this case is our `{ initial, past_frequencies }`, which indicates the state we want to keep track of
     while mapping through the elements
   - It also accepts a function, which in this case, will be used to calculate
     the new frequency, by `new_frequency = x + prev_frequency` and check
     if it is a duplicate using `is_duplicate?/2`.
5. In `is_duplicate?/2`, it basically check if the element already existed
   by `Enum.member/2?`.
   - If it exists, it return `:halt` and the duplicate to the `reduce_while`
     code block. Thus, ending the loop.
   - Else, it return `:cont` with the current frequency and the new appeared
     frequencies to the `reduce_while/3` code block.

**Performance:**

```
$ time elixir part-2.ex

real	0m17.047s
user	0m16.978s
sys	0m0.184s
```

At first, I thought I am having infinity loop and was kind of disappointed as
it was my forth time fixing the solution. Then, I jrealized, it
just take a long time to compute the answer.

After a few hours, I started to think about how to
improve the performance. Then, I realized why it took so long.

### Improved Solution

It is beacuse of the use of `List`. `Enum.member?/2` will iterate through every
single element until it find the member. So, when there is a new element
added to `appeared_frequency`, it has to loop through additional element in the
`Enum.member?/2`.

Looping through the `frequencies` itself is already an _O(n)_ operation. With,
`Enum.member?/2`, that's another _O(n)_ operation.Thus, resulting in a _O(n^2)_
solution.

```elixir
defmodule Finder do

  def is_duplicate?(frequency, appeared_frequencies) do
    # Use Map.has_key?/2 to check if the frequency already existed
    if Map.has_key?(appeared_frequencies, frequency) do
      {:halt, frequency}
    else
      # Use Map.put/3 to add the new frequency in to the map.
      appeared_frequencies = Map.put(appeared_frequencies, frequency, 0)
      {:cont, {frequency, appeared_frequencies}}
    end
  end

  def accumulate_and_find(frequencies, initial, past_frequencies) do
    frequencies
    |> Enum.reduce_while({initial, past_frequencies},
      fn (x, {prev_frequency, appeared_frequencies})  ->
        new_frequency = x + prev_frequency
        is_duplicate?(new_frequency, appeared_frequencies)
      end)
  end

  def find_first_duplicate_frequency(frequencies, initial, past_frequencies) do
    case accumulate_and_find(frequencies, initial, past_frequencies) do
      {result, appeared_frequencies} ->
        find_first_duplicate_frequency(frequencies, result, appeared_frequencies)
      result -> result
    end
  end
end


case File.read("input.txt") do
  {:ok, content} ->
    frequencies = content
                  |> String.split()
                  |> Enum.map(&String.to_integer/1)

    # Subsitute [0] to %{0 => 0} to represent the appeared frequencies.
    Finder.find_first_duplicate_frequency(frequencies, 0, %{0 => 0})
    |> IO.inspect
  {:error, _} -> IO.puts "Error opening files"
end
```

The second solution is just to switch the data structure we used to store the
`appeared_frequencies`. Instead of `List`, we use a `Map`. `Map` has a
constant look up time _O(1)_ to access the element. Hence, it improve the
performance of the solution.

_By using the right data structure, with a change of 3 lines of code,
we successfully improve the execution speed of our program by **34x** faster._

**Performance:**

```
$ time elixir part-2.ex

real	0m0.517s
user	0m0.481s
sys	0m0.188s
```

Day 1 Part 2, Done.

---

**Footnote**

1.  <small id="one">
    At first, I didn't notice this and submitted the wrong answer.
    </small>
2.  <small id="two">
    Then I submitted the wrong answer again, as I didn't use the last frequency
    from the previous iteration while starting the next iteration...
    </small>
3.  <small id="three">I replace the data structure to keep track
    of the appeared frequencies _(which required lookup)_ from `List` to `Map`.
    </small>

[1]: /aoc/elixir/2018/12/01/advent-of-code-2018-day-1-part-1.html
[2]: https://github.com/kw7oe/advent-of-code-2018
[3]: #three
