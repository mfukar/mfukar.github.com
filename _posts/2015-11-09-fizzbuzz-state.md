---
layout: post
title: Haskell, FizzBuzz, and the State monad
tags: [haskell, state-monad, functional-programming]
year: 2015
month: 11
day: 09
published: true
summary: This is NOT a State monad tutorial.
---

I must confess: up until this morning, I had no idea what _any_ tutorial on the State
monad was talking about. I could only split them into two categories:

1. The posts which solve a (possibly artificial) problem using State/StateT
2. The (intended to be) introductory material which actually explained nothing

and without an actual explanation, you still have to do all the work yourself.

This post belongs in category #1. Consider yourself warned. If you want to know how
`State` works, I really can't explain it (yet), go use it to solve a problem, and $GOD
help you. Here, I'm only telling the excruciating story of how I heard of FizzBuzz, then
years later heard of `State`, and today I decided to combine them.

You might be aware of the ["FizzBuzz test"](http://c2.com/cgi/wiki?FizzBuzzTest). It's a
cutesy little puzzle designed to teach toddlers division. At some point, it's been used as
an interview question, to help companies stop employing toddlers - because this is illegal
in many jurisdictions.

Like many others, I started trying to grok `StateT` from Justin Le's
[blog](http://blog.jle.im/entry/unique-sample-drawing-searches-with-list-and-statet), in
which he uses `StateT` to implement a constraint solver. `State` I found out from the
["Learn You A Haskell For Great Good!" book](http://learnyouahaskell.com/for-a-few-monads-more).
The book says:

> A State s a is a stateful computation that manipulates a state of type s and has a result of type a.

On its own, this sentence says nothing. Previously, however, the chapter explains what
"stateful computations" are: functions `s -> (a, s)`, which means functions which take a
state `s`, perform work and return a result of type `a`, and a possibly changed state `s`.
In Justin's post, this computation is dependent selection from a sample. Now it should
make more sense. If not, READ THE BOOK, there's no "tl;dr".

Alright, so let's draw a parallel: if our state is an integer, and our computation is a
function `fizzbuzz` which implements the FizzBuzz test then returns a "new" state, yada
yada, seems like FizzBuzz can be modeled in terms of a `State` instance, yeah? Let's test
that claim.

I will first implement the "computation":

```haskell
fizzbuzz :: Int -> (String, Int)
fizzbuzz n | n `mod` 5 == 0 && n `mod` 3 == 0 = ("FizzBuzz", n + 1)
           | n `mod` 3 == 0 = ("Fizz", n + 1)
           | n `mod` 5 == 0 = ("Buzz", n + 1)
           | otherwise = (show n, n + 1)
```

In all cases, the "new state" is the next integer. A contrived example for our contrived
need.

Now, how do we "wrap" this computation in a `State`? I _sort of_ understood how to wrap
one in a `StateT` from Justin's article, and I _sort of_ grokked [Brandon Simmons'
version](http://brandon.si/code/the-state-monad-a-tutorial-for-the-confused/), which led
me down the path of compiler errors. So I bit the unavoidable bullet: dive into the
[transformers](http://hackage.haskell.org/package/transformers-0.4.3.0/docs/src/Control-Monad-Trans-State-Strict.html#State)
package.

You'll see `State` is defined in terms of `StateT`. Rather than going to `StateT` first,
instead I'm thinking: if this level of abstraction makes _any_ sense, you could read a
little bit of the source code and understand even a little bit of it. So let's read the
"constructor", `state`:

```haskell
-- | Construct a state monad computation from a function.
-- (The inverse of 'runState'.)
state :: (Monad m)
      => (s -> (a, s))  -- ^pure state transformer
      -> StateT s m a   -- ^equivalent state-passing computation
state f = StateT (return . f)
```

Alright, already this makes a lot of sense! `state` takes a "stateful computation", and
wraps it in a `StateT s m a`. Only a few lines above, `StateT s m a` is aliased to `State
s`. So `state` _must_ be the way to wrap functions in a `State`. I think. Let's test our
newfound confidence:

```haskell
state_ints_fizzbuzz :: State Int String
state_ints_fizzbuzz = state fizzbuzz
```

This compiles, so at least the type gods are satisfied. Sweet.

Now, in various tutorials, you'd find something like: `stateIntsFizz = State fizzbuzz`.
Unfortunately, those tutorials are outdated.  Since `State` now is a type alias:

```haskell
type State s = StateT s Identity
```

(taken directly from hackage, see above), you must use the `state` function.  If this is not the case at the time you read
this, I'm really sorry. And kind of angry at the same time. Let's at least find some
solace in our mutual feeling of frustration.

Now, how do we use this monad to solve FizzBuzz? Well, presumably we need to run the
computation wrapped inside it 100 times, starting from 1. So 1 is our initial state.
Further along the source code, we read:

```haskell
-- | Evaluate a state computation with the given initial state
-- and return the final value, discarding the final state.
--
-- * @'evalState' m s = 'fst' ('runState' m s)@
```

This seems to be exactly what we want. The values (of type `a`), are the desired output
according to our implementation of `fizzbuzz`. We evaluate the state 100 times, and gather
all the values, print them, done! Sounds good in theory. Let's test:

```haskell
evalState (replicateM 100 state_ints_fizzbuzz) 1
```

[`replicateM`](http://hackage.haskell.org/package/base-4.8.1.0/docs/Control-Monad.html#v:replicateM)
performs an action `n` times, and gathers the results. The crucial question is "why
replicateM and not replicate?", and the answer is because the context is a monad, the one
we so painstakingly constructed.

Now to put all this in the context of, say, `main :: IO ()`, I will simply print all the
results we've gathered, like so:

```haskell
main :: IO ()
main = mapM_ putStrLn $ evalState (replicateM 100 state_ints_fizzbuzz) 1
```

Compiles, __and__ works as expected!

Up next, using `State`/`StateT` to solve a not-so-trivial problem. Maybe there'll be more
revelations there.
