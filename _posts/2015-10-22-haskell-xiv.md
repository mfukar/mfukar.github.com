---
layout: post
title: 99 problems in Haskell, 88-93
tags: [99-problems, haskell, functional-programming]
year: 2015
month: 10
day: 22
published: false
summary: Cultural Learnings of 99 Problems for Make Benefit Glorious Language of Haskell
---

Another week, another problem.

### Problem 88: Connected components

We know that a DFS will find the entire connected component containing the beginning node
before finishing. Therefore we can use the solution from problem 87 straightforwardly:

```haskell
connected_components :: (Eq a, Show a) => Graph a -> [[a]]
connected_components (Graph vs es) = foldr f [] vs
    where
        -- Flatten the accumulator in order to determine if `v` belongs to a connected
        -- component which we already enumerated:
        f v acc = if v `elem` (concat acc)
                then acc
                else dfs (Graph vs es) v : acc
```

### Problem 89: Bipartite graphs

A graph is bipartite if and only if it is 2-colorable. This fairly intuitive hypothesis
has been proven by Asratian, Armen, Denley, Tristan and Häggkvist in "Bipartite Graphs and
their Applications", from Cambridge Tracts in Mathematics 131.

Since we have already implemented graph colorisation, we will use it thusly:

```haskell
bipartite :: (Eq a, Ord a, Show a) => Graph a -> Bool
bipartite g = 2 == (maximum $ map snd $ wpcolor g)
```

Easy, right? :-)

### Problem 90: Eight queens problem

The assumption to use a list of integers, where each element of a list represents a
column, makes this very easy to implement. By filtering all permutations of the range
`[1..n]`, we can solve it in a straight-forward, but slow, manner:

```haskell
import Data.List (permutations)

queens :: Int -> [[Int]]
-- All permutations, i.e. queens' placements must be "safe":
-- This test is slow-ish. To do better, I would write a list comprehension that generates
-- permutations and incorporates the `safe` test as a guard:
queens n = filter test (permutations [1..n])
    where
        test [] = True
        test (q : qs) = safe q qs && test qs
        -- A placement of queens is "safe" iff there are no two queens in the same row or
        -- in the same diagonal:
        safe p ps = not (p `elem` ps || same_diagonal p ps)

        -- Two pieces (r1, c1) and (r2, c2) are on the same diagonal iff abs(r2 - r1) ==
        -- abs (c2 - c1), i.e. the distance between their columns is equal to the distance
        -- between their rows.
        -- Columns are given the same numbering as the rows, i.e. [1..n] (n is omitted for
        -- no reason):
        same_diagonal p ps = any (\(distance, row) -> abs (row - p) == distance) $ zip [1..] ps

main = print $ queens 8
```

Notice that, by construction, we will have exactly one queen per column and no more, so we
don't need to incorporate that extra test in our code. Neat!

### Problem 91: Knight's tour

Another instance where a wiki solution is wrong. That one never terminates, as far as I
could tell.

```haskell
import Data.Ord (comparing)
import Data.List ((\\), minimumBy, intercalate)

type Square = (Int, Int)

-- Is a square part of a NxN board?
on_board :: Int -> Square -> Bool
on_board n (x, y) = 1 <= x && x <= n && 1 <= y && y <= n

-- Valid moves for a knight for a given square, on a NxN board:
valid_moves :: Int -> Square -> [Square]
valid_moves n (x, y) = filter (on_board n) [(x+1, y+2), (x+1, y-2),
                                            (x+2, y+1), (x+2, y-1),
                                            (x-1, y+2), (x-1, y-2),
                                            (x-2, y+1), (x-2, y-1)]

knights_to :: Int -> Square -> [Square]
knights_to n finish = knights' [finish]
    where
        knights' moves | next_choices == [] = moves
                       | otherwise = knights' (next : moves)
            where
                next = minimumBy (comparing (length . choices)) next_choices
                next_choices = choices (head moves)
                choices square = valid_moves n square \\ moves
```
