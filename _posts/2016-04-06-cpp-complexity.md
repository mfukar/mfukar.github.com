---
layout: post
title: 99 sudoku problems in Haskell, 97
tags: [99-problems, haskell, functional-programming, sudoku]
year: 2015
month: 12
day: 11
published: false
summary: Cultural Learnings of 99 Problems for Make Benefit Glorious Language of Haskell
---

> If you think C++ is not overly complicated, just what is a protected abstract virtual base pure virtual private destructor and when was the last time you needed one?
>
>    — Tom Cargill

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

