---
layout: post
title: Ticket spinlocks
tags: [ticket-spinlock, linux, synchronization, cpp]
year: 2017
month: 09
day: 08
published: true
summary: Ticket spinlocks, what are they, and how are they used?
---

Ticket spinlocks! Fancy name! What are they, and why should you know about them?

The ticket lock is a synchronisation mechanism which was introduced by Mellor-Crummey & Scott in
[Algorithms for Scalable Synchronization on Shared-Memory
Multiprocessors](https://www.cs.rice.edu/~johnmc/papers/tocs91.pdf), and is meant to guarantee
fairness in lock acquisition. It achieves this goal by granting requests in FIFO order. As its name
suggests, it employs "tickets" for requesters, just as if they were waiting in a queue. On arrival
customers draw a ticket from a ticket dispenser, which hands out tickets with increasing numbers. A
screen displays the ticket number served next. The customer holding the ticket with the number
currently displayed on the screen is served next.

![Now serving](https://farm3.staticflickr.com/2815/9002017002_a68a1640a9_m.jpg)

In NUMA systems, the usual spinlock implementations like test-and-set do not provide fairness
guarantees. What this means is that there is a chance for starvation and thus inability to provide
latency guarantees. If we can provide fairness, then we can bound the time a thread will spend
waiting for a spinlock, and thus on its total latency for whatever work it's doing.

The content of this post is a summary of section 8.1 of Yan Solihin's [Fundamentals of Parallel
Multicore
Architecture](https://books.google.gr/books?id=G2fmCgAAQBAJ&lpg=PA280&ots=YTXmC2-c-J&dq=test-and-set%20fairness&pg=PA265#v=onepage&q&f=false).
The book is an excellent overview, but for the meat of this topic you should read the related
papers.

## Implementation

We'll sketch a C++ implementation below.

To implement the ticket number currently served and the ticket number handed out to the _next
arriving thread_, we'll use two `std::atomic_size_t` variables. The implementation is targeted at
x86, and I'll point out exactly where this makes a difference. Do not consider this to be
optimized - I haven't profiled any of it. We will refer to the particulars as we go along. Let's begin:

```cpp
struct TicketSpinLock {
    /**
     * Attempt to grab the lock:
     * 1. Get a ticket number
     * 2. Wait for it
     */
    void enter() {
        /* We don't care about a specific ordering with other threads,
         * as long as the increment of the `next_ticket` counter happens atomically.
         * Therefore, std::memory_order_relaxed.
         */
        const auto ticket = next_ticket.fetch_add(1, std::memory_order_relaxed);

        while (now_serving.load(std::memory_order_acquire) != ticket) {
            spin_wait();
        }
    }

    /**
     * Since we're in the critical section, no one can modify `now_serving`
     * but this thread. We just want the update to be atomic. Therefore we can use
     * a simple store instead of `now_serving.fetch_add()`:
     */
    void leave() {
        const auto successor = now_serving.load(std::memory_order_relaxed) + 1;
        now_serving.store(successor, std::memory_order_release);
    }

    /* These are aligned on a cache line boundary in order to avoid false sharing: */
    alignas(CACHELINE_SIZE) std::atomic_size_t now_serving = {0};
    alignas(CACHELINE_SIZE) std::atomic_size_t next_ticket = {0};
};

static_assert(sizeof(TicketSpinLock) == 2*CACHELINE_SIZE,
    "TicketSpinLock members may not be aligned on a cache-line boundary");
```

As per the acquire/release semantics (for an overview, have a look
[here](https://gcc.gnu.org/wiki/Atomic/GCCMM/AtomicSync)), independent threads need to synchronise
on the `now_serving` counter: many customers are standing in front of a desk clerk, looking at the
counter, and waiting their turn by continuously reading the displayed value. In the meantime, they
are free to perform other operations in any order, relaxing the synchronisation required. This way,
requester threads don't pay any cost in shared memory operations that do not involve the lock.

What happens when the ticket dispenser overflows? With a bit of napkin sketching, we can quickly see
that overflow is catastrophic only in the case where the number of threads waiting on the lock is
strictly greater than the maximum number of values representable by the counter's underlying type
(otherwise, there is a coding error, and at least one thread is attempting to grab the same lock
twice[^1]). Assume a 3-bit counter, and 8 threads competing for the lock. The condition `now_serving !=
ticket` is always false for the next thread in line. _Only_ if we were to add one more thread, the
`next_ticket` counter can now reach the same value `now_serving` has. This is very easy to see on a
piece of paper:

```
   now_serving   next_ticket
        |             |
        V             V
... 0 1 2 3 4 5 6 7 0 1 2 ...
         \___________/
           8 threads
           holding one ticket each
```

This is a useful observation in that, when memory is at a premium, we can use shorter width counters
as long as we can guarantee an upper bound on the number of threads. This is not a typical scenario,
however - more of an interesting factoid. When would the number of ticket locks in an application be
as great as to make this saving significant?

## spin wait what?

We haven't said anything about the `spin_wait` function. Ideally, a thread attempting to `enter` the
critical section spins for a threshold of attempts, and while it is doing so it can incur some
pretty heavy performance penalties. To illustrate this point on an x86 CPU, let's have a look at the
[Intel instruction reference](http://www.intel.com/Assets/PDF/manual/325383.pdf) which says:

> When executing a “spin-wait loop,” a Pentium 4 or Intel Xeon processor suffers a severe
> performance penalty when exiting the loop because it detects a possible memory order
> violation. The PAUSE instruction provides a hint to the processor that the code sequence
> is a spin-wait loop. The processor uses this hint to avoid the memory order violation in
> most situations, which greatly improves processor performance. For this reason, it is
> recommended that a PAUSE instruction be placed in all spin-wait loops.

Therefore, that's exactly what we'll do inside `spin_wait`:

```cpp
static inline void spin_wait(void) {
#if (COMPILER == GCC || COMPILER == LLVM)
    /* volatile here prevents the asm block from being moved by the optimiser: */
    asm volatile("pause" ::: "memory");
#elif (COMPILER == MVCC)
    __mm_pause();
#endif
}
```

Fantastic. It's good to note that `rep; nop` is a synonym for `pause`, and it appears in some
implementations, e.g.
[Linux](http://lxr.free-electrons.com/source/arch/x86/include/asm/processor.h#L562). Note that `rep`
here is not a prefix of `nop`.

## Handling contention

As it is, the lock is implemented to ignore contention. This allows the API to be simple, the common
case (lack of contention) to be fast, and forces us to handle contention at the level of the data
structure. This last point is useful because it allows us to provide a generic lock, decoupled from
application or data structure logic.

Since we intend for contention to be rare, however, we can add functionality in the
spinlock's slow path to handle the case of high contention.

A common approach is exponential back-off (see 8.1.3). This is the case with the simple test-and-set
lock in the aforementioned paper. This approach kills the ticket spinlock. Observe:

* Let A be the thread with `my_ticket == now_serving + 3`
* Let B be the thread with `my_ticket == now_serving + 2`
* Let C be the thread with `my_ticket == now_serving + 1`
* A must always wait at least as long as B
* B must always wait at least as long as C

Therefore, as delays accumulate, most of the thread execution time is spent waiting for the lock.
This is undesirable re: fairness guarantees. The ticket lock provides us with some extra information
that the test-and-set lock doesn't, and it helps us make a decision: the number of processors
already waiting on the lock.

The number of threads waiting on the lock can be obtained by simply calculating the difference
`my_ticket - now_serving`. As Crummey & Scott observe, we need an estimate of how long it will take
_each_ processor to release the lock. If this time is accurately known, great, but it's unlikely in
practice. A common occurrence for estimating it called "proportional back-off", and it uses the
_expected average_, which is a risky choice: if the processors in line for the lock average less
than the expected amount, the waiting processor will delay too long, and thus slow down all threads.
The very nature of the mean implies this is a scenario happening about half the time, and thus makes
it quite undesirable.

The better choice is the _minimum_ time that a processor may hold the lock:

```cpp
static inline void TicketSpinLock::enter() {
    const auto ticket = next_ticket.fetch_add(1, std::memory_order_relaxed);

    while (true) {
        const auto currently_serving = now_serving.load(std::memory_order_acquire);
        if (currently_serving == ticket) {
            break;
        }

        const size_t previous_ticket = ticket - currently_serving;
        const size_t delay_slots = BACKOFF_MIN * previous_ticket;

        while (delay_slots--) {
            spin_wait();
        }
    }
}
```

In [Synchronization without
Contention](http://www.cs.berkeley.edu/~kubitron/cs258/handouts/papers/1991_ASPLOS_sync.pdf),
Crummey and Scott further present and explore scalable synchronization mechanisms with
empirical data that explore the related performance aspects.

## Concluding

What are the tradeoffs of the ticket lock?

+ [+] Guaranteed FIFO ordering; no starvation
+ [+] Relatively low latency hit
+ [+] Low network traffic
+ [-] Not constant traffic per lock acquisition, but linear

The last point is addressed by MCS (see the linked papers), which sounds even more
exciting! Let's have a look at them next.

[^1]: There are multiple ways to find such problems with locks. For example, clang provides the [Thread Safety Analysis](https://clang.llvm.org/docs/ThreadSafetyAnalysis.html) extension.
