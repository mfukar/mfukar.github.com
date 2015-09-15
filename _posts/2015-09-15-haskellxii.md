---
layout: post
title: 99 problems in Haskell, 81-84
tags: [99-problems, haskell, functional-programming, trees, prim-algorithm]
year: 2015
month: 09
day: 15
published: true
summary: Cultural Learnings of 99 Problems for Make Benefit Glorious Language of Haskell
---

Vacation time is over, and thus blog posts are less frequent. BTW, if you can offer me a
job that doesn't suck, contact me.

### Problem 81: Path from one node to another one.

Note the assumption behind the implementation here, that the graph represented is
directed. This means we can't use this implementation for undirected graphs in later
problems.

```haskell
paths :: Eq a => a -> a -> [(a, a)] -> [[a]]
paths src dst g
    | src == dst = [[dst]]
    -- Just expand the path recursively (greed works):
    | otherwise = [ [src] ++ path | edge <- g, (fst edge) == src
                                  , path <- paths (snd edge) dst [e | e <- g, e /= edge]
                  ]
```

### Problem 82: Find a cycle starting from a given node.

The assumption of a directed graph still holds. We can use `paths` from previously to
find cycles by finding all paths back to the initial node.

```haskell
cycle' :: (Eq a) => a -> Friendly a -> [[a]]
cycle' v (Edge es) = (es >>= f)
    where
        f (a, b) = if v /= a then []
                   else map (v:) $ paths b v es
```

### Problem 83: Construct all spanning trees.

Alright! This is hard!

Even if the idea of a spanning tree can be generalised for directed multigraphs, this is
probably not the intent of the question, so let's assume our graph is undirected. Let's
start with implementing `paths` and `cycle'`:

```haskell
paths :: (Eq a) => a -> a -> [(a, a)] -> [[a]]
paths src dst graph | src == dst = [[src]]
                    | otherwise = concat [map (src :) $ paths d dst $ [x | x <- graph, x /= (c, d)]
                                         | (c, d) <- graph, c == src] ++
                                  concat [map (src :) $ paths c dst $ [x | x <- graph, x /= (c, d)]
                                         | (c, d) <- graph, d == src]

cycle' :: (Eq a) => a -> [(a, a)] -> [[a]]
cycle' v graph = [v : path | e <- graph, fst e == v, path <- paths (snd e) v [x | x <- graph, x /= e]]
              ++ [v : path | e <- graph, snd e == v, path <- paths (fst e) v [x | x <- graph, x /= e]]
```

and now `spantree` is:

```haskell
import Data.List

spantree :: (Eq a) => Graph a -> [Graph a]
spantree (Graph xs ys) = (filter connected) $ (filter (not . cycles)) $ (filter nnodes) trees
    where
        trees = [Graph (nodes edges) edges | edges <- foldr acc [[]] ys]
        acc e es = es ++ (map (e:) es)
        --
        nodes e = nub $ concatMap (\(a, b) -> [a, b]) e
        nnodes (Graph xs' ys') = length xs == length xs'
        cycles (Graph xs' ys') = any ((/=) 0 . length . flip cycle' ys') xs'
        connected (Graph (x':xs') ys') = not $ any (null) [paths x' y' ys' | y' <- xs']
```

### Problem 84: Construct the minimal spanning tree.

Prim's algorithm is surprisingly easy to implement.

```haskell
module Main where

import Data.Bool
import Data.List
import Data.Ord

data Graph a = Graph [a] [(a, a)]
    deriving (Show, Eq)

data GraphW a = GraphW [a] [(a, a, Int)]
    deriving (Show, Eq)


-- Initialise a graph (tree) with the first vertex, and begin:
prim (GraphW vs es) = prim' [head vs] [] (length vs - 1) (GraphW vs es)

-- Terminate when no vertices remain to be chosen:
prim' chosenV chosenE 0 _ = GraphW chosenV chosenE
prim' chosenV chosenE nE (GraphW vs es) = prim' (newV : chosenV) (newE : chosenE) (nE - 1) (GraphW vs es)
    where
    -- The edges we can pick from are extending outward from the tree:
    edges = filter (\(a, b, _) -> (a `elem` chosenV) `xor` (b `elem` chosenV)) es
    -- the new edge, newE, is the minimum weight one that connects our tree with a vertex
    -- not on the tree:
    newE @ (a', b', w') = minimumBy (comparing (\(_, _, w) -> w)) edges
    -- the new vertex is, therefore, the end of newE which isn't part of the tree so far:
    newV = if a' `elem` chosenV then b' else a'


xor :: Bool -> Bool -> Bool
xor = (/=)

-- The graph from the problem statement:
g5 = [(1,2,12),(1,3,34),(1,5,78),(2,4,55),(2,5,32),(3,4,61),(3,5,44),(4,5,93),(2,1,12),(3,1,34),(5,1,78),(4,2,55),(5,2,32),(4,3,61),(5,3,44),(5,4,93)]

main = do print $ prim (GraphW [1,2,3,4,5] g5)
```
