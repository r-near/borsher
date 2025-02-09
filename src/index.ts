import type { Buffer } from 'buffer';
import type { BorshSchema, TypeOf } from './schema';

export function borshSerialize<T extends BorshSchema<unknown>>(
  schema: T,
  value: TypeOf<T>,
): Buffer {
  return schema.serialize(value);
}

export function borshDeserialize<T extends BorshSchema<unknown>>(
  schema: T,
  buffer: Uint8Array,
): TypeOf<T> {
  return schema.deserialize(buffer) as TypeOf<T>;
}

export { BorshSchema, EnumVariants, StructFields, Unit, infer } from './schema';
