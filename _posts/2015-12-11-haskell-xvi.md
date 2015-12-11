---
layout: post
title: 99 sudoku problems in Haskell, 97
tags: [99-problems, haskell, functional-programming, sudoku]
year: 2015
month: 12
day: 11
published: true
summary: Cultural Learnings of 99 Problems for Make Benefit Glorious Language of Haskell
---

Problem 97 is the last problem from the list I'll be tackling. Sudoku puzzles have been a
recurring theme in CS course material, I think because they combine simple rules with the
potential for a variety of solutions, and contain interesting insights, especially when it
comes to things like parallelisation.

## Humble beginnings

For P97 I chose to begin by adapting a solution I wrote ~10 years ago. I'd implemented it
as an example solution for a parallel systems course, of which I was a TA at the time. The
implementation was in C and used MPI to parallelise the workload in two ways: split the
puzzles requested to be solved, or parallelise solving each individual puzzle, depending
on the workload.

The second part is lost in this writeup. For this post, I will keep only the high-level
choices which made the solver easy to understand and implement, and as we'll see later,
its efficiency will come from different choices. We begin by modelling our board, and some
basic convention:

```haskell
type Grid = Board Value
type Board a = [Row a]
type Row a = [a]
type Value = Char

-- A blank square may contain a list of values:
type Choices = [Value]

boxsize :: Int
boxsize = 3

values :: [Value]
values = ['1'..'9']

empty :: Value -> Bool
empty = (== '0')
```

