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

For this reason, Spex syntax is intentionally close to common languages such as TypeScript and SQL. Instead of manually implementing software, developers describe _spaces of valid implementations_ using familiar programming abstractions such as:

- objects
- functions
- dependencies
- constraints

The Spex runtime synthesizes concrete implementations based on these specifications.

---

# Core Idea

In Spex:

- a type represents a space of possible implementations
- constraints refine that space
- reusable abstractions are represented as subtypes

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

- feel familiar to software developers
- resemble SQL-style declarative programming
- support compositional software synthesis
- enable reusable architectural abstractions

---

# Objects

Objects are analogous to types in a programming language. Objects can be translated to classes, structs, functions, etc.

## Basic Objects

Spex provides three base objects natively. Every object is a subobject of exactly one of these bases:

```spex
artifact
concept
environment
```

`artifact` is the base object for concrete, realizable things. `string`, `number`, `bool`, products, exponentials, arrays, literals, and patterns are all subobjects of `artifact`.

`unit` is a special subobject of `artifact` that represents an empty type. It is useful in defining functions that take no input or do not return anything.

`concept` and `environment` are abstract base objects. A `concept` represents an abstract specification of something that needs to be realized, while an `environment` describes the context in which concepts are realized. They are covered in depth in [Concepts, Environments, and Realization](#concepts-environments-and-realization).

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

## Coproducts

Coproduct objects represent a choice between alternatives. Where a product means "both", a coproduct means "either". A value of a coproduct holds exactly one of the alternatives and records which one. Coproducts are also called sum types or tagged unions:

```spex
CREATE Shape AS
Point | Circle;

CREATE Command AS
AddTodo | ListTodos | CompleteTodo;
```

Coproducts combine with any other object form:

```spex
CREATE Result AS
string | (error: string) | unit;
```

Because the alternatives are disjoint, a coproduct needs no common universe: `A | B` simply says "an A or a B". This is what distinguishes a coproduct from a set union, which requires both sides to live in a common universe.

Operator precedence, from loosest to tightest, is: set operations, then `|`, then `->`:

```spex
CREATE X AS
A -> B | C;   -- (A -> B) | C

CREATE Y AS
A UNION B | C;   -- A UNION (B | C)
```

Use parentheses to group any expression and override the default precedence. A `(` opens a group unless it is followed by a field name and a colon, in which case it opens a product:

```spex
CREATE X AS
A -> (B | C);

CREATE Y AS
(A UNION B) EXCEPT C;
```

## Exponentials

Spex supports function types which are referred to as exponential objects. An exponential has a base (the result type) and an exponent (the parameter type), both of which must be objects:

```spex
string -> number
(id: string) -> number
string -> unit
unit -> string
```

`string -> unit` represents all functions that take a string as input and do not return anything. `unit -> string` on the other hand, is a function that takes nothing as input, but returns a string.

## Subobjects

Subobjects are analogous to subsets. Subobjects refine an object by selecting members that satisfy a constraint. Base objects can be constrained in three ways: natural language, structured, and code.

### Natural Language Constraints

Natural language constraints are written in braces:

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

A natural language constraint describes the required property in prose. It carries no structure that can be checked mechanically, so it is **not provable** in the generated artifact: it is a statement of intent for whoever implements the subobject.

### Structured Constraints

Structured constraints are fenced code blocks without a language identifier. They are written in **SKIT** (Structured Kernel Implementation Template), a minimal language of programming directives that is supported by every modern programming language — `if` expressions, loops, `try`/`catch`, and similar. Because SKIT is universal, a structured constraint can be satisfied by an implementation produced in any programming language:

````spex
FROM artifact
SELECT ```
if x > 0 {
  // gen: let $y be the square root of &x
}
```
````

Structured and code constraints may only be applied to **subobjects of `artifact`**, the base object for concrete, realizable things. Unlike natural language constraints, they are **(partially) provable**: during generation the produced artifact is checked to contain what the constraint requires, and the provable parts are validated automatically.

**Generation directives** mark the positions in a structured or code constraint where unprovable code is generated. A generation directive is a comment starting with `gen:` followed by a natural-language description of what to generate. In the example above, the generated artifact must contain an `if` block that checks `x > 0`; the body of that block is a generation directive, so exactly what it computes is not provable from the constraint.

### Code Constraints

Code constraints are fenced code blocks with a language identifier. They are similar to structured constraints but apply to one specific language, so they may also use features that are specific to that language. The language identifier is recorded alongside the body in the AST:

````spex
FROM artifact
SELECT ```python
if x > 0:
  # gen: let $y be the square root of &x
  pass
```
````

This declares the same constraint as the structured version above, but only a Python implementation can satisfy it. Like structured constraints, code constraints are (partially) provable during generation and may only be applied to subobjects of `artifact`.

The body of a code constraint must be syntactically valid in the language it specifies. A constraint with `python` in the fence, for example, should be valid Python so that it can be checked against generated code.

Subobjects are themselves objects so they could be subobjected as well. A good heuristic for writing constraints is to make the expression read as:

> "from `object` select those that `{constraint}`".

## Set Operations

Objects that live in a common universe can be combined with the set operations `UNION`, `INTERSECT`, and `EXCEPT`:

```spex
CREATE EvenInt AS
FROM int
SELECT { are even };

CREATE PositiveInt AS
FROM int
SELECT { are positive };

CREATE EvenPositiveInt AS
EvenInt INTERSECT PositiveInt;

CREATE EvenOrPositive AS
EvenInt UNION PositiveInt;

CREATE EvenNotPositive AS
EvenInt EXCEPT PositiveInt;
```

`UNION` keeps members that satisfy either side, `INTERSECT` keeps members that satisfy both sides, and `EXCEPT` removes the members of the right side from the left side.

Set operations bind loosest of all object operators and chain left-to-right:

```spex
CREATE X AS
A UNION B EXCEPT C;   -- (A UNION B) EXCEPT C
```

## Literals

A literal object denotes a single value, and therefore represents the set containing exactly that value:

```spex
"root"   -- the string root
42       -- the number 42
true     -- the boolean true
```

Literals can refine other objects or serve as alternatives in a coproduct:

```spex
CREATE UserName AS
string EXCEPT "root";

CREATE Handedness AS
"left" | "right";
```

## Enums

An enum object declares a named set of allowed string values:

```spex
CREATE Color AS
ENUM ('red', 'green', 'blue');
```

An enum constrains a value to one of the listed strings.

## Patterns

A pattern literal denotes the subobject of `string` containing exactly the strings that match it:

```spex
/\d+/
/create\b/i
/'([^'\\]|\\.)*'|"([^"\\]|\\.)*"/
```

The source is kept verbatim and flags such as `i` (case-insensitive) follow the closing slash. Because a pattern is a subobject of the string base object, it participates in set operations and coproducts like any other object:

```spex
CREATE Digits AS /\d+/;
CREATE Word AS /\w+/;

CREATE DigitOrWord AS Digits UNION Word;
```

# Concepts, Environments, and Realization

Spex distinguishes between _what_ software should be and _where_ and _how_ it is realized. This separation is captured by three core ideas: concepts, environments, and realizations.

## Concept

A `concept` is a built-in base object that represents an abstract specification of something that needs to be realized. Concepts are ordinary Spex objects and can be subobjected just like any other object:

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

Because `EchoApi` is a subobject of `HttpApi`, it inherits everything `HttpApi` stands for and only adds constraints on top of it.

A concept can be abstract and can itself be composed of other abstract concepts. It does not need to directly correspond to executable code. The goal of concepts is to allow specifications to remain independent of implementation details: a concept describes _what_ the software should be, leaving _how_ it is built to be decided later.

## Environment

An `environment` is a second built-in base object. It describes the development and runtime context in which concepts are to be realized. An environment is independent from the application specification.

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

An environment is itself something that can be realized into an _environment artifact_: a reproducible description of the environment, such as a Dockerfile. Docker is not the only possible backend; any artifact that reproducibly describes the environment can serve this role.

Environment construction is separate from application-code generation. Preparing the context in which the software runs is a distinct concern from generating the software itself.

## Realization

Realization is the mechanism that connects an abstract concept to a more concrete representation. It is fundamentally different from subobjecting:

- a subobject preserves the object's base type
- a realization may cross abstraction or type boundaries

Therefore, realizing a `Concept` does not mean that the resulting object is a subobject of that concept.

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

The concrete representation produced by a realization is an artifact: a subobject of the `artifact` base object that can be generated and validated against provable constraints.

## Relationship Between the Three

The overall model connects the specification to concrete implementations:

```text
Concept
   |
   | realization in an Environment
   v
Environment-specific representation
   |
   | generation
   v
Concrete implementation/code
```

Environments follow the same path towards a concrete artifact:

```text
Environment
   |
   | generation
   v
Environment artifact
(e.g. Dockerfile)
```

The important distinction is:

**Concepts describe what the software should be.
Environments describe where/how it is to be realized.
Realizations connect the abstract specification to concrete representations.**

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

The parser automatically extracts references from constraints into structured AST nodes, making it easy to analyze dependencies programmatically. Each constraint is parsed into a sequence of text segments and reference nodes:

```spex
"call @LoadTodos using @path"
→ [text: "call ", ref: LoadTodos, text: " using ", ref: path]
```

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

# Importing

Any defined object can be reused in another file by importing it where it is needed.

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

# Including Resources

A _resource_ is an external artifact that is not generated, such as an image, a JSON file, or a folder of assets. Use the `INCLUDE` declaration to bring a resource into scope:

```spex
INCLUDE "config.json" AS config;
INCLUDE "images/logo.png" AS logo;
```

The address is a string literal pointing to a file or folder. The name becomes a first-class object in the current scope and can be referenced in constraints with `@`:

```spex
INCLUDE "schema.sql" AS schema;

CREATE LoadSchema AS
FROM unit -> string
SELECT {
  1. read the SQL file at @schema
  2. return its contents as a string
};
```

## Folders

When the address points to a folder, the resource is treated as a product object whose fields correspond to the files inside it:

```spex
INCLUDE "assets/" AS assets;

CREATE LoadConfig AS
FROM unit -> Config
SELECT {
  1. read @assets.config.json
  2. return its content as a Config object
};
```

## Constraints

Resources cannot be subobjected. That is, `FROM <resource> SELECT { ... }` is not valid. This is because a resource represents a concrete external artifact, not a space of possible implementations.

---

# Generating Code

To specify what objects in an specification has to be generated as explicit code:

```spex
GENERATE CreateTodo
```

Generation of some object naturally triggers generation of it's dependencies as well.

---

# Packaging Code

To specify how generated code should be packaged, use the `PACKAGE` declaration:

```spex
PACKAGE EXECUTABLE <name> AS <object> IN <environment>
PACKAGE MODULE <name> AS <object> IN <environment>
```

`EXECUTABLE` packages the object as a standalone application entry point. `MODULE` packages it as a library or module that can be imported by other code. The object after `IN` is an environment describing where the package is realized.

```spex
PACKAGE EXECUTABLE myapp AS Main IN Python;
PACKAGE MODULE mylib AS utils IN Node;
```

The object can be any valid Spex expression:

```spex
PACKAGE EXECUTABLE cli AS (path: string) -> unit IN Python;
PACKAGE MODULE mylib AS app.handlers IN Node;
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
- implementation synthesis guided by constraints

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
package executable MyTodo as Main in Python;
```

This triggers generation of the complete CLI application and all required dependencies.
