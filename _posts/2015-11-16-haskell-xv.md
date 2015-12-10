---
layout: post
title: 99 problems in Haskell, 92-96
tags: [99-problems, haskell, functional-programming]
year: 2015
month: 11
day: 16
published: true
summary: Cultural Learnings of 99 Problems for Make Benefit Glorious Language of Haskell
---

### Problem 92: Von Koch's conjecture

A brute-force solution checks all node numberings (i.e. permutations of [1, n]) and keeps
those that satisfy the conjectured property. The conjecture is that for every tree, there
is at least one such numbering.

```haskell
import Data.List (nub, permutations, sort)
import Data.Array

vonkoch edges = filter conjecture nodes
    where
        -- The conjecture involves trees, so the number of edges is the number of vertices
        -- minus one:
        n = length edges + 1
        nodes = permutations [1..n]
        conjecture nodes = dists == nub dists
            where
            node_array = listArray (1, n) numbering
            dists = sort $ map (\(x, y) -> abs (node_array ! x - node_array ! y)) edges
```

The last line is the meat of it, really: it computes the differences for all edges, under
a numbering / permutation. There must be 0 duplicates in that list of differences, which
is equivalent to requiring that all pairs of differences are not equal (as it appears on
other solutions).

### Problem 93: An arithmetic puzzle

This reminded me a lot of similar undergrad assignments. Let's get the boilerplate out of
the way:

```haskell
import Data.Maybe
import Data.List
import Data.Hashable
import Data.HashMap.Lazy

type Equation = (Expression, Expression)

data Expression = Const Integer | Binary Expression Operator Expression
    deriving (Eq, Show)

data Operator = Plus | Minus | Multiply | Divide
    deriving (Bounded, Eq, Enum, Show)

-- I just wanted to use the hash map from unordered-containers, really.
-- To use with HashMap we can just convert to an Int and use the existing Hashable
-- instance:
instance Hashable Operator
    where
        hashWithSalt = hashUsing fromEnum

type Value = Rational
```

Now that's out of the way, let's focus on the solution:

```haskell
-- The `puzzle` function will be given the list of integers, and produce all the
-- equations:
puzzle :: [Integer] -> [Equation]
puzzle ns | length ns > 1 = equations ns
          | otherwise = error "can't form an equation with less than 2 numbers!"

-- Helper to give us all the non-empty partitions of a list:
splits :: (Eq a) => [a] -> [([a], [a])]
splits xs = Data.List.filter (\(x, y) -> x /= [] && y /= []) (zip (inits xs) (tails xs))

-- We form equations by partitioning the numbers in all possible ways, and then producing
-- all possible expressions from each partition:
equations :: [Integer] -> [Equation]
equations ns = [(l, r) | (ns1, ns2) <- splits ns,
                         (l, v1) <- expressions ns1,
                         (r, v2) <- expressions ns2,
                         v1 == v2]

-- How do we form an expression? By inserting operators between all possible partitions of
-- our list of numbers, recursively, of course!
expressions :: [Integer] -> [(Expression, Value)]
expressions [n] = [(Const n, fromInteger n)]
expressions ns = [ (Binary e1 op e2, v) | (ns1, ns2) <- splits ns,
                                          (e1, v1) <- expressions ns1,
                                          (e2, v2) <- expressions ns2,
                                          op <- [minBound..maxBound],
                                          not (right_associative op e2),
                                          v <- maybeToList (apply op v1 v2)]

-- Applying an operator to obtain a value might fail (e.g. division by zero), so we will
-- use Maybe to handle it. Thus, the guard above will only produce values `v` which do not
-- contain a division by zero! Neat!
apply :: Operator -> Value -> Value -> Maybe Value
apply Plus x y = Just (x + y)
apply Minus x y = Just (x - y)
apply Multiply x y = Just (x * y)
apply Divide x 0 = Nothing
apply Divide x y = Just (x / y)

-- expr OP (expr OP expr) == (expr OP expr) OP expr
-- Only applies on a few cases, phew:
right_associative :: Operator -> Expression -> Bool
right_associative Plus (Binary _ Plus _) = True
right_associative Plus (Binary _ Minus _) = True
right_associative Multiply (Binary _ Multiply _) = True
right_associative Multiply (Binary _ Divide _) = True
right_associative _ _ = False
```

