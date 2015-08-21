---
layout: post
title: 99 problems in Haskell, 73-
tags: [99-problems, haskell, functional-programming, trees]
year: 2015
month: 08
day: 25
published: false
summary: Cultural Learnings of 99 Problems for Make Benefit Glorious Language of Haskell
---

### Problem 73: Lisp-like tree representation.

Easy one. Lispy representation follows a simple rule.

```haskell
display_lisp :: Tree Char -> String
display_lisp (Node v []) = [v]
display_lisp (Node v ts) = '(' : v : concatMap display_lisp ts ++ ")"
```

### Problem 81:
