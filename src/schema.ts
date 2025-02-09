import { type Schema, deserialize as thirdPartyDeserialize, serialize } from "borsh"

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
  private readonly _typedArrayType?: string
  // Keep track of type and tag explicitly to help TypeScript with type inference
  private readonly _type: T
  private readonly _tag: Tag

  private constructor(schema: Schema, typedArrayType?: string) {
    this.schema = schema
    this._typedArrayType = typedArrayType
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
  static Vec(inner: BorshSchema<number, "i64">): BorshSchema<Int64Array>
  static Vec(inner: BorshSchema<number, "f32">): BorshSchema<Float32Array>
  static Vec(inner: BorshSchema<number, "f64">): BorshSchema<Float64Array>
  static Vec<T>(inner: BorshSchema<T>): BorshSchema<T[]>
  static Vec(inner: BorshSchema<unknown, string> | BorshSchema<unknown>): BorshSchema<unknown> {
    let typedArrayType: string | undefined
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
    return Buffer.from(serialize(this.schema, value))
  }

  /**
   * Deserializes the given buffer.
   *
   * First, the third-party deserializer decodes the buffer.
   * If this schema was defined as a vector of a recognized numeric type
   * (as indicated by _typedArrayType) and the result is a plain array,
   * we convert that array into the corresponding typed array.
   */
  deserialize(buffer: Uint8Array): T {
    const result: unknown = thirdPartyDeserialize(this.schema, buffer)
    return this.convertToTypedArrays(result, this.schema) as T
  }

  private convertToTypedArrays(value: unknown, schema: Schema): unknown {
    // Handle null/undefined values
    if (value == null) {
      return value
    }

    // Handle array with _typedArrayType (Vec case)
    if (Array.isArray(value) && this._typedArrayType !== undefined) {
      switch (this._typedArrayType) {
        case "u8":
          return new Uint8Array(value)
        case "u16":
          return new Uint16Array(value)
        case "u32":
          return new Uint32Array(value)
        case "i8":
          return new Int8Array(value)
        case "i16":
          return new Int16Array(value)
        case "i32":
          return new Int32Array(value)
        case "i64":
          return new BigInt64Array(value)
        case "f32":
          return new Float32Array(value)
        case "f64":
          return new Float64Array(value)
        default:
          return value
      }
    }

    // Handle struct type
    if (
      typeof schema === "object" &&
      "struct" in schema &&
      typeof value === "object" &&
      value !== null
    ) {
      const result: Record<string, unknown> = {}
      const structFields = schema.struct

      for (const [key, fieldSchema] of Object.entries(structFields)) {
        const fieldValue = (value as Record<string, unknown>)[key]
        // Create a new BorshSchema instance for the field if it's an array type
        if (
          typeof fieldSchema === "object" &&
          "array" in fieldSchema &&
          !("len" in fieldSchema.array)
        ) {
          const innerType = fieldSchema.array.type
          if (typeof innerType === "string") {
            const tempSchema = new BorshSchema(fieldSchema, innerType)
            result[key] = tempSchema.convertToTypedArrays(fieldValue, fieldSchema)
          } else {
            result[key] = this.convertToTypedArrays(fieldValue, fieldSchema)
          }
        } else {
          result[key] = this.convertToTypedArrays(fieldValue, fieldSchema)
        }
      }
      return result
    }

    // Handle array type (fixed-length arrays or other array types)
    if (typeof schema === "object" && "array" in schema && Array.isArray(value)) {
      return value.map((item) => this.convertToTypedArrays(item, schema.array.type))
    }

    // Handle map type
    if (typeof schema === "object" && "map" in schema && value instanceof Map) {
      const newMap = new Map()
      const valueSchema = schema.map.value
      // Create a temporary schema for Vec value types
      let tempValueSchema: BorshSchema<unknown> | undefined
      if (
        typeof valueSchema === "object" &&
        "array" in valueSchema &&
        !("len" in valueSchema.array)
      ) {
        const innerType = valueSchema.array.type
        if (typeof innerType === "string") {
          tempValueSchema = new BorshSchema(valueSchema, innerType)
        }
      }

      for (const [k, v] of value.entries()) {
        const newKey = this.convertToTypedArrays(k, schema.map.key)
        const newValue = tempValueSchema
          ? tempValueSchema.convertToTypedArrays(v, valueSchema)
          : this.convertToTypedArrays(v, schema.map.value)
        newMap.set(newKey, newValue)
      }
      return newMap
    }

    // Handle enum type
    if (
      typeof schema === "object" &&
      "enum" in schema &&
      typeof value === "object" &&
      value !== null
    ) {
      const entries = Object.entries(value)[0]
      if (entries) {
        const [variantName, variantValue] = entries
        // Find the variant's schema
        const variantStruct = schema.enum.find((v) => variantName in v.struct)
        if (variantStruct) {
          // For Vec types, we need to create a new BorshSchema with the appropriate typedArrayType
          const variantSchema = variantStruct.struct[variantName]
          if (
            typeof variantSchema === "object" &&
            "array" in variantSchema &&
            !("len" in variantSchema.array)
          ) {
            const innerType = variantSchema.array.type
            if (typeof innerType === "string") {
              const tempSchema = new BorshSchema(variantSchema, innerType)
              return { [variantName]: tempSchema.convertToTypedArrays(variantValue, variantSchema) }
            }
          }
          // For other types, just process normally
          return { [variantName]: this.convertToTypedArrays(variantValue, variantSchema) }
        }
      }
    }

    // Return unchanged for primitive types or unhandled cases
    return value
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
