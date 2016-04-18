---
layout: post
title: Defending against complexity
tags: [complexity, cpp]
year: 2016
month: 04
day: 14
published: false
summary:
---

One quote that often comes up when (not seriously) discussing C++ is the following:

> If you think C++ is not overly complicated, just what is a protected abstract virtual base pure virtual private destructor and when was the last time you needed one?
>
>    — Tom Cargill

and then, of course, as any other non-serious discussion which is serious about not
keeping it serious, it quietly dies down, not giving way into any serious thought. This
post is not a joke.

Firstly, Tom Cargill _really knows his stuff_. He's not just randomly sampling C++
keywords in hopes of making a grammatically correct statement. To convince ourselves of
this, let's try and rebuild Tom's construct, and then we'll value its usefullness.

This
[StackOverflow](http://stackoverflow.com/questions/3618760/c-protected-abstract-virtual-base-pure-virtual-private-destructor)
question.

```cpp
#include <iostream>

struct Base {
    friend class Derived;
private:
    virtual ~Base() = 0;
};

Base::~Base() { std::cout << "Base" << std::endl; }

struct Derived : protected virtual Base {
    int _m;
    Derived (int m) : _m(m) { }
    void destroy () { delete this; }
private:
    ~Derived () { std::cout << "m: " << _m << std::endl; }
};


int main()
{
    auto a = new Derived(4);
    a->_m = 3;
    a->destroy();
    return 0;
}
```