With that part done, now we need to produce a legible representation of an equation. We'll
start by defining operator precedence and "names":

```haskell
opname = fromList [(Plus, " + "), (Minus, " - "), (Multiply, " * "), (Divide, " / ")]
opprec = fromList [(Plus, 2), (Minus, 2), (Multiply, 1), (Divide, 1)]
```

It seems reasonable to produce a `showS` function for this purpose..

```haskell
show_equation :: Equation -> ShowS
show_equation (l, r) = show_expression 0 l . showString " = " . show_expression 0 r

show_expression :: Int -> Expression -> ShowS
show_expression _ (Const n) = shows n
show_expression prec (Binary e1 op e2) = showParen (prec > oper_prec) $
                                         show_expression oper_prec e1
                                       . showString (opname ! op)
                                       . show_expression (oper_prec + 1) e2
    where
        oper_prec = opprec ! op
```

..which we will use by concatenating everything to the empty string:

```haskell
main = mapM_ print $ Data.List.map (flip show_equation "") $ puzzle [2, 3, 5, 7, 11]
```

### Problem 94: K-regular simple graphs with N nodes

In this solution, we'll use the graph representations (and conversion functions) we
implemented earlier, `combinations` from problem 26, and `canon` from problem 85. Then we
can begin searching for k-regular graphs of order n:

```haskell
regular :: Int -> Int -> [Graph Int]
-- A k-regular graph of order n can only exist iff n > k and n*k is even:
regular n k | odd (n * k) = []
            | otherwise = nub_canonical . (filter (test_degrees k)) $ candidates
    where
        candidates = [Graph [1..n] edges | edges <- combinations (n*k `div` 2) possible_edges]
        possible_edges = [(x, y) | x <- [1..n], y <- [(x+1)..n]]

-- Test if all nodes of a graph have degree equal to k:
test_degrees k (Graph vs es) = all (== k) (map degree vs)
    where
        degree v = length $ filter (\(x, y) -> x == v || y == v) es

-- Filter out the isomorphic graphs. Remember that isomorphic graphs have the same
-- canonical representation:
nub_canonical :: (Enum a, Eq a, Ord a) => [Graph a] -> [Graph a]
nub_canonical = nubBy ((==) `on` (canon . graph_to_adj))
```

Fairly straightforward based on the mathematical definitions, really. Not a lot to explain
here (I think?).

### Problem 95: English number words

This seemed almost _too_ easy:

```haskell
full_words :: Integer -> String
full_words n = concat $ intersperse "-" [ digits !! digitToInt d | d <- show n]
    where
        digits = ["zero", "one", "two", "three", "four", "five", "six",
                  "seven", "eight", "nine"]
```

### Problem 96: Syntax checker

Let's follow the state machine with some inline comments:

```haskell
identifier :: String -> Bool
-- The empty string is not a valid identifier:
identifier [] = False

-- Valid identifiers begin with a letter, and are followed by either..
identifier (c : cs) = isLetter c && identifier_part cs
    where
        -- the empty string, or
        identifier_part [] = True
        -- a hyphen which is followed by an alphanumeric string, or
        identifier_part ('-' : cs) = alphanumeric cs
        -- an alphanumeric string.
        identifier_part cs = alphanumeric cs
        -- An alphanumeric string is not empty,
        alphanumeric [] = False
        -- and begins with a letter or a digit, followed by an `identifier_part`
        alphanumeric (c : cs) = isAlphaNum c && identifier_part cs
```

Up next, sudoku puzzles!
