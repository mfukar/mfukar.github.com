---
layout: post
title: Bug disclosure
tags: [disclosure, bullshit]
year: 2017
month: 10
day: 22
published: true
summary: You can't please everyone
---
In an ever-evolving and complex ecosystem such as information security, the number of ways one can
disclose a bug changes by the day. It is also highly dependent on weather, Twitter trends, the
medium on which you choose to disclose, and arguably most importantly, if you have been keeping the
innocent people who live under oppressive regimes in mind while performing your research.

* Responsible disclosure: when the bug is disclosed at the convenience of at least one vendor
* Full disclosure: when your disclosure slightly inconveniences all vendors
* Reverse disclosure: when you report the bug to the vendor, they disclose it, and sue you
* Conspiracy disclosure: when the vendor discloses a bug, labels it a constrained write, but in fact
  has RCE
* Madagascar disclosure: the vendor discloses a DoS, a competent engineer finds out it's an
  arbitrary write, then a competent researcher points out they disclosed the same bug 4 years ago
* Deliberate disclosure: when you are mildly inconvenienced by a bounty not paid on time
* Unavoidable disclosure: when the vendor refuses to pay the bug bounty
* Accidental disclosure: when the bug is disclosed by somebody who owned you using the same bug,
  found out you were working on it, and decided to publish first
* Client-initiated disclosure: when an automated script discloses bugs by tweeting hashes to
  coredumps resulting from the bug
* Downstream disclosure: when you find a bug, patch it downstream, patch description includes "fuck
  upstream" in title
* Hidden disclosure: when upstream accepts your patch after removing any description of the bug.
* Markov disclosure: like hidden disclosure, except now the patch description is the output of a NN
  which is trained on LKML
* Ethical disclosure: when at least one organisation with no ties to technical topics, you, or the
  vendor, isn't angry with your bug
* Unethical disclosure: when you report a bug which is an infoleak, and a good opportunity to remind
  everyone that everyone else may be spying upon them, and who says you weren't doing it before you
  disclosed?
* Criminal disclosure: if the bug lies in a shitty chat application which a hypothetical dictator
  could use to find out where their subjects conspire, so that they may target a specific place
  instead of deploying the army all over the country
* Timely disclosure: when your bug report contains the phrase "Multiple issues", because the bugs
  are so many, that enumerating them all would speed up the heat death of the universe measurably
* Controversial disclosure: at least two different webshits disagree about the syntax of your report
* Rock bottom disclosure: disclosure that results from failing to be rewarded a bounty which you
  need to sustain an addiction
* Dead horse disclosure: you disclose yet another bug that grsec or EMET would stop exploitation of
* Hateful disclosure: you disclose a bug on a system you hate but unavoidably use
* Deadly disclosure: when you disclose a bug on software used in a life-support system, like systemd
* Gaslight disclosure: when your bug can be used to successfully start a fire
* Controlled disclosure: when your bug report demonstrates the bug has successfully been used to
  start a fire
* Counselling disclosure: when your report points out a code idiom that originated at least 4 decades
  ago and the bug would be avoided if it were used
* Preferential disclosure: when you disclose only to a group of people you like, and at least one
  vendor that doesn't like you is affected
