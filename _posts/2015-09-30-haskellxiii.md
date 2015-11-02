---
layout: post
title: 99 problems in Haskell, 85-87
tags: [99-problems, haskell, functional-programming, graphs, welsh-powell]
year: 2015
month: 09
day: 30
published: true
summary: Cultural Learnings of 99 Problems for Make Benefit Glorious Language of Haskell
---

Another week, another problem.

### Problem 85: Graph isomorphism

Uhm, OK, the problems have begun delving too much into weird-for-tutorials territory, just
like Project Euler goes too far into math:

```haskell

import Data.List (permutations)

data Graph a = Graph [a] [(a, a)]
    deriving (Show, Eq)

-- We're going to need our adjacency-list representation:
data Adjacency a = Adj [(a, [a])] deriving (Show, Eq)

-- Two graphs are isomorphic if they have the same canonical representation:
iso :: (Ord a, Enum a, Show a) => Graph a -> Graph a -> Bool
iso g@(Graph xs ys) h@(Graph xs' ys') = length xs == length xs'
                                     && length ys == length ys'
                                     && canon (graph_to_adj g) == canon (graph_to_adj h)
```

Now to the meat of the solution. Our relabeling strategy in order to find a canonical form
will work through all possible permutations of `[1..(length g)]` and will therefore be
very expensive. I've come across some algorithm(s) which exchange speed for probabilistic
guarantees, but I felt they were overkill for this exercise.

I also noticed most of said algorithms were behind paywalls, e.g. Springer.

```haskell
canon :: (Ord a, Enum a, Show a) => Adjacency a -> String
canon (Adj g) = minimum $ map f $ permutations [1..(length g)]
   where
      -- Graph vertices:
      vs = map fst g
      -- Find, via brute force on all possible orderings (permutations) of vs,
      -- a mapping of vs to [1..(length g)] which is minimal.
      -- For example, map [1, 5, 6, 7] to [1, 2, 3, 4].
      -- Minimal is defined lexicographically, since `f` returns strings:
      f p = let n = zip vs p
            in (show [(snd x, sort id $ map (\x -> snd $ head $ snd $ break ((==) x . fst) n)
                                      $ snd $ take_edge g x)
                     | x <- sort snd n])
      -- Sort elements of N in ascending order of (map f N):
      sort f n = foldr (\x xs -> let (lt, gt) = break ((<) (f x) . f) xs
                                  in lt ++ [x] ++ gt) [] n
      -- Get the first entry from the adjacency list G that starts from the given node X
      -- (actually, the vertex is the first entry of the pair, hence `(fst x)`):
      take_edge g x = head $ dropWhile ((/=) (fst x) . fst) g

graphG1 = Graph [1, 2, 3, 4, 5, 6, 7, 8]
          [(1, 5), (1, 6), (1, 7), (2, 5), (2, 6), (2, 8),
           (3, 5), (3, 7), (3, 8), (4, 6), (4, 7), (4, 8)]

graphH1 = Graph [1, 2, 3, 4, 5, 6, 7, 8]
          [(1, 2), (1, 4), (1, 5), (6, 2), (6, 5), (6, 7),
           (8, 4), (8, 5), (8, 7), (3, 2), (3, 4), (3, 7)]

-- Should be `True`:
main = do print $ iso graphG1 graphH1
```

### Problem 86: Node degree and graph coloring.

The problem statement gives us the Welsh-Powell algorithm for graph coloring, which is
relatively simple to implement. First let's take care of the boilerplate and subproblems
(a) and (b):

```haskell

import Data.List (find, sortBy)
import Data.Ord (comparing)

data Graph a = Graph [a] [(a, a)]
    deriving (Show, Eq)

data Adjacency a = Adj [(a, [a])]
    deriving (Show, Eq)

petersen = Graph ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
         [('a', 'b'), ('a', 'e'), ('a', 'f'), ('b', 'c'), ('b', 'g'),
          ('c', 'd'), ('c', 'h'), ('d', 'e'), ('d', 'i'), ('e', 'j'),
          ('f', 'h'), ('f', 'i'), ('g', 'i'), ('g', 'j'), ('h', 'j')]

degree :: (Eq a, Ord a, Show a) => Graph a -> a -> Int
degree (Graph _ es) n = length $ filter ((==) n . fst) es

sort_degree :: (Eq a, Ord a, Show a) => Graph a -> Adjacency a
sort_degree g = Adj $ sortBy (flip $ comparing $ length . snd) l
    where
        Adj l = graph_to_adj g
```

Alright, that was the easy part. Now on to implement WP. `wpcolor` will map each vertex to
a color, signified by an integer value:

```haskell
wpcolor :: (Eq a, Ord a, Show a) => Graph a -> [(a, Int)]
wpcolor g = wpcolor' l [] 1
    where
        -- Step 1: All vertices are sorted according to decreasing degree
        Adj l = sort_degree g
        wpcolor' [] ys _ = ys
        wpcolor' xs ys n = let ys' = color xs ys n
                            in wpcolor' [x | x <- xs, notElem (fst x, n) ys'] ys' (n+1)
        -- Color will take care of steps 3 & 4, by coloring vertices not connected to
        -- already colored vertices:
        color []            ys n = ys
        color ((v, e) : xs) ys n = if any (\x -> (x, n) `elem` ys) e
                                   then color xs ys n
                                   else color xs ((v, n) : ys) n

main = do print $ wpcolor petersen
```

### Problem 87: Depth-first traversal revisited

DFS is not a particularly hard problem, but the stack implementation took me some time to
get right.

```haskell

import Data.List

data Graph a = Graph [a] [(a, a)]
    deriving (Show, Eq)

dfs :: (Eq a, Show a) => Graph a -> a -> [a]
dfs (Graph vs es) n | n `notElem` vs = []
                    | otherwise = dfs' (Graph vs es) [n]

dfs' :: (Eq a) => Graph a -> [a] -> [a]
dfs' (Graph [] _) _  = []
dfs' (Graph _ _) [] = []
dfs' (Graph vs es) (top:stack) | top `notElem` vs = dfs' (Graph remaining es) stack
                               | otherwise = top : dfs' (Graph remaining es) (adjacent ++ stack)
    where
        adjacent = [x | (y, x) <- es, y == top]
                -- Remove the below if the graph is considered directed:
                ++ [x | (x, y) <- es, y == top]
        remaining = [x | x <- vs, x /= top]

main = do print $ dfs (Graph [1,2,3,4,5] [(1,2),(2,3),(1,4),(3,4),(5,2),(5,4)]) 1
```

There we go, that is way simpler than a bunch of `if-else-then`, but it's working in the
same way. The quadratic edge lookup is ugly. For linear graph algorithms including DFS,
I'd turn
[here](http://www.researchgate.net/publication/2295532_Lazy_Depth-First_Search_and_Linear_Graph_Algorithms_in_Haskell).
