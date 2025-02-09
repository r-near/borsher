import {
  type Schema,
  deserialize as thirdPartyDeserialize,
  serialize as thirdPartySerialize,
} from "borsh"
import { SchemaVisitor } from "./visitor"
import type { TypedArrayType } from "./visitor"

/**
 * Helper type to extract the inner type from a BorshSchema.
 */
export type TypeOf<T extends BorshSchema<unknown, string>> = T extends BorshSchema<infer U, string>
  ? U
  : never

/**
 * BorshSchema is a thin wrapper around the underlying third‐party schema.
 * It carries both compile‐time type information and (via an optional runtime
 * flag) extra metadata that lets our custom deserialize() method convert plain
 * arrays into typed arrays.
 */
export class BorshSchema<T, Tag extends string = never> {
  // The underlying third‐party schema.
  private readonly schema: Schema
  // If set (for vector schemas), indicates that the plain array should be
  // converted into a typed array.
  private readonly _typedArrayType?: TypedArrayType
  // Keep track of type and tag explicitly to help TypeScript with type inference
  private readonly _type: T
  private readonly _tag: Tag
  private readonly visitor: SchemaVisitor

  private constructor(schema: Schema, typedArrayType?: TypedArrayType) {
    this.schema = schema
    this._typedArrayType = typedArrayType
    this.visitor = new SchemaVisitor()
    // These are only used for type inference, values don't matter
    this._type = null as T
    this._tag = "" as Tag
  }

  // Scalar types with exact same definitions as BorshSchema
  static readonly String = new BorshSchema<string>("string")

  // Unsigned integers:
  static readonly u8 = new BorshSchema<number, "u8">("u8")
  static readonly u16 = new BorshSchema<number, "u16">("u16")
  static readonly u32 = new BorshSchema<number, "u32">("u32")
  static readonly u64 = new BorshSchema<bigint, "u64">("u64") // no tag = no special Vec conversion
  static readonly u128 = new BorshSchema<bigint>("u128")

  // Signed integers:
  static readonly i8 = new BorshSchema<number, "i8">("i8")
  static readonly i16 = new BorshSchema<number, "i16">("i16")
  static readonly i32 = new BorshSchema<number, "i32">("i32")
  static readonly i64 = new BorshSchema<bigint, "i64">("i64")
  static readonly i128 = new BorshSchema<bigint>("i128")

  // Floating point numbers:
  static readonly f32 = new BorshSchema<number, "f32">("f32")
  static readonly f64 = new BorshSchema<number, "f64">("f64")

  // Other scalars:
  static readonly bool = new BorshSchema<boolean>("bool")
  static readonly Unit = new BorshSchema<Unit>({ struct: {} })

  static Option<T extends BorshSchema<unknown, string>>(inner: T): BorshSchema<TypeOf<T> | null> {
    return new BorshSchema({ option: inner.schema })
  }

  static Array<T extends BorshSchema<unknown, string>>(
    inner: T,
    length: number,
  ): BorshSchema<TypeOf<T>[]> {
    return new BorshSchema({ array: { type: inner.schema, len: length } })
  }

  /**
   * Vec creates a vector (variable-length array) schema.
   *
   * Overloads:
   *  - For recognized numeric types (which we "brand"), the return type is a typed array.
   *  - Otherwise, it falls back to returning an array of the inner type.
   */
  static Vec(inner: BorshSchema<number, "u8">): BorshSchema<Uint8Array>
  static Vec(inner: BorshSchema<number, "u16">): BorshSchema<Uint16Array>
  static Vec(inner: BorshSchema<number, "u32">): BorshSchema<Uint32Array>
  static Vec(inner: BorshSchema<number, "i8">): BorshSchema<Int8Array>
  static Vec(inner: BorshSchema<number, "i16">): BorshSchema<Int16Array>
  static Vec(inner: BorshSchema<number, "i32">): BorshSchema<Int32Array>
  static Vec(inner: BorshSchema<bigint, "i64">): BorshSchema<BigInt64Array>
  static Vec(inner: BorshSchema<number, "f32">): BorshSchema<Float32Array>
  static Vec(inner: BorshSchema<number, "f64">): BorshSchema<Float64Array>
  static Vec<T>(inner: BorshSchema<T>): BorshSchema<T[]>
  static Vec(inner: BorshSchema<unknown, string> | BorshSchema<unknown>): BorshSchema<unknown> {
    let typedArrayType: TypedArrayType | undefined
    if (typeof inner.schema === "string") {
      switch (inner.schema) {
        case "u8":
        case "u16":
        case "u32":
        case "i8":
        case "i16":
        case "i32":
        case "i64":
        case "f32":
        case "f64":
          typedArrayType = inner.schema
          break
        default:
          break
      }
    }
    return new BorshSchema({ array: { type: inner.schema } }, typedArrayType)
  }

  static HashSet<T extends BorshSchema<unknown, string>>(inner: T): BorshSchema<Set<TypeOf<T>>> {
    return new BorshSchema({ set: inner.schema })
  }

  static HashMap<K extends BorshSchema<unknown, string>, V extends BorshSchema<unknown, string>>(
    key: K,
    value: V,
  ): BorshSchema<Map<TypeOf<K>, TypeOf<V>>> {
    return new BorshSchema({ map: { key: key.schema, value: value.schema } })
  }

  static Struct<T extends Record<string, BorshSchema<unknown, string>>>(
    fields: T,
  ): BorshSchema<{ [K in keyof T]: TypeOf<T[K]> }> {
    return new BorshSchema({
      struct: Object.fromEntries(
        Object.entries(fields).map(([key, schema]) => [key, schema.schema]),
      ),
    })
  }

  static Enum<T extends Record<string, BorshSchema<unknown>>>(
    variants: T,
  ): BorshSchema<EnumVariant<T>> {
    return new BorshSchema({
      enum: Object.entries(variants).map(([variantName, schema]) => ({
        struct: { [variantName]: schema.schema },
      })),
    })
  }

  /**
   * Serializes the given value into a Buffer.
   */
  serialize(value: T): Buffer {
    return Buffer.from(thirdPartySerialize(this.schema, value))
  }

  /**
   * Deserializes the given buffer.
   *
   * First, the third-party deserializer decodes the buffer.
   * Then, we visit each node in the schema tree to convert arrays
   * into their appropriate typed arrays based on the schema definition.
   */
  deserialize(buffer: Uint8Array): T {
    const result = thirdPartyDeserialize(this.schema, buffer)
    return this.visitor.visit(
      result,
      this.schema,
      this._typedArrayType ? { typedArrayType: this._typedArrayType } : undefined,
    ) as T
  }
}

export type StructInput<T extends Record<string, BorshSchema<unknown>>> = {
  [K in keyof T]: TypeOf<T[K]>
}

/**
 * Helper type for enum variant discrimination.
 */
export type EnumVariant<T extends Record<string, BorshSchema<unknown>>> = {
  [K in keyof T]: {
    [KK in K]: TypeOf<T[K]>
  }
}[keyof T]

/**
 * Unit is defined as an empty record.
 */
export type Unit = Record<string, never>

export type StructFields = Record<string, BorshSchema<unknown>>
export type EnumVariants = Record<string, BorshSchema<unknown>>

// Re-export the TypeOf helper as "infer" if desired.
export type { TypeOf as infer }
