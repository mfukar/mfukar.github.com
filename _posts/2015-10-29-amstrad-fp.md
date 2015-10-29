---
layout: post
title: Amstrad CPC BASIC - encoding of floating point numbers
tags: [amstrad, cpc, basic, floating-point]
year: 2015
month: 10
day: 29
published: true
summary: Just for reference
---

A while ago, I answered an inquiry into the representation of floating point numbers in
AMSTRAD CPC BASIC (Locomotive BASIC, I think) in a paste somewhere. Since I can't find it,
I thought I'd replicate it here, for posterity and somesuch.

Question: _How are floating point numbers encoded in Amstrad CPC's BASIC?_

First things first. A floating point number takes up 5 octets. Octets 0-3 contain the
mantissa in little-endian byte order. Octet 4 is the exponent.

The exponent is biased, +128.

Floating point numbers in Locomotive BASIC are displayed to 9 decimal points, unless there
is no fractional part.

Let's conjure up an example:

```BASIC
> PRINT @a!
326
> FOR I=0 TO 4:PRINT HEX$(PEEK(326+I),2);:NEXT I
A2DA0F4982
```

The mantissa is equal to `0x490fdaa2` (little-endian).

The mantissa MSB is 0, therefore it is a positive value.

The exponent is equal to 0x82.

Let's calculate the floating point number:

1. Delete the sign bit, and add the implied 1 bit. In other words, do `mantissa |
   0x80000000`:

     0xC90FDAA2 = 3373259426

2. Calculate the decimal representation of the mantissa:

     3373259426 / 2^32 = 0.7853981633670628

3. Multiply the value above by 2^exponent, which is biased by 0x80:

     0.7853981633670628 * 2^(0x82 - bias) = 3.1415926534682512

Yes, it was π all along! Note the accuracy up to the 9th decimal.
