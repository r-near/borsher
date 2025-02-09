import type { Buffer } from 'buffer';
import type { BorshSchema, InferInput, InferOutput } from './schema';

/**
 * Serializes a value using a given Borsh schema.
 *
 * @param schema The Borsh schema to use for serialization.
 * @param value The value to serialize.
 * @returns A Buffer containing the serialized data.
 *
 * @example
 * const schema = BorshSchema.String;
 * const value = "hello world";
 * const buffer = borshSerialize(schema, value);
 */
export function borshSerialize<T extends BorshSchema<unknown, unknown>>(
  schema: T,
  value: InferInput<T>,
): Buffer {
  return schema.serialize(value);
}

/**
 * Deserializes a value from a given Borsh schema and a buffer.
 *
 * @param schema The Borsh schema to use for deserialization.
 * @param buffer The Uint8Array (or Buffer) containing the serialized data.
 * @returns The deserialized value.
 *
 * @example
 * const schema = BorshSchema.String;
 * const buffer = new Uint8Array([...]); // Your serialized data
 * const value = borshDeserialize(schema, buffer); // value will be "hello world"
 */
export function borshDeserialize<T extends BorshSchema<unknown, unknown>>(
  schema: T,
  buffer: Uint8Array,
): InferOutput<T> {
  return schema.deserialize(buffer) as InferOutput<T>;
}

export { BorshSchema, EnumVariants, StructFields, Unit } from './schema';
