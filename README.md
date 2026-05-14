# Spex

Spex is a declarative language for AI-assisted software development. It addresses shortcomings of the chat interface commonly used in AI coding assistant tools.

In particular, Spex aims to solve the following problems:

- Instructions given to AI coding assistants contain valuable information, but this information is often lost among the noise produced during conversations.
- Professional software developers must adapt to a new mental model when programming through chat interfaces.
- Programs produced through chat interactions are difficult to reproduce because the exact prompts and their order are lost.
- Chat interfaces do not integrate well with existing software engineering tools such as version control systems.
- Referencing objects in the code base requires repetitive and verbose prompts.
- Because architecture and design are not persisted, AI agents must constantly read and reason about multiple files, leading to inefficient token usage.
- Reusability in chat interfaces is extremely limited and abstraction is arbitrary. 

The idea behind chat interfaces in AI coding tools is that _everyone_ should be able to code. While admirable, this approach often makes the tools inadequate for professional developers.

Spex acknowledges that in serious software projects it is neither wise nor feasible to replace programmers with machines. Instead, Spex integrates with the mental model and ecosystem of professional programmers, enabling them to be significantly more efficient. For this reason, Spex is probably not suited to someone that is not familiar with programming. This is a conscious decision made to cater to the needs of professional programmers and not the general public.

For this reason, Spex syntax is intentionally close to common languages such as TypeScript and SQL. Instead of manually implementing software, developers describe *spaces of valid implementations* using familiar programming abstractions such as:

* objects
* functions
* dependencies
* constraints

The Spex runtime synthesizes concrete implementations based on these specifications.

---

# Core Idea

In Spex:

* a type represents a space of possible implementations
* constraints refine that space
* reusable abstractions are represented as subtypes

For example:

```spex
CREATE SecureEndpoint AS
FROM HttpRequest -> HttpResponse
SELECT {
  - the user is authenticated and authorised.
  - The call is rate limited.
};
```

`SecureEndpoint` now represents the set of all endpoint implementations satisfying those constraints.

Developers can build on top of these abstractions instead of repeatedly specifying common architectural concerns.

---

# Design Goals

Spex is designed to:

* feel familiar to software developers
* resemble SQL-style declarative programming
* support compositional software synthesis
* enable reusable architectural abstractions

---

# Objects

Objects are analogous to types in a programming language. Objects can be translated to classes, structs, functions, etc.

## Basic Objects

Basic objects are provided by Spex natively. These objects represent the common basic types in a programming language:

```spex
string
number
bool
unit
```

`unit` is a special object that represent an empty type. It is useful in defining functions that take no input or do not return anything.

## Arrays

To represent an array:

```spex
string[]
```

## Products

Product objects are created by combining other objects:

```spex
(
  id: string,
  done: bool
)
```

`unit` objects in a product are ignored. Meaning, the following products are the same:

```spex
(
  id: string,
  foo: unit
)

(
  id: string
)
```

Consequently, `()` and `unit` are the same object.

## Exponentials

Spex support function types as well which are refered to as exponential objects. An exponential is defined by its domain and codomain which have to be objects themselves:

```spex
string -> number
(id: string) -> number
string -> unit
unit -> string
```
`string -> unit` represents all functions that take a string as input and do not return anything. `unit -> string` on the other hand, is a function that takes nothing as input, but returns a string.

## Subobjects

Subobjects are analogous to subsets. Subobjects refine an object by selecting memebers that satisfy some constraints. Constraints are defined through natural language:

```spex
FROM string
SELECT {
  are email addresses
}

FROM string -> number
SELECT {
  return the length of the given string
}
```

Subobjects are themselves objects so they could be subobjected as well. A good heuristic for writing constraints is to make the expression read as: 

> "from `object` select those that `{constraint}`".

# Named Objects

To name an object for reuse:

```spex
CREATE Todo AS
(
    id: string,
    title: string,
    completed: bool,
    created_at: string
);

CREATE EmailAddress AS
FROM string
SELECT {
  are email addresses
};

CREATE slugify AS
FROM string -> string
SELECT {
  return the slugified string
};
```

---

# Referencing

Spex allows referencing other objects in constraints using string interpolation as in template strings. The scope of a variable is determined using the same rules as in Typescript.

```spex
CREATE Todo AS
(
    id: string,
    title: string,
    completed: bool,
    created_at: string
);

CREATE validate AS
FROM Todo -> bool
SELECT {
  return true if @created_at is a valid date and return false otherwise
};

CREATE CreateTodo AS
FROM Todo -> Bool
SELECT {
  1. call @validate to validate the given todo
  2. throw an exception if validation failed
  3. insert the todo in the Todo table
}
```

This forms an explicit software dependency graph between objects.

Use `.` to reference a member of a product object:

```spex
CREATE ComplexNumber AS
(
    real: number,
    imag: number
);

CREATE Abs AS
FROM (z: ComplexNumber) -> number
SELECT {
  return square root of @z.real^2 + @z.imag^2
}
```

---

# Importing and Exporting

