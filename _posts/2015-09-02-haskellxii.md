---
layout: post
title: 99 problems in Haskell, 81-
tags: [99-problems, haskell, functional-programming, trees]
year: 2015
month: 09
day: 02
published: false
summary: Cultural Learnings of 99 Problems for Make Benefit Glorious Language of Haskell
---

### Problem 81: Path from one node to another one

```haskell
paths :: Eq a => a -> a -> [(a, a)] -> [[a]]
paths src dst g
    | src == dst = [[dst]]
    | otherwise = [ [src] ++ path | edge <- g, (fst edge) == src
                                  , path <- paths (snd edge) dst [e | e <- g, e /= edge]
                  ]
```

```haskell
cycle' :: (Eq a) => a -> Friendly a -> [[a]]
cycle' v (Edge es) = (es >>= f)
    where
        f (a, b) = if v /= a then []
                   else map (v:) $ paths b v es
```
