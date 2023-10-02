# Table of contents

* User Guide
	* [About The Lanst Language](#lanst-language)
	* [Get Started with Lanst](#get-started-with-lanst)
	* [Using Lanst](#using-lanst)
	* [Full User Guide](#documentation)
		* [Hello World](#hello-world)
		* [Fundementals](#fundementals)
* Reference Manual
	* [types](#types)
	* [system](#system)
		* [print](#print)
		* [println](#println)
	* [net](#net)
		* [get](#get)

# Lanst language

# Get Started with Lanst

To use Lanst, you must use `deno` and run it from it's source.

# Using Lanst
* Download [deno](https://deno.land/manual@v1.32.4/getting_started/installation)
* Donwload source
* Unzip
* Open a terminal at ./
* Put any code you want into `main.lan`, or enable the `REPL` in main.ts.
* Enter `deno run -A main.ts`

# Documentation

# Hello World

Want to get started in less than 15 minutes? Write your first "Hello World" program in Lanst!

Lanst has a very simple `system` library which encapsulates the `println` function.

```
system.println("Hello, world!")
```

### Breakdown

Calling `system.println` with a string, "Hello, world!" prints `Hello, world!` to the stdout.

### Println supports any number of arguments

```
system.println("Hello,", "world!")
```

# Fundementals

# Variables

*Lanst will refer to "variables" as "reservations" from this point on.*

There are two types of reservations in Lanst: `unlocked` and `locked`.

Unlocked reservations can be reassigned, and locked reservations will throw an error when attempting to reassign them.

Use the `res` and `reslock` keywords to assign reservations. After a reservation is made, use `(reservation) = (new_value)` to re-assign.

```
res y = 50

y = 30
system.println(y)
```

This code is expected to print `30`.

```
reslock y = 50

y = 30
```

This code is expected to throw a reassignment error.

### Moved values

In Lanst, a reservation can be moved from one reference to another. For example:

```
res x = 50
res y = x

system.println(x)
```

This code will throw a moved reference error, because `y` now owns the value of `x`.

# Functions

Lanst functions have a slight quirk at the start and end of their structure.

```
(decorator) fn (fn-name)( (arguments) ) {
	(body)
} "(fn-description)"
```

The decorator (currenly only encapsulates `memoize`) can be provided to add extra functionality to... a function.

Example function:

```
res x = 50

fn add_to_x(y) {
	x = x + y
} "Add y to x."
```

You can call a function like so:

```
add_to_x(50)
```

# 