If there is a need to reuse some object in other files, we have to export the object and then import it where it is needed.

Suppose we have a file `types.spex` with the following content:

```spex
CREATE EmailAddress AS
FROM string
SELECT {
  are email addresses
};

CREATE Password AS
FROM string
SELECT {
  - have at least 8 characters
  - contain at least one upper case character
  - contain at least one lower case character
  - contain at least one number character
  - contain at least one special character
};

EXPORT EmailAddress;
EXPORT Password;
```

Then, we can import `EmailAddress` as itself in some other file:

```spex
IMPORT EmailAddress FROM "types.spex";
```

Or give it a different alias:

```spex
IMPORT EmailAddress FROM "types.spex" AS Username;
```

Or import the whole file:

```spex
IMPORT "types.spex" AS type;
```

In case the whole file is imported, it's objects could be referenced by:

```spex
IMPORT "types.spex" AS types;

CREATE SignUp AS
FROM (user: types.EmailAddress, pass: types.Password) -> string
SELECT {
  1. Check @user doesn't exists
  2. throw an error if the user exists
  3. add @user to the User table alongside the SHA-256 hash of @pass
  4. return the id of the newly created user
}
```

---

# Generating Code

To specify what objects in an specification has to be generated as explicit code:

```spex
GENERATE CreateTodo
```

Generation of some object naturally triggers generation of it's dependencies as well.

---

# Why SQL?

Spex uses SQL-inspired syntax because developers already understand:

* schemas
* views
* refinement through selection
* declarative programming
* dependency relationships

This dramatically reduces the learning curve.

---

# Long-Term Vision

Spex aims to provide:

* reusable semantic software abstractions
* compositional AI-assisted programming
* declarative architecture specification
* implementation synthesis guided by constraints

Instead of prompting LLMs directly, developers work with structured software semantics that can be analyzed, refined, verified, and synthesized.

# Example: Todo CLI App

This example demonstrates a simple command-line Todo application written in Spex.

The application supports:

- adding todos
- listing todos
- marking todos as completed
- persisting todos to disk
- validating input

---

## Domain Objects

```spex
CREATE TodoTitle AS
FROM string
SELECT {
  - are not empty
  - are shorter than 120 characters
};

CREATE Todo AS
(
    id: string,
    title: TodoTitle,
    completed: bool
);
```

---

## Storage Layer

```spex
CREATE TodoFilePath AS
FROM string
SELECT {
  represent a valid path to a JSON file storing todos
};

CREATE LoadTodos AS
FROM (path: TodoFilePath) -> Todo[]
SELECT {
  1. read the JSON file at @path
  2. return an empty list if the file does not exist
  3. parse the JSON content into todos
  4. throw an exception if the JSON is invalid
};

CREATE SaveTodos AS
FROM (
  path: TodoFilePath,
  todos: Todo[]
) -> unit
SELECT {
  1. serialize @todos as formatted JSON
  2. write the JSON to @path
};
```

---

## Todo Creation

```spex
CREATE CreateTodo AS
FROM (
  title: TodoTitle
) -> Todo
SELECT {
  1. generate a UUID for the todo id
  2. create a todo with completed set to false
  3. return the created todo
};
```

---

## Add Todo Command

```spex
CREATE AddTodo AS
FROM (
  path: TodoFilePath,
  title: TodoTitle
) -> Todo
SELECT {
  1. call @LoadTodos using @path
  2. call @CreateTodo using @title
  3. append the new todo to the loaded todos
  4. call @SaveTodos to persist the updated todos
  5. return the created todo
};
```

---

## List Todos Command

```spex
CREATE ListTodos AS
FROM (
  path: TodoFilePath
) -> string
SELECT {
  1. load todos using @LoadTodos
  2. return a formatted string representation of all todos
  3. show completed todos with a checkmark
  4. show incomplete todos with an empty checkbox
};
```

---

## Complete Todo Command

```spex
CREATE CompleteTodo AS
FROM (
  path: TodoFilePath,
  id: TodoId
) -> Todo
SELECT {
  1. load todos using @LoadTodos
  2. search for the todo matching @id
  3. throw an exception if the todo does not exist
  4. set the todo completed status to true
  5. persist the updated todo list using @SaveTodos
  6. return the updated todo
};
```

---

## CLI Parsing

```spex
CREATE CliArgs AS
(
    command: string,
    arguments: string[]
);

CREATE ParseCliArgs AS
FROM string[] -> CliArgs
SELECT {
  1. parse the command line arguments
  2. extract the command name
  3. extract the command arguments
};
```

---

## CLI Entry Point

```spex
CREATE Main AS
FROM string[] -> unit
SELECT {
  1. parse process arguments using @ParseCliArgs

  2. if the command is "add":
     - call @AddTodo

  3. if the command is "list":
     - call @ListTodos
     - print the result to stdout

  4. if the command is "complete":
     - call @CompleteTodo

  5. print a help message if the command is invalid

  6. print user-friendly error messages for exceptions
};
```

---

## Code Generation

```spex
GENERATE Main
```

This triggers generation of the complete CLI application and all required dependencies.
