# Borsher

A TypeScript-first [Borsh](https://borsh.io) serialization library with automatic type inference, featuring a Zod-like API.

## Features

- 🎯 **Type-safe**: Full TypeScript support with automatic type inference
- 🔧 **Flexible**: Zod-inspired schema builder with an intuitive API
- 🚀 **Simple**: Wraps [Borsh JS](https://github.com/near/borsh-js) with a modern interface
- 💪 **Robust**: Handles complex data structures including enums, maps, and nested types

## Quick Start

```ts
import { b } from "borsher";

// Define your schema with automatic type inference
const userSchema = b.Struct({
  name: b.string(),
  age: b.u8(),
  balance: b.u128(),
});

// TypeScript automatically infers input types!
const user = {
  name: "Alice",
  age: 25,
  balance: 1000000n,
};

// Type-safe serialization and deserialization
const buffer = userSchema.serialize(user); // Type error if user doesn't match schema
const decoded = userSchema.deserialize(buffer); // decoded.balance is strictly typed as bigint
```

## Installation

```shell
pnpm add borsher
```

## Type System

Borsher provides automatic type inference through its Zod-like interface. When you use any of the serialization functions with a schema, TypeScript automatically hints the expected types!

```ts
import { b } from "borsher";

// Define your schema
const userSchema = b.Struct({
  name: b.string(),
  balances: b.HashMap(b.string(), b.u128()),
});

// Input types are automatically inferred when using schema.serialize()
const user = {
  name: "alice",
  balances: new Map([
    ["sol", 1000000n],
    ["eth", 2000000n],
  ]),
};
userSchema.serialize(user); // Type-checked at compile time!

// Output types are automatically inferred when using schema.deserialize()
const decoded = userSchema.deserialize(buffer);
decoded.balances.get("sol");

// You can also explicitly get the types using b.infer
type User = b.infer<typeof userSchema>;
//   ^? { name: string; balances: Map<string, string | bigint> }
```

## Supported Types

### Primitive Types

#### Numbers

- Unsigned integers: `u8`, `u16`, `u32`, `u64`, `u128`
- Signed integers: `i8`, `i16`, `i32`, `i64`, `i128`
- Floating point: `f32`, `f64`

```ts
const schema = b.u8();
const n: number = 100;
const buffer = schema.serialize(n);
```

#### Other Primitives

- `bool`: Boolean values
- `string`: UTF-8 encoded strings
- `unit`: Empty type (similar to void)

```ts
const schema = b.string();
const message = "hello world";
const buffer = schema.serialize(message);
```

### Complex Types

#### Option (Nullable Types)

```ts
const schema = b.Option(b.string());
const value: string | null = "hello world";
const buffer = schema.serialize(value);
```

#### Collections

- `Array`: Fixed-length arrays
- `Vec`: Dynamic-length vectors
- `HashSet`: Unique collections
- `HashMap`: Key-value collections

```ts
// HashMap example
const schema = b.HashMap(b.string(), b.u128());
const balances = new Map([
  ["alice", 1000000n],
  ["bob", 2000000n],
]);
const buffer = schema.serialize(balances);
```

#### Struct

```ts
const personSchema = b.Struct({
  name: b.string(),
  age: b.u8(),
});

const person = {
  name: "alice",
  age: 18,
};

const buffer = personSchema.serialize(person);
```

#### Enum

Supports both simple enums and enums with associated data:

```ts
// Simple enum
const statusSchema = b.Enum({
  Pending: b.unit(),
  Fulfilled: b.unit(),
  Rejected: b.unit(),
});

// Enum with associated data
const shapeSchema = b.Enum({
  Square: b.u32(),
  Circle: b.Struct({
    radius: b.u32(),
  }),
});
```

## Advanced Usage

For more complex examples and advanced usage, check out our test files or the examples below:

```ts
// Complex nested structure example
const gameStateSchema = b.Struct({
  players: b.Vec(
    b.Struct({
      id: b.string(),
      score: b.u32(),
      inventory: b.HashMap(b.string(), b.u16()),
    })
  ),
  status: b.Enum({
    Playing: b.unit(),
    Paused: b.unit(),
    GameOver: b.Struct({
      winner: b.string(),
      finalScore: b.u32(),
    }),
  }),
});
```

## Legacy API

Borsher maintains compatibility with existing code in two ways:

### Classic BorshSchema Syntax

You can still use the classic `BorshSchema` syntax if you prefer:

```ts
import { BorshSchema } from "borsher";

// Classic syntax still works
const userSchema = BorshSchema.Struct({
  name: BorshSchema.String,
  age: BorshSchema.u8,
  balance: BorshSchema.u128,
});

// Complex types work the same way
const mapSchema = BorshSchema.HashMap(BorshSchema.String, BorshSchema.u128);
const enumSchema = BorshSchema.Enum({
  Success: BorshSchema.Unit,
  Error: BorshSchema.String,
});
```

### Standalone Serialization Functions

For compatibility with existing code, Borsher also provides standalone serialization functions:

```ts
import { borshSerialize, borshDeserialize } from "borsher";

// These functions are type-safe but schema methods are preferred
const buffer = borshSerialize(userSchema, user);
const decoded = borshDeserialize(userSchema, buffer);
```
