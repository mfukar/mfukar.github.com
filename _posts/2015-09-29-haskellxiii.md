---
layout: post
title: 99 problems in Haskell, 85-87
tags: [99-problems, haskell, functional-programming, graphs, welsh-powell]
year: 2015
month: 09
day: 29
published: false
summary: Cultural Learnings of 99 Problems for Make Benefit Glorious Language of Haskell
---

Another week, another problem.

### Problem 85: Graph isomorphism

Uhm, OK, the problems have begun delving too much into weird-for-tutorials territory, just
like Project Euler goes too far into math:

```haskell
module Main where

import Data.List (permutations)

data Graph a = Graph [a] [(a, a)]
    deriving (Show, Eq)

-- We're going to need our adjacency-list representation:
data Adjacency a = Adj [(a, [a])] deriving (Show, Eq)

-- We'll need to convert the two given graphs into the adjacency-list representation for
-- convenience:
import p80 (graph_to_adj)

-- Two graphs are isomorphic if they have the same canonical representation:
iso :: (Ord a, Enum a, Show a) => Graph a -> Graph a -> Bool
iso g@(Graph xs ys) h@(Graph xs' ys') = length xs == length xs'
                                     && length ys == length ys'
                                     && canon (graph_to_adj g) == canon (graph_to_adj h)


-- Our relabeling strategy to find a canonical form goes through all possible permutations
-- and is therefore very expensive. Try as I might, I didn't find any actual algorithms
-- for canonicalisation which weren't behind a paywall. I probably didn't look hard enough:

canon :: (Ord a, Enum a, Show a) => Adjacency a -> String
canon (Adj g) = minimum $ map f $ permutations [1..(length g)]
   where
      -- Graph vertices:
      vs = map fst g
      -- Find, via brute force on all possible orderings (permutations) of vs,
      -- a mapping of vs to [1..(length g)] which is minimal.
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

main = do print $ iso graphG1 graphH1
```

### Problem 86: Node degree and graph coloring.


```haskell
module Main where

import Data.List (find, sortBy)
import Data.Ord (comparing)
import p80 (graph_to_adj)

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

wpcolor :: (Eq a, Ord a, Show a) => Graph a -> [(a, Int)]
wpcolor g = wpcolor' l [] 1
    where
        -- Step 1: All vertices are sorted according to decreasing degree
        Adj l = sort_degree g
        wpcolor' [] ys _ = ys
        wpcolor' xs ys n = let ys' = color xs ys n
                            in wpcolor' [x | x <- xs, notElem (fst x, n) ys'] ys' (n+1)
        color []            ys n = ys
        color ((v, e) : xs) ys n = if any (\x -> (x, n) `elem` ys) e
                                   then color xs ys n
                                   else color xs ((v, n) : ys) n

main = do print $ wpcolor petersen
```

### Problem 87: Depth-first traversal revisited

Alright! This is hard!

Even if the idea of a spanning tree can be generalised for directed multigraphs, this is
probably not the intent of the question, so let's assume our graph is undirected. Let's
start with implementing `paths` and `cycle'`:

```haskell
module Main where

import Data.List

data Graph a = Graph [a] [(a, a)]
    deriving (Show, Eq)

dfs :: (Eq a, Show a) => Graph a -> a -> [a]
dfs g init = reverse $ dfs' [init] [init] g init

dfs' stack visited (Graph vs es) init = if null unvisited
                                        then
                                            if 1 == length stack
                                            then visited
                                            else dfs' (tail stack) visited (Graph vs es) (head (tail stack))
                                        else
                                            dfs' (head unvisited : stack)
                                                 (head unvisited : visited)
                                                 (Graph vs es)
                                                 (head unvisited)
    where
        unvisited = map (\(a, b) -> if a == init then b else a)
                        (filter (\(a, b) -> g(a, b) || g(b, a)) es)
        g (a, b) = a == init && b `notElem` visited

main = do print $ dfs (Graph [1,2,3,4,5] [(1,2),(2,3),(1,4),(3,4),(5,2),(5,4)]) 1
```

