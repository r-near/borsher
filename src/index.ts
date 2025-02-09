import type { Buffer } from 'buffer';
import { BorshSchema, type TypeOf } from './schema';

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

// Create a namespace (like Zod's 'z')
export namespace b {
  export type infer<T> = T extends BorshSchema<infer U> ? U : never;

  // Primitive types (lowercase with function calls)
  export const string = () => BorshSchema.String;
  export const u8 = () => BorshSchema.u8;
  export const u16 = () => BorshSchema.u16;
  export const u32 = () => BorshSchema.u32;
  export const u64 = () => BorshSchema.u64;
  export const u128 = () => BorshSchema.u128;
  export const i8 = () => BorshSchema.i8;
  export const i16 = () => BorshSchema.i16;
  export const i32 = () => BorshSchema.i32;
  export const i64 = () => BorshSchema.i64;
  export const i128 = () => BorshSchema.i128;
  export const f32 = () => BorshSchema.f32;
  export const f64 = () => BorshSchema.f64;
  export const bool = () => BorshSchema.bool;
  export const unit = () => BorshSchema.Unit;

  // Complex types (uppercase, direct references)
  export const Option = BorshSchema.Option;
  // biome-ignore lint/suspicious/noShadowRestrictedNames: <explanation>
  export const Array = BorshSchema.Array;
  export const Vec = BorshSchema.Vec;
  export const HashSet = BorshSchema.HashSet;
  export const HashMap = BorshSchema.HashMap;
  export const Struct = BorshSchema.Struct;
  export const Enum = BorshSchema.Enum;
}

export { BorshSchema, Unit } from './schema';
