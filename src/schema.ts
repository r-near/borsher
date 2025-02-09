import { type Schema, deserialize, serialize } from 'borsh';

// Helper types to extract input/output, returning unknown if not a BorshSchema
type SchemaInput<T> = T extends BorshSchema<infer I, unknown> ? I : unknown;
type SchemaOutput<T> = T extends BorshSchema<unknown, infer O> ? O : unknown;

/**
 * A class representing a Borsh schema.  Provides static methods for
 * creating schemas for various data types, and instance methods for
 * serializing and deserializing data according to the schema.
 */
export class BorshSchema<Input, Output> {
  private constructor(private schema: Schema) {}

  // --------------------------
  // Primitive Types
  // --------------------------
  /**
   * Schema for String
   * @example
   * const message: string = 'hello world';
   * const buffer = BorshSchema.String.serialize(message);
   */
  static readonly String = new BorshSchema<string, string>('string');

  /**
   * Schema for u8
   * @example
   * const n: number = 100;
   * const buffer = BorshSchema.u8.serialize(n);
   */
  static readonly u8 = new BorshSchema<number, number>('u8');

  /**
   * Schema for u16
   * @example
   * const n: number = 100;
   * const buffer = BorshSchema.u16.serialize(n);
   */
  static readonly u16 = new BorshSchema<number, number>('u16');

  /**
   * Schema for u32
   * @example
   * const n: number = 100;
   * const buffer = BorshSchema.u32.serialize(n);
   */
  static readonly u32 = new BorshSchema<number, number>('u32');

  /**
   * Schema for u64
   * @example
   * const n: bigint = 100n;
   * const buffer = BorshSchema.u64.serialize(n);
   */
  static readonly u64 = new BorshSchema<number | string | bigint, bigint>('u64');

  /**
   * Schema for u128
   * @example
   * const n: bigint = 100n;
   * const buffer = BorshSchema.u128.serialize(n);
   */
  static readonly u128 = new BorshSchema<number | string | bigint, bigint>('u128');

  /**
   * Schema for i8
   * @example
   * const n: number = 100;
   * const buffer = BorshSchema.i8.serialize(n);
   */
  static readonly i8 = new BorshSchema<number, number>('i8');

  /**
   * Schema for i16
   * @example
   * const n: number = 100;
   * const buffer = BorshSchema.i16.serialize(n);
   */
  static readonly i16 = new BorshSchema<number, number>('i16');

  /**
   * Schema for i32
   * @example
   * const n: number = 100;
   * const buffer = BorshSchema.i32.serialize(n);
   */
  static readonly i32 = new BorshSchema<number, number>('i32');

  /**
   * Schema for i64
   * @example
   * const n: bigint = 100n;
   * const buffer = BorshSchema.i64.serialize(n);
   */
  static readonly i64 = new BorshSchema<number | string | bigint, bigint>('i64');

  /**
   * Schema for i128
   * @example
   * const n: bigint = 100n;
   * const buffer = BorshSchema.i128.serialize(n);
   */
  static readonly i128 = new BorshSchema<number | string | bigint, bigint>('i128');

  /**
   * Schema for f32
   * @example
   * const n: number = 1.0;
   * const buffer = BorshSchema.f32.serialize(n);
   */
  static readonly f32 = new BorshSchema<number, number>('f32');

  /**
   * Schema for f64
   * @example
   * const n: number = 1.0;
   * const buffer = BorshSchema.f64.serialize(n);
   */
  static readonly f64 = new BorshSchema<number, number>('f64');

  /**
   * Schema for bool
   * @example
   * const b: boolean = true;
   * const buffer = BorshSchema.bool.serialize(b);
   */
  static readonly bool = new BorshSchema<boolean, boolean>('bool');

  /**
   * Schema for Unit
   * @example
   * const unit: Unit = {};
   * const buffer = BorshSchema.Unit.serialize(unit);
   */
  static readonly Unit = new BorshSchema<Unit, Unit>({ struct: {} });

  // --------------------------
  // Composite Types
  // --------------------------
  /**
   * Schema for Option
   * @example
   * const schema = BorshSchema.Option(BorshSchema.String);
   *
   * const some: string | null = 'hello world';
   * const someBuffer = schema.serialize(some);
   *
   * const none: string | null = null;
   * const noneBuffer = schema.serialize(none);
   */
  static Option<T extends BorshSchema<unknown, unknown>>(
    inner: T,
  ): BorshSchema<SchemaInput<T> | null, SchemaOutput<T> | null> {
    return new BorshSchema({ option: inner.schema });
  }

