---
layout: post
title: Ticket spinlocks
tags: [ticket-spinlock, linux, synchronization]
year: 2016
month: 05
day: 21
published: true
summary: Ticket spinlocks, what are they, and how are they used?
---

Ticket spinlocks! Fancy name! What are they, and why should you know about them?

The ticket lock is a synchronisation mechanism which was introduced by Mellor-Crummey &
Scott in [Algorithms for Scalable Synchronization on Shared-Memory
Multiprocessors](https://www.cs.rice.edu/~johnmc/papers/tocs91.pdf), and is meant to
guarantee fairness in lock acquisition, by granting requests in FIFO order. Like its name
suggests, it employs "tickets" for requesters, just as if they were waiting in a queue.
On arrival customers draw a ticket from a ticket dispenser, which hands out tickets with
increasing numbers. A screen displays the ticket number served next. The customer holding
the ticket with the number currently displayed on the screen is served next.

In NUMA systems, the usual spinlock implementations like test-and-set don't provide
fairness guarantees. This often leads to starvation and thus inability to provide latency
guarantees.

## Implementation

We'll sketch a C++ implementation below. We'll use two `std::atomic_size_t` variables as
counters for the ticket number currently served and the ticket number handed out to the
next arriving thread. The implementation may not be particularly optimized - I haven't
profiled any of this - and it is aimed at x86. We will refer to the particulars as we go
along. Let's begin:

```cpp
struct TicketSpinLock
{
    /**
     * Attempt to grab the lock:
     * 1. Get a ticket number
     * 2. Wait for it
     */
    void enter() {
        const auto ticket = next_ticket.fetch_add(1, std::memory_order_relaxed);

        while (now_serving.load(std::memory_order_acquire) != ticket) {
            spin_wait();
        }
    }

    /**
     * Since we're in the critical section, no one can modify `now_serving`
     * but this thread. Therefore we can use a simple store instead of
     * `now_serving.fetch_add()`:
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

What happens when the ticket dispenser overflows? We can quickly see that overflow is
catastrophic only in the case where the number of threads waiting on the lock is strictly
greater than the maximum number of values representable by the counter's underlying type.
Assume a 3-bit counter, and 8 threads competing for the lock. The condition `now_serving
!= ticket` is always false for the next thread in line. If we were to add one more thread,
the `next_ticket` counter can now reach the same value `now_serving` has. This is very
easy to see on a piece of paper:

```
   now_serving   next_ticket
        |             |
        V             V
... 0 1 2 3 4 5 6 7 0 1 2 ...
        |_____________|
           8 threads
```

This means that in cases where memory is at a premium, we can use shorter width counters
as long as we can guarantee an upper bound on the number of threads.

## spin wait what?

We haven't said anything about the `spin_wait` function. Ideally, a thread attempting to
`enter` the critical section spins for a threshold of attempts, and while it is doing so
it can incur some pretty heavy performance penalties. The [Intel instruction
reference](http://www.intel.com/Assets/PDF/manual/325383.pdf) says:

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

It's good to note that `rep; nop` is a synonym for `pause`, and it appears in some
implementations, e.g.
[Linux](http://lxr.free-electrons.com/source/arch/x86/include/asm/processor.h#L562). Note
that `rep` here is not a prefix of `nop`.

## Contention and proportional back-off

As it is, the lock is implemented to ignore contention. This allows the API to be simple,
the common case (lack of contention) to be fast, and forces us to handle contention at the
level of the data structure.

Since we intend for contention to be rare, however, we can add functionality in the
spinlock's slow path to handle the case of high contention.

A common approach is exponential back-off. This is the case with the simple test-and-set
lock in the aforementioned paper. This approach kills the ticket spinlock. Observe:

* Let A be the thread with `my_ticket == now_serving + 3`
* Let B be the thread with `my_ticket == now_serving + 2`
* Let C be the thread with `my_ticket == now_serving + 1`
* A must always wait at least as long as B
* B must always wait at least as long as C

Therefore, as delays accumulate, most of the thread execution time is spent waiting for
the lock. This is undesirable. The ticket lock provides us with some extra information
that the test-and-set lock doesn't, and it helps us make a decision: the number of
processors already waiting on the lock. This can be obtained by calculating the difference
`my_ticket - now_serving`. Now, as Crummey & Scott observe, we need an estimate of how
long it will take _each_ processor to release the lock. If this time is accurately known,
great, but it's unlikely in practice. A common occurrence for estimating it is the
_expected average_, which is a risky choice: if the processors in line for the lock
average less than the expected amount, the waiting processor will delay too long, and thus
slow down all threads. A better choice is the _minimum_ time that a processor may hold the
lock.

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

