---
layout: post
title: 99 problems in Haskell, 73-80
tags: [99-problems, haskell, functional-programming, trees]
year: 2015
month: 08
day: 24
published: true
summary: Cultural Learnings of 99 Problems for Make Benefit Glorious Language of Haskell
---

### Problem 73: Lisp-like tree representation.

Easy one. Lispy representation follows a simple rule.

```haskell
display_lisp :: Tree Char -> String
display_lisp (Node v []) = [v]
display_lisp (Node v ts) = '(' : v : concatMap display_lisp ts ++ ")"
```

### Problem 80: Convert between the different graph representations.

First, we define our types. Quite straightforward:

```haskell
data Graph a = Graph [a] [(a, a)]
    deriving (Show, Eq)

data Adjacency a = Adj [(a, [a])]
    deriving (Show, Eq)

data Friendly a = Edge [(a, a)]
    deriving (Show, Eq)
```

Now, let's first convert from Graph to Adjacency. An adjacency list for each node (its
_neighbours_) is also straightforward to produce, by gathering the second element of the
pair from each edge:

```haskell
graph_to_adj :: (Eq a) => Graph a -> Adjacency a
graph_to_adj (Graph [] _) = Adj []
graph_to_adj (Graph (x : xs) es) = Adj ((x, neighs) : zs)
    where
    -- Here, the wiki solutions showed me `neighs` could be written as (es >>= f).
    -- In this context, of a list, monadic binding involves:
    -- (>>=) :: [a] -> (a -> [b]) -> [b]
    -- so, concatenating the result of mapping the function over all elements of the list.
    -- Neat!
        neighs = concatMap f es
            where
                f (m, n)
                    | m == x = [n]
                    | n == x = [m]
                    | otherwise = []
        Adj zs = graph_to_adj (Graph xs es)
```

Now, let's go back from an adjacency list to a graph-term. For each pair, we need to
first accumulate its first part into a list, and then produce the cartesian product of the
two parts; for `("a", "bc")`, the following edges are implied `("a", "b")` and `("a", "c")`:

```haskell
adj_to_graph :: (Eq a) => Adjacency a -> Graph a
adj_to_graph (Adj []) = Graph [] []
-- (ns >>= f) , because I'm such a showoff!
adj_to_graph (Adj ((v, ns) : vs)) = Graph ( v : xs) ((ns >>= f) ++ ys)
    where
        -- Remember to prevent the duplicates which are encoded in adjacency-list form:
        f n = if (v, n) `elem` ys || (n, v) `elem` ys then []
              else [(v, n)]
        Graph xs ys = adj_to_graph (Adj vs)
```

Now the human-friendly form. Conversion from a graph-term form is trivial: list all the
edges already explicitly stated by the graph-form, and include an arc from "isolated"
nodes to themselves:

```haskell
graph_to_friendly :: (Eq a) => Graph a -> Friendly a
graph_to_friendly (Graph [] _) = Edge []
graph_to_friendly (Graph xs ys) = Edge (ys ++ zip i i)
    where
        -- Is are all the Xs which aren't contained in any pairs of Ys:
        i = filter (\x -> all (\(a, b) -> x /= a && x /= b) ys) xs
```

, and with that said, we can define the conversion from adjacency-list to user-friendly:

```haskell
adj_to_friendly = graph_to_adj . adj_to_friendly
```

Now converting from user-friendly to graph-term is not much harder. We filter out the
edges from/to isolated nodes to obtain the edges, and just concatenate all the nodes from
the edges, sort and keep unique ones:

```haskell
import Data.List (nub)

friendly_to_graph :: (Eq a) => Friendly a -> Graph a
friendly_to_graph (Edge []) = Graph [] []
friendly_to_graph (Edge vs) = (Graph xs ys)
    where
        xs = nub $ concatMap (\(a, b) -> [a, b]) vs
        ys = filter (uncurry (/=)) vs
```

, and of course we can now go from user-friendly to adjacency-list trivially:

```haskell
friendly_to_adj = friendly_to_graph . graph_to_adj
```

That wasn't so bad! We'll continue with more graphs soon!