  /**
   * Schema for Array
   * @example
   * const schema = BorshSchema.Array(BorshSchema.String, 2);
   * const messages: string[] = ['hello', 'world'];
   * const buffer = schema.serialize(messages);
   */
  static Array<T extends BorshSchema<unknown, unknown>>(
    inner: T,
    length: number,
  ): BorshSchema<SchemaInput<T>[], SchemaOutput<T>[]> {
    return new BorshSchema({ array: { type: inner.schema, len: length } });
  }

  /**
   * Schema for Vec
   * @example
   * const schema = BorshSchema.Vec(BorshSchema.String);
   * const messages: string[] = ['hello', 'world'];
   * const buffer = schema.serialize(messages);
   */
  static Vec<T extends BorshSchema<unknown, unknown>>(
    inner: T,
  ): T extends typeof BorshSchema.u8
    ? BorshSchema<Uint8Array, Uint8Array>
    : BorshSchema<SchemaInput<T>[], SchemaOutput<T>[]>;
  static Vec<T extends BorshSchema<unknown, unknown>>(inner: T) {
    if (inner === BorshSchema.u8) {
      return new BorshSchema<Uint8Array, Uint8Array>({ array: { type: 'u8' } });
    }
    return new BorshSchema({ array: { type: inner.schema } });
  }

  /**
   * Schema for HashSet
   * @example
   * const schema = BorshSchema.HashSet(BorshSchema.String);
   * const messages: Set<string> = new Set(['hello', 'world']);
   * const buffer = schema.serialize(messages);
   */
  static HashSet<T extends BorshSchema<unknown, unknown>>(
    inner: T,
  ): BorshSchema<Set<SchemaInput<T>>, Set<SchemaOutput<T>>> {
    return new BorshSchema({ set: inner.schema });
  }

  /**
   * Schema for HashMap
   * @example
   * const schema = BorshSchema.HashMap(BorshSchema.String, BorshSchema.u128);
   * const balances: Map<string, bigint> = new Map([
   *   ['alice', 1_000_000_000_000_000_000_000_000n],
   *   ['bob', 2_000_000_000_000_000_000_000_000n],
   * ]);
   * const buffer = schema.serialize(balances);
   */
  static HashMap<K extends BorshSchema<unknown, unknown>, V extends BorshSchema<unknown, unknown>>(
    key: K,
    value: V,
  ): BorshSchema<Map<SchemaInput<K>, SchemaInput<V>>, Map<SchemaOutput<K>, SchemaOutput<V>>> {
    return new BorshSchema({ map: { key: key.schema, value: value.schema } });
  }

  /**
   * Schema for Struct
   * @example
   * type Person = {
   *   name: string;
   *   age: number;
   * };
   *
   * const schema = BorshSchema.Struct({
   *   name: BorshSchema.String,
   *   age: BorshSchema.u8,
   * });
   *
   * const person: Person = {
   *   name: 'alice',
   *   age: 18,
   * };
   *
   * const buffer = schema.serialize(person);
   */
  static Struct<T extends Record<string, BorshSchema<unknown, unknown>>>(
    fields: T,
  ): BorshSchema<{ [K in keyof T]: SchemaInput<T[K]> }, { [K in keyof T]: SchemaOutput<T[K]> }> {
    return new BorshSchema({
      struct: Object.fromEntries(
        Object.entries(fields).map(([key, schema]) => [key, schema.schema]),
      ),
    });
  }