There's no reason for giving 0 a special meaning. Others prefer a dot. I went along with
the sudoku puzzles provided by Gordon Royle
[here](http://staffhome.ecm.uwa.edu.au/~00013890/sudoku17).

Our solver interface will be a single function, `solve`, which will accept an initial `Grid`
as an argument and return a list of possible solutions. The list will be empty if the
input is not solvable: `solve :: Grid -> [Grid]`

The solution strategy (with 10 years in hindsight) is:

* Enumerate all possible choices of empty cells; each choice is a different result, i.e.
  `Grid`
* Prune the search space by:
    + Does a board violate a sudoku rule about duplicates?
    + Does a square contain no choices at all?
    + Repeatedly prune until the possible choices do not change
* Produce solutions by making a choice out of all possible ones and repeatedly prune

Note we will not be guessing. We're interested in _all_ the solutions, and Haskell being
lazy provides us with the choice of _one_ immediate solution with no extra penalty!

This sounds somewhat complicated, so let's begin with some basic auxiliary functions:

```haskell
-- Returns whether a list contains a single element:
is_single :: [a] -> Bool
is_single [_] = True
is_single _ = False

-- From earlier problems,
-- Given an integer N and a list, split the list in sublists of length N:
chop :: Int -> [a] -> [[a]]
chop n [] = []
chop n xs = take n xs : chop n (drop n xs)
```

`is_single` will be useful to detect the case where a square contains a single
choice/solution. `chop` we will use to rearrange the board. Now modelling a `Board` as a
list of rows has some very useful properties, which are made apparent in different ways in
C and Haskell. In C, storing matrices in row-major order allows one to perform some
operations very quickly using [Z-order](https://en.wikipedia.org/wiki/Z-order_curve) -
this is because of good spatial locality, which dramatically reduces TLB & cache misses
for those operations. In Haskell, it's making the code that much cleaner:

```haskell
-- Given a board, it returns a list of rows:
rows :: Board a -> [Row a]
rows = id -- A board is defined as a list of rows.

-- Given a board, it returns a list of columns:
columns :: Board a -> [Row a]
columns = transpose -- Easier than `zip9`..

-- Given a board, it returns a list of boxes:
boxes :: Board a -> [Row a]
boxes = unpack . (map columns) . pack
    where
        pack = split . map split
        split = chop boxsize
        unpack = map concat . concat
```

`boxes` requires some explanation of its own:

1. A board is a list of rows
2. Each row contains exactly BOXSIZE elements for each of NCOLUMNS / BOXSIZE boxes
3. Group the resulting elements in groups of BOXSIZE
4. For each of the groups from (3), combine them by "zipping" BOXSIZE elements together
   (`transpose`). We now have our boxes in lists of lists.
5. Now if we had created a structure to reflect our choices, we need to flatten it (not
   the case with the C solution): `map concat . concat` does this

Phew. That's a mouthful. It _seemed_ much easier in the C implementation, where all one
needed was traversing in Z-order. I wonder how much will the creation of those extra
objects (lists) will take.

Now to check rules:

```haskell
-- From earlier problems too (!), returns True if a list contains duplicates:
nodupes :: Eq a => [a] -> Bool
nodupes [] = True
nodupes (x : xs) = not (elem x xs) && nodupes xs

-- A valid Grid contains no duplicates in all rows, no duplicates in all columns, and no
-- duplicates in all the boxes:
valid :: Grid -> Bool
valid g = all nodupes (rows g) && all nodupes (columns g) && all nodupes (boxes g)
```

How do all the pieces we've listed so far fit together? We need at least one thing more to
tie them together. Notice that up to now we're referring to a board of choices (`Grid`),
but to obtain all the solutions we need to have a choice of `Board`s. This could be the
textbook definition of a cartesian product:

```haskell
-- choices assigns all the possible choices to a Grid, creating Boards:
choices :: Grid -> Board Choices
choices = map (map choice)
    where
        choice v = if empty v then values else [v]

-- collapse will reduce a board of choices to a choice of possible Boards:
collapse :: Board [a] -> [Board a]
-- But how?

-- A board of choices is represented as a choice of boards as the cartesian product of a
-- list of lists, for example:
-- [[1,2], [3,4], [5,6]] -> [[1,3,5],[1,3,6],[1,4,5],[1,4,6],[2,3,5],[2,3,6],[2,4,5],[2,4,6]]
cp :: [[a]] -> [[a]]
cp [] = [[]]
cp (xs : xss) = [y : ys | y <- xs, ys <- cp xss]

-- Now we can implement collapse:
collapse = cp . map cp
```

So much simpler than C! Now we can tie everything together with a solver (which is not
good enough, as it doesn't prune): `solve' = filter valid . collapse . choices`. Since it
does no pruning, it's exceedingly slow: try to enumerate all the grids it considers for
the example grid in the Haskell wiki. `collapse` will be useful later on to a lesser
degree, so we'll keep it around for now - we don't mind much of its inefficiency.

## Pruning a search space

A way to prune the huge search space is to exclude all the choices which already appear in
the same row/column/box, so we don't have to carry them around just to observe they're not
a valid solution later. We'll base our implementation on the modelling of a board as a
matrix - fans of linear algebra will recognise a familiar pattern here:

```haskell
-- Given two sets of choices, minus will remove the second set from the first:
minus :: Choices -> Choices -> Choices
xs `minus` ys = if is_single xs then xs else xs \\ ys

-- reduce performs this removal on a Row of Choices. Do we have to write 2 more
-- implementations for a column/box? No! We already modeled our columns & boxes
-- as Rows!
reduce :: Row Choices -> Row Choices
reduce xss = [xs `minus` singles | xs <- xss]
    where
        singles = concat (filter is_single xss)

-- Remove any choices which occur as single entries in our row/column/box:
prune :: Board Choices -> Board Choices
prune = pruneBy boxes . pruneBy columns . pruneBy rows
    where
        pruneBy f = f . map reduce . f
```

Brilliant. We can now prune a board, but only once. Let's do so repeatedly, until we can't
prune any more:

```haskell
-- fixpoint recursively applies the function f to x as long as: x /= f(x)
-- The term for this in math is a "fixpoint":
fixpoint :: Eq a => (a -> a) -> a -> a
fixpoint f x = if x == x' then x else fixpoint f x'
    where
        x' = f x
```

The last thing missing is enforcing the rules of the game.

## Board properties and picking a choice

We have already implemented some checks about the validity of sudoku grids, but enforcing
its rules before expanding all possible choices will reduce the number of possible
solutions dramatically (_how much?_), and make our solver that much faster.

My thinking goes like this: if we had a search function that recursively expands and
prunes a Board, there are exactly three cases:

* if the board contains a square with no choices, or its choices violate the rules, we're
  done
* if the board contains only a single choice in each square, it's a solution and we're
  done
* otherwise, for each choice on the board, we prune and search again

Let's express the above in Haskell:

```haskell
-- A board is "complete" (solved) when all squares have a single choice:
complete :: Board Choices -> Bool
complete = all (all is_single)

-- A board is "void" if any square contains no choices, i.e. unsolvable:
void :: Board Choices -> Bool
void = any (any null)

-- A row/column/box is "consistent" if it doesn't break the sudoku rules:
consistent :: Row Choices -> Bool
consistent = nodupes . concat . filter is_single

-- A board is "safe" if it doesn't break the sudoku rules:
safe :: Board Choices -> Bool
safe cb = all consistent (rows cb) && all consistent (columns cb) && all consistent (boxes cb)

-- A board is "blocked" if it's void or not safe:
blocked :: Board Choices -> Bool
blocked b = void b || not (safe b)
```

Now here's how our search function would look:

```haskell
search :: Board Choices -> [Grid]
search b | blocked b = []
         | complete b = collapse b
         | otherwise = [g | b' <- expand b,
                            g  <- search (fixpoint prune b')]

-- The final piece of the puzzle, so to speak, is `expand`.
-- It behaves like collapse, but instead of performing a cartesian product, we can go with
-- a variety of strategies. We can begin collapsing from, say, the box with fewest
-- choices, or we can just expand the first box, indiscriminately:
expand :: Board Choices -> [Board Choices]
expand b = [rows1 ++ [row1 ++ [c] : row2] ++ rows2 | c <- cs]
    where
        (rows1, row : rows2) = break (any (not . is_single)) b
        (row1, cs : row2) = break (not . is_single) row
```

Then our implementation becomes:

```haskell
solve = search . fixpoint prune . choices
```

Seems all neat and tidy, doesn't it? Unfortunately, it's much slower than it could be.
It takes as much as 2 minutes to solve 10 puzzles from the list I mentioned above. In the
next few posts, we'll see how to profile our solution, parallelise it, and further
optimize it to solve puzzles in a flash!
