---
title: "Why Cache Padding Made Ringbuffer Slower on M4 Pro"
date: 2026-05-19T22:59:30+08:00
draft: true
---

- Implementing a lock free ring buffer based on this article [here][0].
- When running local benchmark, didn't observe any improvement in cache padded implementation. In fact, the cache padded
  one perform way worse, until we keep a local cached copy of the index, which lead to less contention between the reader
  and writer.
- Results are different due to the difference in implementation of memory ordering and atomic instruction in different computer
  architecture.

You can use Instrument to measure it, but I used [`mperf`][1] which call the Apple Private API to measure the same thing.
These are the events we are profiling.

| Event                         | Description                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------  |
| `L1D_TLB_MISS_NONSPEC`        | Retired loads and stores that missed in the L1 Data TLB.                      |
| `L1D_CACHE_MISS_ST_NONSPEC`   | Retired stores that missed in the L1 Data Cache.                              |
| `L1D_CACHE_MISS_LD_NONSPEC`   | Retired loads that missed in the L1 Data Cache.                               |
| `L1D_CACHE_WRITEBACK`         | Dirty cache lines written back from the L1D Cache toward the Shared L2 Cache. |
| `L1D_CACHE_MISS_ST`           | Stores that missed the L1 Data Cache.                                         |
| `L1D_CACHE_MISS_LD`           | Loads that missed the L1 Data Cache.                                          |
| `ST_UNIT_UOP`                 | Uops that flowed through the Store Unit.                                      |
| `LD_UNIT_UOP`                 | Uops that flowed through the Load Unit.                                       |

## M4 Pro CPU Architecture

- L1 Data Cache
- L1 Instruction Cache
- Size of Cache Line

## Methodology

Run two `mperf` command targeting two set of events, mimicking L1D request sample and L1D Cache Miss CPU counters profile in
Instrument.

## Code

Ring buffer push and pop implementation:

```rust
impl<T: Default + Copy, const N: usize> Producer<T, N> {
    pub fn push(&self, value: T) -> Result<()> {
        let head = self.inner.head.load(std::sync::atomic::Ordering::SeqCst);
        let mut new_head = head + 1;

        if new_head == self.inner.buffer_len() {
            new_head = 0;
        }

        if new_head == self.inner.tail.load(std::sync::atomic::Ordering::SeqCst) {
            return Err("Full".to_string());
        }

        unsafe {
            let buffer = &mut *self.inner.buffer.get();
            buffer[head] = value;
        }

        self.inner
            .head
            .store(new_head, std::sync::atomic::Ordering::SeqCst);

        Ok(())
    }
}

impl<T: Default + Copy, const N: usize> Consumer<T, N> {
    pub fn pop(&self) -> Option<T> {
        let head = self.inner.head.load(std::sync::atomic::Ordering::SeqCst);
        let tail = self.inner.tail.load(std::sync::atomic::Ordering::SeqCst);
        if head == tail {
            return None;
        }

        let result = unsafe {
            let buffer = &*self.inner.buffer.get();
            buffer[tail]
        };
        let mut next_tail = tail + 1;

        if next_tail == self.inner.buffer_len() {
            next_tail = 0;
        }

        self.inner
            .tail
            .store(next_tail, std::sync::atomic::Ordering::SeqCst);

        Some(result)
    }
}
```


Benchmark code:
```rust
fn run_roundtrip<P, C>(version: &str, iterations: usize, new_ring: impl FnOnce() -> (P, C))
where
    P: ProducerLike + Send + 'static,
    C: ConsumerLike + Send + 'static,
{
    let (producer, consumer) = new_ring();
    let start = Instant::now();

    let consumer_thread = thread::spawn(move || {
        for expected in 0..iterations as u64 {
            loop {
                if let Some(value) = consumer.pop_value() {
                    assert_eq!(value, expected, "values not matching");
                    black_box(value);
                    break;
                }
            }
        }
    });

    for value in 0..iterations {
        let value = black_box(value as u64);

        loop {
            if producer.push_value(value) {
                break;
            }
        }
    }

    consumer_thread.join().unwrap();
    let elapsed = start.elapsed();

    println!(
        "version={version} iterations={iterations} elapsed={:.3?}",
        elapsed
    );
}
```

## Analyising the results

In v2, we are using `SeqCst` when for both `load` and `store` operations.

