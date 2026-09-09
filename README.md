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

For this reason, Spex syntax is intentionally close to common languages such as TypeScript and SQL. Instead of manually implementing software, developers describe what they want using familiar programming abstractions:

- objects
- patterns
- realizations
- environments

The central operation in Spex is **realization**: a concept is decomposed into other concepts and/or artifacts, gradually becoming more concrete. The Spex runtime synthesizes concrete implementations by following these realization paths to their artifact endpoints.

---

# Core Idea

In Spex:

- a **concept** describes something that needs to be realized
- **realization** decomposes a concept into other concepts and/or artifacts
- **subobjecting** restricts the members of an artifact universe
- an **environment** constrains which realization paths are available

The fundamental model is:

```text
Concept ── realization in Environment ──> Concept / Artifact
```

For example:

```spex
create WebApplication as
from concept
select {
  serve HTTP requests and respond with JSON
};
```

`WebApplication` is a concept. It can be realized as a product of more specific concepts:

```text
WebApplication
    ── realized-by ──>
        (
            database: SQLSchemaDescription,
            backend: ExpressAppDescription,
            frontend: ReactUIDescription
        )
```

Each of those can be realized further until concrete artifacts are reached. Realization is recursive:

```text
Concept
   │
   └── realization ──> Concept
                          │
                          └── realization ──> Artifact
```

Developers build on these abstractions instead of repeatedly specifying common architectural concerns.

---

# Design Goals

Spex is designed to:

- feel familiar to software developers
- resemble SQL-style declarative programming
- support compositional software synthesis
- enable reusable architectural abstractions

---

# Objects

Spex describes software using three fundamental kinds of object: **artifacts**, **concepts**, and **environments**. These are the base universes of the model. Every named or expression-level object belongs to exactly one of them.

## The Artifact Universe

`artifact` is the universe of concrete, producible things. Artifacts are not synonymous with source code or programs. An artifact can be a string, a number, a file, a structured object, or any other concrete representation that can be produced, manipulated, or used as a realization.

The artifact universe contains many sub-kinds:

```text
artifact
├── string
├── number
├── bool
├── unit
├── product
├── exponential
├── array
├── enum
├── pattern
├── literal
└── ...
```

### Basic Objects

Spex provides several built-in artifact objects:

```spex
string
number
bool
unit
```

`string`, `number`, and `bool` represent the familiar value universes. `unit` is a special artifact that represents the empty product — a space with exactly one member. It is useful in defining functions that take no input or do not return anything.

