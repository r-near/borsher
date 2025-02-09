# Borsher

A TypeScript-first [Borsh](https://borsh.io) serialization library with automatic type inference.

## Features

- 🎯 **Type-safe**: Full TypeScript support with automatic type inference
- 🔧 **Flexible**: Zod-like interface for schema definition
- 🚀 **Simple**: Wraps [Borsh JS](https://github.com/near/borsh-js) with an intuitive API
- 💪 **Robust**: Handles complex data structures including enums, maps, and nested types

## Quick Start

```ts
import { BorshSchema } from "borsher";

// Define your schema with automatic type inference
const userSchema = BorshSchema.Struct({
  name: BorshSchema.String,
  age: BorshSchema.u8,
  balance: BorshSchema.u128,
});

// TypeScript automatically infers input types!
const user = {
  name: "Alice",
  age: 25,
  balance: "1000000", // Flexible input: accepts string/number for bigint
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
import { BorshSchema, InferInput, InferOutput } from "borsher";

// Define your schema
const userSchema = BorshSchema.Struct({
  name: BorshSchema.String,
  balances: BorshSchema.HashMap(BorshSchema.String, BorshSchema.u128),
});

// Input types are automatically inferred when using schema.serialize()
const user = {
  name: "alice",
  balances: new Map([
    ["sol", "1000000"], // Can use string for convenience
    //["eth", 2000000n], // Or native bigint
  ]),
};
userSchema.serialize(user); // Type-checked at compile time!

// Output types are automatically inferred when using schema.deserialize()
const decoded = userSchema.deserialize(buffer);
decoded.balances.get("sol"); // Always bigint after deserialization

// You can also explicitly get the types using InferInput/InferOutput
type UserInput = InferInput<typeof userSchema>;
//   ^? { name: string; balances: Map<string, string | bigint> }

type UserOutput = InferOutput<typeof userSchema>;
//   ^? { name: string; balances: Map<string, bigint> }
```

Here's a simpler example showing the input/output type difference:

```ts
const schema = BorshSchema.u128;

const value = "1000000"; // Can use string
// const value = 1000000; // Or number
// const value = 1000000n; // Or bigint

const buffer = schema.serialize(value);
const decoded = schema.deserialize(buffer); // Always returns bigint
```

## Supported Types

### Primitive Types

#### Numbers

- Unsigned integers: `u8`, `u16`, `u32`, `u64`, `u128`
- Signed integers: `i8`, `i16`, `i32`, `i64`, `i128`
- Floating point: `f32`, `f64`

```ts
const n: number = 100;
const buffer = borshSerialize(BorshSchema.u8, n);
```

#### Other Primitives

- `bool`: Boolean values
- `String`: UTF-8 encoded strings
- `Unit`: Empty type (similar to void)

```ts
const message = "hello world";
const buffer = borshSerialize(BorshSchema.String, message);
```

### Complex Types

#### Option (Nullable Types)

```ts
const schema = BorshSchema.Option(BorshSchema.String);
const value: string | null = "hello world";
const buffer = borshSerialize(schema, value);
```

#### Collections

- `Array`: Fixed-length arrays
- `Vec`: Dynamic-length vectors
- `HashSet`: Unique collections
- `HashMap`: Key-value collections

```ts
// HashMap example
const schema = BorshSchema.HashMap(BorshSchema.String, BorshSchema.u128);
const balances = new Map([
  ["alice", "1000000"],
  ["bob", "2000000"],
]);
const buffer = borshSerialize(schema, balances);
```

#### Struct

```ts
const personSchema = BorshSchema.Struct({
  name: BorshSchema.String,
  age: BorshSchema.u8,
});

const person = {
  name: "alice",
  age: 18,
};

const buffer = borshSerialize(personSchema, person);
```

#### Enum

Supports both simple enums and enums with associated data:

```ts
// Simple enum
const statusSchema = BorshSchema.Enum({
  Pending: BorshSchema.Unit,
  Fulfilled: BorshSchema.Unit,
  Rejected: BorshSchema.Unit,
});

// Enum with associated data
const shapeSchema = BorshSchema.Enum({
  Square: BorshSchema.u32,
  Circle: BorshSchema.Struct({
    radius: BorshSchema.u32,
  }),
});
```

## Advanced Usage

For more complex examples and advanced usage, check out our test files or the examples below:

```ts
// Complex nested structure example
const gameStateSchema = BorshSchema.Struct({
  players: BorshSchema.Vec(
    BorshSchema.Struct({
      id: BorshSchema.String,
      score: BorshSchema.u32,
      inventory: BorshSchema.HashMap(BorshSchema.String, BorshSchema.u16),
    })
  ),
  status: BorshSchema.Enum({
    Playing: BorshSchema.Unit,
    Paused: BorshSchema.Unit,
    GameOver: BorshSchema.Struct({
      winner: BorshSchema.String,
      finalScore: BorshSchema.u32,
    }),
  }),
});
```

## Legacy API

For compatibility with existing code, Borsher also provides standalone serialization functions. These maintain the same type safety as the schema methods:

```ts
import { borshSerialize, borshDeserialize } from "borsher";

// These functions are type-safe but schema.serialize() is preferred
const buffer = borshSerialize(userSchema, user);
const decoded = borshDeserialize(userSchema, buffer);
```
