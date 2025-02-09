import type { Schema } from "borsh"
import type { ArrayType } from "borsh/lib/types/types"

/**
 * Type guard for Vec schemas
 */
export function isVecSchema(schema: Schema): schema is { array: { type: string } } {
  return (
    typeof schema === "object" &&
    "array" in schema &&
    !("len" in schema.array) &&
    typeof schema.array.type === "string"
  )
}

/**
 * Get the element type of a Vec schema
 */
export function getVecElementType(schema: Schema): string | undefined {
  if (!isVecSchema(schema)) return undefined
  return schema.array.type
}

// Define valid TypedArray types
export type TypedArrayType = keyof typeof TYPE_CONVERTERS

type VisitorContext = {
  typedArrayType?: TypedArrayType
}

/**
 * TypedArray converters for Vec types
 */
const TYPE_CONVERTERS = {
  u8: (arr: number[]) => new Uint8Array(arr),
  u16: (arr: number[]) => new Uint16Array(arr),
  u32: (arr: number[]) => new Uint32Array(arr),
  i8: (arr: number[]) => new Int8Array(arr),
  i16: (arr: number[]) => new Int16Array(arr),
  i32: (arr: number[]) => new Int32Array(arr),
  i64: (arr: bigint[]) => new BigInt64Array(arr),
  f32: (arr: number[]) => new Float32Array(arr),
  f64: (arr: number[]) => new Float64Array(arr),
} as const

/**
 * SchemaVisitor implements the visitor pattern for traversing and transforming
 * Borsh schema structures. It handles the conversion of arrays to appropriate
 * TypedArrays based on the schema definition.
 */
export class SchemaVisitor {
  /**
   * Visit a schema node and transform its value according to the schema type
   */
  visit(value: unknown, schema: Schema, context?: VisitorContext): unknown {
    if (value == null) return value

    // Handle primitive types directly
    if (typeof schema === "string") {
      return value
    }

    // Visit different schema types
    if ("struct" in schema) {
      return this.visitStruct(value, schema)
    }
    if ("array" in schema) {
      return this.visitArray(value, schema, context)
    }
    if ("map" in schema) {
      return this.visitMap(value, schema)
    }
    if ("enum" in schema) {
      return this.visitEnum(value, schema)
    }

    return value
  }

  /**
   * Visit a struct schema and transform its fields
   */
  private visitStruct(value: unknown, schema: { struct: Record<string, Schema> }): unknown {
    if (typeof value !== "object" || value === null) return value

    return Object.fromEntries(
      Object.entries(schema.struct).map(([key, fieldSchema]) => [
        key,
        this.visit(
          (value as Record<string, unknown>)[key],
          fieldSchema,
          this.isVecSchema(fieldSchema)
            ? { typedArrayType: this.getVecElementType(fieldSchema) }
            : undefined,
        ),
      ]),
    )
  }

  /**
   * Visit an array schema and transform its elements
   */
  private visitArray(
    value: unknown,
    schema: { array: { type: Schema; len?: number } },
    context?: VisitorContext,
  ): unknown {
    if (!Array.isArray(value)) return value

    // Handle Vec types (arrays that should be converted to TypedArrays)
    if (!schema.array.len && context?.typedArrayType && context.typedArrayType in TYPE_CONVERTERS) {
      return TYPE_CONVERTERS[context.typedArrayType](value)
    }

    // Handle regular arrays
    return value.map((item) =>
      this.visit(
        item,
        schema.array.type,
        this.isVecSchema(schema.array.type)
          ? { typedArrayType: this.getVecElementType(schema.array.type) }
          : undefined,
      ),
    )
  }

  /**
   * Visit a map schema and transform its key-value pairs
   */
  private visitMap(value: unknown, schema: { map: { key: Schema; value: Schema } }): unknown {
    if (!(value instanceof Map)) return value

    return new Map(
      Array.from(value.entries()).map(([k, v]) => [
        this.visit(k, schema.map.key),
        this.visit(
          v,
          schema.map.value,
          this.isVecSchema(schema.map.value)
            ? { typedArrayType: this.getVecElementType(schema.map.value) }
            : undefined,
        ),
      ]),
    )
  }

  /**
   * Visit an enum schema and transform its variant value
   */
  private visitEnum(
    value: unknown,
    schema: { enum: Array<{ struct: Record<string, Schema> }> },
  ): unknown {
    if (typeof value !== "object" || value === null) return value

    const [variantName, variantValue] = Object.entries(value)[0] ?? []
    if (!variantName) return value

    const variantStruct = schema.enum.find((v) => variantName in v.struct)
    if (!variantStruct) return value

    const variantSchema = variantStruct.struct[variantName]
    return {
      [variantName]: this.visit(
        variantValue,
        variantSchema,
        this.isVecSchema(variantSchema)
          ? { typedArrayType: this.getVecElementType(variantSchema) }
          : undefined,
      ),
    }
  }

  /**
   * Check if a schema represents a Vec type
   */
  private isVecSchema(schema: Schema): boolean {
    return (
      typeof schema === "object" &&
      "array" in schema &&
      !("len" in schema.array) &&
      typeof schema.array.type === "string"
    )
  }

  /**
   * Get the element type of a Vec schema
   */
  private getVecElementType(schema: Schema): TypedArrayType | undefined {
    if (!this.isVecSchema(schema)) return undefined
    return (schema as ArrayType).array.type as TypedArrayType
  }
}