`concept` and `environment` are separate base universes, not sub-kinds of artifact. They are covered in [Concepts, Environments, and Realization](#concepts-environments-and-realization).

## Arrays

An array is an artifact whose members are sequences of some base artifact:

```spex
string[]
```

## Products

A product is an artifact formed by combining other artifacts into a structured record:

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

## Coproducts

A coproduct is an artifact that represents a choice between alternatives. Where a product means "both", a coproduct means "either". A value of a coproduct holds exactly one of the alternatives and records which one. Coproducts are also called sum types or tagged unions:

```spex
create Shape as
Point | Circle;

create Command as
AddTodo | ListTodos | CompleteTodo;
```

Coproducts combine with any other object form:

```spex
create Result as
string | (error: string) | unit;
```

Because the alternatives are disjoint, a coproduct needs no common universe: `A | B` simply says "an A or a B". This is what distinguishes a coproduct from a set union, which requires both sides to live in a common universe.

Operator precedence, from loosest to tightest, is: set operations, then `|`, then `->`:

```spex
create X as
A -> B | C;   -- (A -> B) | C

create Y as
A UNION B | C;   -- A UNION (B | C)
```

Use parentheses to group any expression and override the default precedence. A `(` opens a group unless it is followed by a field name and a colon, in which case it opens a product:

```spex
create X as
A -> (B | C);

create Y as
(A UNION B) EXCEPT C;
```

## Exponentials

An exponential is an artifact that represents a function space. It has a base (the result type) and an exponent (the parameter type), both of which must be artifacts:

```spex
string -> number
(id: string) -> number
string -> unit
unit -> string
```

`string -> unit` represents all functions that take a string as input and do not return anything. `unit -> string` is a function that takes nothing as input but returns a string.

## Subobjects

Subobjecting selects a subset of the members of an existing universe while preserving their kind. For example:

```text
PositiveNumber ⊆ Number
```

Every member of `PositiveNumber` is still a `Number`. No decomposition has occurred and no information-bearing structure has been replaced by parts. The universe has simply been restricted.

This is fundamentally different from **realization**, which decomposes an object into other objects (see [Concepts, Environments, and Realization](#concepts-environments-and-realization)):

```text
SUBOBJECTING
    restricts membership within a universe

REALIZATION
    decomposes an object into other objects
```

### The `from ... select ...` Syntax

The universal mechanism for subobjecting is:

```text
from X select P
```

read as: "from the universe `X`, select the members described by pattern `P`". The pattern determines membership — it describes how to establish whether an object belongs to the subobject. Patterns come in three forms — natural language, structured, and code — described in [Pattern Kinds](#pattern-kinds) below.

For example:

```spex
from number select {
  are positive
}
```

names the subobject of `number` containing exactly the positive numbers.

What subobjecting means depends on the universe being restricted.

### Subobjecting Artifacts

Most subobjecting happens within the artifact universe. The pattern restricts which artifacts — strings, numbers, products, functions, and so on — belong to the subobject.

#### Non-Exponential Artifacts

For non-exponential artifacts such as `string`, `number`, `bool`, and products, a pattern behaves like a membership test on the members themselves:

```spex
from string select {
  are email addresses
}
```

defines the subobject of `string` containing exactly the strings that are email addresses. Conceptually, the pattern is a classifier over the source universe:

```text
number
   │
   │ classifier
   ▼
{ n ∈ number | classifier(n) = true }
```

When a structured or code pattern is used, the subobject of a non-exponential artifact is realized as a classifier function over the source universe.

#### Exponentials

An exponential is a function space, so subobjecting an exponential restricts which functions belong to the subobject. Because a function is not inspected member-by-member the way a value is, the pattern describes the function's computational representation — what it computes and how:

````spex
from Number -> Bool select ```python
    if x > 0:
        return True
    else:
        return False
```
````

describes the subobject of `Number -> Bool` whose members behave this way. Natural language works just as well:

```spex
from string -> number select {
  return the length of the given string
}
```

describes the subobject of `string -> number` containing exactly the functions that return the length of their input.

The grammar does not treat exponentials specially: `from A -> B select ...` and `from number select ...` are the same subobjecting operation. Deciding whether a pattern is a classifier over values or a description of function behavior is a compile-time semantic concern, not a grammar restriction. The compiler infers a pattern's signature where possible, checks it against the source object, and rejects ambiguous or incompatible patterns (see [Code Patterns](#code-patterns)).

### Subobjecting Concepts

A concept describes something that still needs realization. Subobjecting a concept produces a more specific concept — it restricts which implementations the concept stands for without decomposing it:

```spex
create HttpApi as
from concept
select {
  serve HTTP requests and respond with JSON
};

create EchoApi as
from HttpApi
select {
  return the request body unchanged
};
```

Because `EchoApi` is a subobject of `HttpApi`, it inherits everything `HttpApi` stands for and only adds membership restrictions on top of it. Concepts are covered in depth in [Concepts, Environments, and Realization](#concepts-environments-and-realization).

### Subobjecting Environments

An environment describes the context in which realizations take place. Subobjecting an environment produces a more specific environment:

```spex
create Python as
from environment
select {
  language: Python
};

create FastAPI as
from Python
select {
  dependencies: fastapi, uvicorn
};
```

`FastAPI` is a subobject of `Python`: every environment satisfying `FastAPI`'s pattern is also a Python environment.

### Pattern Kinds

A pattern can be written in three forms. All three can be used with any source universe, but they differ in how — and how precisely — they determine membership.

#### Natural Language Patterns

Natural language patterns are written in braces:

```spex
from string select {
  are email addresses
}
```

A natural language pattern describes the membership criterion in prose. It carries no structure that can be checked mechanically, so it is **not provable** in the generated artifact: it is a statement of intent to be honored when producing members of the subobject.

#### Structured Patterns

Structured patterns are fenced code blocks without a language identifier. They are written in **SKIT** (Structured Kernel Implementation Template), a minimal language of programming directives that is supported by every modern programming language — `if` expressions, loops, `try`/`catch`, and similar. Because SKIT is universal, a structured pattern can be satisfied by a realization produced in any programming language:

````spex
from number select ```
if &number > 0 {
  return true
}
```
````

Unlike natural language patterns, structured patterns are **(partially) provable**: during generation the produced artifact is checked against the pattern, and the provable parts are validated automatically.

**Generation directives** mark the positions in a structured or code pattern where unprovable code is generated. A generation directive is a comment starting with `gen:` followed by a natural-language description of what to generate. In the example below, the generated artifact must contain an `if` block that checks `x > 0`; the body of that block is a generation directive, so exactly what it computes is not provable from the pattern:

````spex
from artifact select ```
if x > 0 {
  // gen: let $y be the square root of &x
}
```
````

#### Code Patterns

Code patterns are fenced code blocks with a language identifier. They are similar to structured patterns but apply to one specific language, so they may also use features that are specific to that language. The language identifier is recorded alongside the body in the AST:

````spex
from number select ```python
if &number > 0:
  return True
else:
  return False
```
````

The body of a code pattern must be syntactically valid in the language it specifies. A pattern with `python` in the fence, for example, should be valid Python.

Whether a code pattern is meaningful for the source universe is a compile-time semantic/type-checking concern, not a grammar restriction:

1. Parse the code pattern.
2. Infer its signature when possible.
3. Check compatibility with the source object.
4. Reject ambiguous or incompatible patterns at compile time.

A code pattern may be syntactically valid in the grammar but semantically invalid in a particular `from ... select ...` context.

Subobjects are themselves objects so they can be subobjected further. A good heuristic is to make the expression read as:

> "from `object` select those that `{pattern}`".

## Set Operations

Objects that live in a common universe can be combined with the set operations `UNION`, `INTERSECT`, and `EXCEPT`:

```spex
create EvenInt as
from int
select { are even };

create PositiveInt as
from int
select { are positive };

create EvenPositiveInt as
EvenInt INTERSECT PositiveInt;

create EvenOrPositive as
EvenInt UNION PositiveInt;

create EvenNotPositive as
EvenInt EXCEPT PositiveInt;
```

`UNION` keeps members that satisfy either side, `INTERSECT` keeps members that satisfy both sides, and `EXCEPT` removes the members of the right side from the left side.

Set operations bind loosest of all object operators and chain left-to-right:

```spex
create X as
A UNION B EXCEPT C;   -- (A UNION B) EXCEPT C
```

## Literals

A literal denotes a single value, and therefore represents the set containing exactly that value:

```spex
"root"   -- the string root
42       -- the number 42
true     -- the boolean true
```

Literals can participate in subobjecting or serve as alternatives in a coproduct:

```spex
create UserName as
string EXCEPT "root";

create Handedness as
"left" | "right";
```

## Enums

An enum is an artifact that declares a named set of allowed string values:

```spex
create Color as
enum ('red', 'green', 'blue');
```

An enum constrains a value to one of the listed strings.

## Patterns

A regex pattern literal is a pattern that defines a subobject of `string` — its members are precisely the strings matching the regex:

```spex
/\d+/
/create\b/i
/'([^'\\]|\\.)*'|"([^"\\]|\\.)*"/
```

The source is kept verbatim and flags such as `i` (case-insensitive) follow the closing slash. Because a pattern is itself an artifact (a subobject of `string`), it participates in set operations and coproducts like any other artifact:

```spex
create Digits as /\d+/;
create Word as /\w+/;

create DigitOrWord as Digits UNION Word;
```

This illustrates a general principle: different artifact kinds have different pattern representations. Regex patterns are the simplest example — a regex expression directly denotes a subobject of `string`. Code and structured patterns extend this idea to other artifact universes by expressing membership predicates as code.

# Concepts, Environments, and Realization

Spex distinguishes between _what_ software should be and _where_ and _how_ it is realized. The central operation is **realization**: a concept is decomposed into other concepts and/or artifacts, gradually becoming more concrete. This is fundamentally different from subobjecting, which restricts membership within a universe without decomposition.

```text
SUBOBJECTING
    restricts membership within a universe

REALIZATION
    decomposes an object into other objects
```

```text
PositiveNumber ⊆ Number          -- subobjecting
WebApplication → (db, be, fe)    -- realization
```

## Concept

A `concept` is a built-in base universe that represents an abstract specification of something that needs to be realized. Concepts are ordinary Spex objects and can be subobjected just like any other object:

```spex
create HttpApi as
from concept
select {
  serve HTTP requests and respond with JSON
};

create EchoApi as
from HttpApi
select {
  return the request body unchanged
};
```

Because `EchoApi` is a subobject of `HttpApi`, it inherits everything `HttpApi` stands for and only adds membership restrictions on top of it.

A concept can be abstract and can itself be composed of other abstract concepts. It does not need to directly correspond to executable code. The goal of concepts is to allow specifications to remain independent of implementation details: a concept describes _what_ the software should be, leaving _how_ it is built to be decided later.

## Environment

An `environment` is a built-in base universe. It describes the development and runtime context in which realizations take place. An environment is independent from the application specification.

An environment may specify:

- the programming language
- the language or runtime version
- frameworks
- libraries and dependencies
- other tooling required to build or run the generated program

Environments are ordinary Spex objects and can be specialized through subobjects:

```spex
create Python as
from environment
select {
  language: Python
};

create FastAPI as
from Python
select {
  dependencies: fastapi, uvicorn
};
```

An environment determines or constrains which realization paths are available. Different environments can therefore provide different realization paths for the same concept. An environment is itself something that can be realized into an _environment artifact_: a reproducible description of the environment, such as a Dockerfile. Docker is not the only possible backend; any artifact that reproducibly describes the environment can serve this role.

## Realization

Realization is the mechanism that connects an abstract concept to a more concrete representation. It is fundamentally different from subobjecting:

- **Subobjecting** preserves the object's base universe. Every member of `PositiveNumber` is still a `Number`.
- **Realization** may cross universe boundaries. Realizing a `Concept` does not mean the result is a subobject of that concept.

A realization decomposes a concept into other concepts and/or artifacts:

```text
Concept
   │
   └── realization ──> Concept
                          │
                          └── realization ──> Artifact
```

For example, a `WebApplication` concept might be realized as a product of more specific concepts:

```text
WebApplication
    ── realized-by ──>
        (
            database: SQLSchemaDescription,
            backend: ExpressAppDescription,
            frontend: ReactUIDescription
        )
```

Each component is a part/decomposition of the `WebApplication` — not a more specific `WebApplication`.

A realization is associated with an environment because different environments may realize the same abstract concept differently. The same abstract `HttpApi`, for example, might be realized using Flask in a Python environment or Express in a TypeScript environment:

```text
             HttpApi
             /     \
        Flask       Express
          |            |
     Python code   TypeScript code
```

In Spex, this is declared with the `realize` statement:

```spex
realize HttpApi as FlaskHttpApi in Python;
```

Realization is recursive: an abstract concept can be realized into objects that are themselves still abstract and require further realization. Code generation is possible when the relevant abstract concepts have reached concrete realizations.

## Relationship Between the Three

The overall model connects the specification to concrete artifacts:

```text
Concept ── realization in Environment ──> Concept / Artifact
                                                   │
                                                   │ subobjecting
                                                   ▼
                                            constrained artifact
```

Environments follow the same path towards a concrete artifact:

```text
Environment
   |
   | realization
   v
Environment artifact
(e.g. Dockerfile)
```

The important distinction is:

**Concepts describe what the software should be.
Environments describe where/how it is to be realized.
Realizations decompose the abstract specification into concrete representations.**

Synthia can use this graph to choose a path from an abstract concept toward concrete artifacts.

# Named Objects

To name an object for reuse:

```spex
create Todo as
(
    id: string,
    title: string,
    completed: bool,
    created_at: string
);

create EmailAddress as
from string
select {
  are email addresses
};

create slugify as
from string -> string
select {
  return the slugified string
};
```

---

# Referencing

Spex allows referencing other objects in patterns using `@` followed by the object name. The scope of a reference is determined using the same rules as in TypeScript.

```spex
create Todo as
(
    id: string,
    title: string,
    completed: bool,
    created_at: string
);

create validate as
from Todo -> bool
select {
  return true if @created_at is a valid date and return false otherwise
};

create CreateTodo as
from Todo -> Bool
select {
  1. call @validate to validate the given todo
  2. throw an exception if validation failed
  3. insert the todo in the Todo table
}
```

The parser automatically extracts references from patterns into structured AST nodes, making it easy to analyze dependencies programmatically. Each pattern is parsed into a sequence of text segments and reference nodes:

```spex
"call @LoadTodos using @path"
→ [text: "call ", ref: LoadTodos, text: " using ", ref: path]
```

Use `.` to reference a member of a product object:

```spex
create ComplexNumber as
(
    real: number,
    imag: number
);

create Abs as
from (z: ComplexNumber) -> number
select {
  return square root of @z.real^2 + @z.imag^2
}
```

---

# Importing

Any defined object can be reused in another file by importing it where it is needed.

Suppose we have a file `types.spex` with the following content:

```spex
create EmailAddress as
from string
select {
  are email addresses
};

create Password as
from string
select {
  - have at least 8 characters
  - contain at least one upper case character
  - contain at least one lower case character
  - contain at least one number character
  - contain at least one special character
};
```

Then, we can import `EmailAddress` as itself in some other file:

```spex
import EmailAddress from "types.spex";
```

Or give it a different alias:

```spex
import EmailAddress from "types.spex" as Username;
```

Or import the whole file:

```spex
import "types.spex" as type;
```

In case the whole file is imported, its objects could be referenced by:

```spex
import "types.spex" as types;

create SignUp as
from (user: types.EmailAddress, pass: types.Password) -> string
select {
  1. Check @user doesn't exists
  2. throw an error if the user exists
  3. add @user to the User table alongside the SHA-256 hash of @pass
  4. return the id of the newly created user
}
```

---

# Including Resources

A _resource_ is an external artifact that is not generated, such as an image, a JSON file, or a folder of assets. Use the `include` declaration to bring a resource into scope:

```spex
include "config.json" as config;
include "images/logo.png" as logo;
```

The address is a string literal pointing to a file or folder. The name becomes a first-class object in the current scope and can be referenced in patterns with `@`:

```spex
include "schema.sql" as schema;

create LoadSchema as
from unit -> string
select {
  1. read the SQL file at @schema
  2. return its contents as a string
};
```

## Folders

When the address points to a folder, the resource is treated as a product object whose fields correspond to the files inside it:

```spex
include "assets/" as assets;

create LoadConfig as
from unit -> Config
select {
  1. read @assets.config.json
  2. return its content as a Config object
};
```

## Constraints

Resources cannot be subobjected. That is, `from <resource> select { ... }` is not valid. This is because a resource represents a concrete external artifact, not a space of possible implementations.

---

# Generating Code

To specify what objects in a specification should be generated as concrete artifacts:

```spex
generate CreateTodo
```

Generation of some object naturally triggers generation of its dependencies as well. Generation is a consequence of selecting a realization path that ends in concrete artifacts — the fundamental semantic operation of Spex is realization, not code generation.

---

# Packaging Code

To specify how generated artifacts should be packaged, use the `package` declaration:

```spex
package executable <name> as <object> in <environment>
package module <name> as <object> in <environment>
```

`executable` packages the object as a standalone application entry point. `module` packages it as a library or module that can be imported by other code. The object after `in` is an environment describing where the package is realized.

```spex
package executable myapp as Main in Python;
package module mylib as utils in Node;
```

The object can be any valid Spex expression:

```spex
package executable cli as (path: string) -> unit in Python;
package module mylib as app.handlers in Node;
```

---

# Why SQL?

Spex uses SQL-inspired syntax because developers already understand:

- schemas
- views
- refinement through selection
- declarative programming
- dependency relationships

This dramatically reduces the learning curve.

---

# Long-Term Vision

Spex aims to provide:

- reusable semantic software abstractions
- compositional AI-assisted programming
- declarative architecture specification
- realization graphs that guide implementation synthesis

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

## Artifacts

```spex
create TodoTitle as
from string
select {
  - are not empty
  - are shorter than 120 characters
};

create Todo as
(
    id: string,
    title: TodoTitle,
    completed: bool
);
```

---

## Storage Layer

```spex
create TodoFilePath as
from string
select {
  represent a valid path to a JSON file storing todos
};

create LoadTodos as
from (path: TodoFilePath) -> Todo[]
select {
  1. read the JSON file at @path
  2. return an empty list if the file does not exist
  3. parse the JSON content into todos
  4. throw an exception if the JSON is invalid
};

create SaveTodos as
from (
  path: TodoFilePath,
  todos: Todo[]
) -> unit
select {
  1. serialize @todos as formatted JSON
  2. write the JSON to @path
};
```

---

## Todo Creation

```spex
create CreateTodo as
from (
  title: TodoTitle
) -> Todo
select {
  1. generate a UUID for the todo id
  2. create a todo with completed set to false
  3. return the created todo
};
```

---

## Add Todo Command

```spex
create AddTodo as
from (
  path: TodoFilePath,
  title: TodoTitle
) -> Todo
select {
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
create ListTodos as
from (
  path: TodoFilePath
) -> string
select {
  1. load todos using @LoadTodos
  2. return a formatted string representation of all todos
  3. show completed todos with a checkmark
  4. show incomplete todos with an empty checkbox
};
```

---

## Complete Todo Command

```spex
create CompleteTodo as
from (
  path: TodoFilePath,
  id: TodoId
) -> Todo
select {
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
create CliArgs as
(
    command: string,
    arguments: string[]
);

create ParseCliArgs as
from string[] -> CliArgs
select {
  1. parse the command line arguments
  2. extract the command name
  3. extract the command arguments
};
```

---

## CLI Entry Point

```spex
create Main as
from string[] -> unit
select {
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
package executable MyTodo as Main in Python;
```

This triggers generation of the complete CLI application and all required dependencies.
