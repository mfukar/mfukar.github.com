---
layout: post
title: Inspecting malloc state with gdb
tags: <++>
year: 2012
month: 06
day: 05
published: true
summary: Dump glibc malloc arena state
---

Recently I've had the joy (not) of debugging glibc's malloc implementation. Why? To find
out who corrupted a heap (and prove it wasn't _us_ but a library thread...yeah it's a mess).
I'm guessing there's nothing groundbreaking here, it's just a GDB script that inspects
malloc arenas and dumps the used chunks. You'll notice it was written for a 64-bit arch,
if you want to adapt or test it on a 32-bit target and get back to me, that'd be awesome.

So, code is in [this gist](https://gist.github.com/mfukar/2873593). Enjoy.