| Events                      |             v2 | v2_cache_padded | Ratio |
| --------------------------- | -------------: | --------------: | ----: |
| elapsed (nonspec)           |         1.040s |          4.187s | 4.026x |
| cycles (nonspec)            |  8,748,741,102 |  35,992,950,938 | 4.114x |
| L1D_TLB_MISS_NONSPEC        |         12,715 |          15,197 | 1.195x |
| L1D_CACHE_MISS_ST_NONSPEC   |      2,811,845 |         234,585 | 0.083x |
| L1D_CACHE_MISS_LD_NONSPEC   |     46,444,477 |     295,365,488 | **6.360x** |
| elapsed (cache/uop)         |      734.905ms |          3.849s | 5.237x |
| cycles (cache/uop)          |  6,043,723,843 |  32,843,291,491 | 5.434x |
| L1D_CACHE_WRITEBACK         |     46,974,892 |     198,264,150 | **4.221x** |
| L1D_CACHE_MISS_ST           |    134,039,697 |       2,371,575 | 0.018x |
| L1D_CACHE_MISS_LD           |    318,232,621 |   2,872,467,574 | **9.026x** |
| ST_UNIT_UOP                 |  1,372,782,816 |   8,721,689,179 | 6.353x |
| LD_UNIT_UOP                 |  1,726,871,437 |  12,572,211,612 | 7.280x |

Among these events, what stand out the most is the L1D cache miss during load operation, for both retired and speculative. We observed
**6x** and **9x** more cache miss during load in L1 Data Cache. On top of that, there's also **4x** more cache writeback.

---

In v3, we are using `Acquire` and `Release` when for both `load` and `store` operations.

| Events                      |             v3 | v3_cache_padded |   Ratio |
| --------------------------- | -------------: | --------------: | ------: |
| elapsed (nonspec)           |      730.333ms |          3.607s |  4.939x |
| cycles (nonspec)            |  6,109,213,871 |  30,874,337,634 |  5.054x |
| L1D_TLB_MISS_NONSPEC        |          8,514 |          15,577 |  1.830x |
| L1D_CACHE_MISS_ST_NONSPEC   |        500,378 |         308,513 |  0.617x |
| L1D_CACHE_MISS_LD_NONSPEC   |      5,413,463 |     269,768,920 | 49.833x |
| elapsed (cache/uop)         |      972.801ms |          3.365s |  3.459x |
| cycles (cache/uop)          |  8,170,676,219 |  28,849,091,552 |  3.531x |
| L1D_CACHE_WRITEBACK         |     57,088,356 |     185,909,045 |  3.257x |
| L1D_CACHE_MISS_ST           |     85,393,202 |       6,393,653 |  0.075x |
| L1D_CACHE_MISS_LD           |    627,723,837 |   3,489,317,664 |  5.559x |
| ST_UNIT_UOP                 |  2,064,154,435 |  11,207,052,858 |  5.429x |
| LD_UNIT_UOP                 |  3,279,733,912 |  17,196,308,030 |  5.243x |

---

In v4, we are caching the value in both the producer and consumer to reduce contention.

| Events                      |             v4 | v4_cache_padded | Ratio |
| --------------------------- | -------------: | --------------: | ----: |
| elapsed (nonspec)           |      808.114ms |       324.140ms | 0.401x |
| cycles (nonspec)            |  6,753,104,657 |   2,628,948,322 | 0.389x |
| L1D_TLB_MISS_NONSPEC        |         16,305 |          11,187 | 0.686x |
| L1D_CACHE_MISS_ST_NONSPEC   |     53,313,958 |         665,838 | 0.012x |
| L1D_CACHE_MISS_LD_NONSPEC   |     32,430,096 |      81,020,078 | 2.498x |
| elapsed (cache/uop)         |      802.493ms |       325.039ms | 0.405x |
| cycles (cache/uop)          |  6,746,810,554 |   2,600,571,923 | 0.385x |
| L1D_CACHE_WRITEBACK         |     59,880,671 |      31,803,934 | 0.531x |
| L1D_CACHE_MISS_ST           |    316,322,417 |       2,164,893 | 0.007x |
| L1D_CACHE_MISS_LD           |    296,089,541 |     172,912,869 | 0.584x |
| ST_UNIT_UOP                 |  2,365,795,549 |   1,065,827,402 | 0.451x |
| LD_UNIT_UOP                 |  3,569,847,351 |   1,611,430,488 | 0.451x |


[0]: https://david.alvarezrosa.com/posts/optimizing-a-lock-free-ring-buffer/
[1]: https://lambdafoo.com/posts/2026-03-25-mperf-hardware-counters-macos.html
