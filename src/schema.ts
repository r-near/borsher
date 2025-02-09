import { type Schema, deserialize, serialize } from 'borsh';

type SchemaType<T> = T extends BorshSchema<infer U> ? U : unknown;

export class BorshSchema<T> {
  private constructor(private schema: Schema) {}

  static readonly String = new BorshSchema<string>('string');
  static readonly u8 = new BorshSchema<number>('u8');
  static readonly u16 = new BorshSchema<number>('u16');
  static readonly u32 = new BorshSchema<number>('u32');
  static readonly u64 = new BorshSchema<bigint>('u64');
  static readonly u128 = new BorshSchema<bigint>('u128');
  static readonly i8 = new BorshSchema<number>('i8');
  static readonly i16 = new BorshSchema<number>('i16');
  static readonly i32 = new BorshSchema<number>('i32');
  static readonly i64 = new BorshSchema<bigint>('i64');
  static readonly i128 = new BorshSchema<bigint>('i128');
  static readonly f32 = new BorshSchema<number>('f32');
  static readonly f64 = new BorshSchema<number>('f64');
  static readonly bool = new BorshSchema<boolean>('bool');
  static readonly Unit = new BorshSchema<Unit>({ struct: {} });

  static Option<T extends BorshSchema<unknown>>(inner: T): BorshSchema<SchemaType<T> | null> {
    return new BorshSchema({ option: inner.schema });
  }

  static Array<T extends BorshSchema<unknown>>(
    inner: T,
    length: number,
  ): BorshSchema<SchemaType<T>[]> {
    return new BorshSchema({ array: { type: inner.schema, len: length } });
  }

  static Vec<T extends BorshSchema<unknown>>(
    inner: T,
  ): T extends typeof BorshSchema.u8 ? BorshSchema<Uint8Array> : BorshSchema<SchemaType<T>[]>;
  static Vec<T extends BorshSchema<unknown>>(inner: T) {
    if (inner === BorshSchema.u8) {
      return new BorshSchema<Uint8Array>({ array: { type: 'u8' } });
    }
    return new BorshSchema({ array: { type: inner.schema } });
  }

  static HashSet<T extends BorshSchema<unknown>>(inner: T): BorshSchema<Set<SchemaType<T>>> {
    return new BorshSchema({ set: inner.schema });
  }

  static HashMap<K extends BorshSchema<unknown>, V extends BorshSchema<unknown>>(
    key: K,
    value: V,
  ): BorshSchema<Map<SchemaType<K>, SchemaType<V>>> {
    return new BorshSchema({ map: { key: key.schema, value: value.schema } });
  }

  static Struct<T extends Record<string, BorshSchema<unknown>>>(
    fields: T,
  ): BorshSchema<{ [K in keyof T]: SchemaType<T[K]> }> {
    return new BorshSchema({
      struct: Object.fromEntries(
        Object.entries(fields).map(([key, schema]) => [key, schema.schema]),
      ),
    });
  }

  static Enum<T extends Record<string, BorshSchema<unknown>>>(
    variants: T,
  ): BorshSchema<EnumInput<T>> {
    return new BorshSchema({
      enum: Object.entries(variants).map(([variantName, schema]) => ({
        struct: { [variantName]: schema.schema },
      })),
    });
  }

  serialize(value: T): Buffer {
    return Buffer.from(serialize(this.schema, value));
  }

  deserialize(buffer: Uint8Array): T {
    return deserialize(this.schema, buffer) as T;
  }
}

export type StructInput<T extends Record<string, BorshSchema<unknown>>> = {
  [K in keyof T]: SchemaType<T[K]>;
};

export type EnumInput<T extends Record<string, BorshSchema<unknown>>> = {
  [K in keyof T]: {
    [KK in K]: SchemaType<T[K]>;
  };
}[keyof T];

export type TypeOf<T extends BorshSchema<unknown>> = SchemaType<T>;

export type Unit = Record<string, never>;
export type StructFields = Record<string, BorshSchema<unknown>>;
export type EnumVariants = Record<string, BorshSchema<unknown>>;
export type { TypeOf as infer };
