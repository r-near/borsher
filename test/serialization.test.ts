import { describe, test, expect } from 'vitest';
import { b, BorshSchema } from '../src';

describe('primitive types', () => {
  test('string serialization', () => {
    const schema = b.string();
    const value = 'hello world';
    const buffer = schema.serialize(value);

    // Snapshot the binary data
    expect(buffer).toMatchSnapshot();

    // Also verify deserialization works
    const decoded = schema.deserialize(buffer);
    expect(decoded).toBe(value);
  });

  test('numbers', () => {
    interface TestCase<T> {
      schema: BorshSchema<T>;
      value: T;
    }

    const testCases: TestCase<number | bigint>[] = [
      { schema: b.u8(), value: 255 },
      { schema: b.u16(), value: 65535 },
      { schema: b.u32(), value: 4294967295 },
      { schema: b.u64(), value: 18446744073709551615n },
      { schema: b.i8(), value: -128 },
      { schema: b.i16(), value: -32768 },
      { schema: b.i32(), value: -2147483648 },
      { schema: b.i64(), value: -9223372036854775808n },
    ];

    for (const { schema, value } of testCases) {
      const buffer = schema.serialize(value);
      expect(buffer).toMatchSnapshot();
      expect(schema.deserialize(buffer)).toEqual(value);
    }
  });

  test('bool', () => {
    const schema = b.bool();

    const trueBuffer = schema.serialize(true);
    const falseBuffer = schema.serialize(false);

    expect(trueBuffer).toMatchSnapshot('true serialization');
    expect(falseBuffer).toMatchSnapshot('false serialization');

    expect(schema.deserialize(trueBuffer)).toBe(true);
    expect(schema.deserialize(falseBuffer)).toBe(false);
  });
});

describe('complex types', () => {
  test('Option', () => {
    const schema = b.Option(b.string());

    const someBuffer = schema.serialize('hello');
    const noneBuffer = schema.serialize(null);

    expect(someBuffer).toMatchSnapshot('Some value');
    expect(noneBuffer).toMatchSnapshot('None value');

    expect(schema.deserialize(someBuffer)).toBe('hello');
    expect(schema.deserialize(noneBuffer)).toBe(null);
  });

  test('Vec', () => {
    const schema = b.Vec(b.u8());
    const value = [1, 2, 3, 4, 5];

    const buffer = schema.serialize(value);
    expect(buffer).toMatchSnapshot();
    expect(schema.deserialize(buffer)).toEqual(value);
  });

  test('HashMap', () => {
    const schema = b.HashMap(b.string(), b.u32());
    const value = new Map([
      ['alice', 100],
      ['bob', 200],
    ]);

    const buffer = schema.serialize(value);
    expect(buffer).toMatchSnapshot();
    expect(schema.deserialize(buffer)).toEqual(value);
  });

  test('Struct', () => {
    const schema = b.Struct({
      name: b.string(),
      age: b.u8(),
      scores: b.Vec(b.u16()),
    });

    const value = {
      name: 'alice',
      age: 25,
      scores: [100, 95, 98],
    };

    const buffer = schema.serialize(value);
    expect(buffer).toMatchSnapshot();
    expect(schema.deserialize(buffer)).toEqual(value);
  });

  test('Enum', () => {
    const schema = b.Enum({
      Success: b.Struct({
        value: b.string(),
      }),
      Error: b.string(),
    });

    const successValue = { Success: { value: 'it worked!' } };
    const errorValue = { Error: 'something went wrong' };

    const successBuffer = schema.serialize(successValue);
    const errorBuffer = schema.serialize(errorValue);

    expect(successBuffer).toMatchSnapshot('Success variant');
    expect(errorBuffer).toMatchSnapshot('Error variant');

    expect(schema.deserialize(successBuffer)).toEqual(successValue);
    expect(schema.deserialize(errorBuffer)).toEqual(errorValue);
  });
});

describe('error cases', () => {
  test('invalid enum variant', () => {
    const schema = b.Enum({
      A: b.unit(),
      B: b.unit(),
    });

    // @ts-expect-error - Testing runtime error for invalid variant
    expect(() => schema.serialize({ C: null })).toThrow();
  });

  test('missing struct fields', () => {
    const schema = b.Struct({
      name: b.string(),
      age: b.u8(),
    });

    // @ts-expect-error - Testing runtime error for missing field
    expect(() => schema.serialize({ name: 'alice' })).toThrow();
  });
});

describe('complex nested structures', () => {
  test('game state example', () => {
    const schema = b.Struct({
      players: b.Vec(
        b.Struct({
          id: b.string(),
          score: b.u32(),
          inventory: b.HashMap(b.string(), b.u16()),
        }),
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

    const value = {
      players: [
        {
          id: 'player1',
          score: 100,
          inventory: new Map([
            ['sword', 1],
            ['potion', 5],
          ]),
        },
      ],
      status: {
        Playing: {},
      },
    };

    const buffer = schema.serialize(value);
    expect(buffer).toMatchSnapshot();
    expect(schema.deserialize(buffer)).toEqual(value);
  });
});

describe('serialization compatibility', () => {
  test('classic BorshSchema syntax produces same bytes', () => {
    const newSchema = b.Struct({
      name: b.string(),
      age: b.u8(),
    });

    const classicSchema = BorshSchema.Struct({
      name: BorshSchema.String,
      age: BorshSchema.u8,
    });

    const value = {
      name: 'alice',
      age: 25,
    };

    const newBuffer = newSchema.serialize(value);
    const classicBuffer = classicSchema.serialize(value);

    expect(newBuffer).toEqual(classicBuffer);
  });
});

describe('async iteration', () => {
  test('async iteration', async () => {
    const arr = [1, 2, 3];
    // arr.forEach(async (i) => {
    //   await new Promise(resolve => setTimeout(resolve, 10));
    //   console.log(i);
    // });
    for (const i of arr) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      console.log(i);
    }
  });
});