  /**
   * Schema for Enum
   * @example
   * type Status =
   *   | {
   *       Pending: Unit;
   *     }
   *   | {
   *       Fulfilled: Unit;
   *     }
   *   | {
   *       Rejected: Unit;
   *     };
   *
   * const schema = BorshSchema.Enum({
   *   Pending: BorshSchema.Unit,
   *   Fulfilled: BorshSchema.Unit,
   *   Rejected: BorshSchema.Unit,
   * });
   *
   * const status: Status = {
   *   Pending: {},
   * };
   *
   * const buffer = schema.serialize(status);
   *
   * @example
   * type Shape =
   *   | {
   *       Square: number;
   *     }
   *   | {
   *       Rectangle: {
   *         length: number;
   *         width: number;
   *       };
   *     }
   *   | {
   *       Circle: {
   *         radius: number;
   *       };
   *     };
   *
   * const schema = BorshSchema.Enum({
   *   Square: BorshSchema.u32,
   *   Rectangle: BorshSchema.Struct({
   *     length: BorshSchema.u32,
   *     width: BorshSchema.u32,
   *   }),
   *   Circle: BorshSchema.Struct({
   *     radius: BorshSchema.u32,
   *   }),
   * });
   *
   * const shape: Shape = {
   *   Square: 5,
   * };
   *
   * const buffer = schema.serialize(shape);
   */
  static Enum<T extends Record<string, BorshSchema<unknown, unknown>>>(
    variants: T,
  ): BorshSchema<EnumInput<T>, EnumOutput<T>> {
    return new BorshSchema({
      enum: Object.entries(variants).map(([variantName, schema]) => ({
        struct: { [variantName]: schema.schema },
      })),
    });
  }

  // --------------------------
  // Core Functionality
  // --------------------------
  /**
   * Serialize a value according to the schema.
   * @param value The value to serialize.
   * @returns A Buffer containing the serialized data.
   */
  serialize(value: Input): Buffer {
    const coercedValue = this.coerceInput(value);
    return Buffer.from(serialize(this.schema, coercedValue));
  }

  /**
   * Deserialize data according to the schema.
   * @param buffer The buffer to deserialize.
   * @returns The deserialized value.
   */
  deserialize(buffer: Uint8Array): Output {
    const value = deserialize(this.schema, buffer);
    return this.coerceOutput(value);
  }

  // --------------------------
  // Type Helpers
  // --------------------------

  private coerceInput(value: Input): unknown {
    if (
      this.schema === 'u64' ||
      this.schema === 'u128' ||
      this.schema === 'i64' ||
      this.schema === 'i128'
    ) {
      return BigInt(value as number | string | bigint);
    }
    return value;
  }

  private coerceOutput(value: unknown): Output {
    if (
      this.schema === 'u64' ||
      this.schema === 'u128' ||
      this.schema === 'i64' ||
      this.schema === 'i128'
    ) {
      return BigInt(value as bigint) as Output;
    }
    return value as Output;
  }
}

// --------------------------
// Type Inference Helpers
// --------------------------

/**
 * Infers the input type for a struct schema.
 */
export type StructInput<T extends Record<string, BorshSchema<unknown, unknown>>> = {
  [K in keyof T]: SchemaInput<T[K]>; // No conditional here, SchemaInput handles it
};

/**
 * Infers the output type for a struct schema.
 */
export type StructOutput<T extends Record<string, BorshSchema<unknown, unknown>>> = {
  [K in keyof T]: SchemaOutput<T[K]>; // No conditional here, SchemaOutput handles it
};

/**
 * Infers the input type for an enum schema.
 */
export type EnumInput<T extends Record<string, BorshSchema<unknown, unknown>>> = {
  [K in keyof T]: {
    [KK in K]: SchemaInput<T[K]>; // No conditional here
  };
}[keyof T];

/**
 * Infers the output type for an enum schema.
 */
export type EnumOutput<T extends Record<string, BorshSchema<unknown, unknown>>> = {
  [K in keyof T]: {
    [KK in K]: SchemaOutput<T[K]>; // No conditional here
  };
}[keyof T];

// --------------------------
// "Infer" type
// --------------------------
/**
 * Infers the input type of a BorshSchema.
 */
export type InferInput<T extends BorshSchema<unknown, unknown>> = SchemaInput<T>;
/**
 * Infers the output type of a BorshSchema.
 */
export type InferOutput<T extends BorshSchema<unknown, unknown>> = SchemaOutput<T>;

// --------------------------
// Utility Types
// --------------------------
/**
 * A type representing a unit type (an object with no fields).
 */
export type Unit = Record<string, never>;
/**
 * A type representing the fields of a struct schema.
 */
export type StructFields = Record<string, BorshSchema<unknown, unknown>>;
/**
 * A type representing the variants of an enum schema.
 */
export type EnumVariants = Record<string, BorshSchema<unknown, unknown>>;
