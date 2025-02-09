import { assert, describe, expect, test } from "vitest"
import { BorshSchema } from "../src/schema"

describe("Vec type serialization", () => {
  // Helper function to test serialization roundtrip
  function testRoundtrip<T>(schema: BorshSchema<T>, value: T): void {
    const serialized = schema.serialize(value)
    const deserialized = schema.deserialize(serialized)
    expect(deserialized).toEqual(value)
  }

  // Helper to create test arrays with values
  function createTypedArray<T extends TypedArray>(
    ArrayConstructor: new (length: number) => T,
    values: number[],
  ): T {
    const arr = new ArrayConstructor(values.length)
    for (let i = 0; i < values.length; i++) {
      arr[i] = values[i]
    }
    return arr
  }

  describe("Uint8Array", () => {
    const schema = BorshSchema.Vec(BorshSchema.u8)
    const values = [0, 127, 255]

    test("type inference", () => {
      // @ts-expect-error - Should not accept regular array
      schema.serialize([1, 2, 3])
      // Should accept Uint8Array
      schema.serialize(new Uint8Array([1, 2, 3]))
    })

    test("serialization roundtrip", () => {
      const arr = createTypedArray(Uint8Array, values)
      testRoundtrip(schema, arr)
    })
  })

  describe("Uint16Array", () => {
    const schema = BorshSchema.Vec(BorshSchema.u16)
    const values = [0, 32767, 65535]

    test("type inference", () => {
      // @ts-expect-error - Should not accept regular array
      schema.serialize([1, 2, 3])
      // Should accept Uint16Array
      schema.serialize(new Uint16Array([1, 2, 3]))
    })

    test("serialization roundtrip", () => {
      const arr = createTypedArray(Uint16Array, values)
      testRoundtrip(schema, arr)
    })
  })

  describe("Int8Array", () => {
    const schema = BorshSchema.Vec(BorshSchema.i8)
    const values = [-128, 0, 127]

    test("type inference", () => {
      // @ts-expect-error - Should not accept regular array
      schema.serialize([1, 2, 3])
      // Should accept Int8Array
      schema.serialize(new Int8Array([1, 2, 3]))
    })

    test("serialization roundtrip", () => {
      const arr = createTypedArray(Int8Array, values)
      testRoundtrip(schema, arr)
    })
  })

  describe("Int16Array", () => {
    const schema = BorshSchema.Vec(BorshSchema.i16)
    const values = [-32768, 0, 32767]

    test("type inference", () => {
      // @ts-expect-error - Should not accept regular array
      schema.serialize([1, 2, 3])
      // Should accept Int16Array
      schema.serialize(new Int16Array([1, 2, 3]))
    })

    test("serialization roundtrip", () => {
      const arr = createTypedArray(Int16Array, values)
      testRoundtrip(schema, arr)
    })
  })

  describe("Float32Array", () => {
    const schema = BorshSchema.Vec(BorshSchema.f32)
    const values = [-3.14, 0, 3.14]

    test("type inference", () => {
      // @ts-expect-error - Should not accept regular array
      schema.serialize([1, 2, 3])
      // Should accept Float32Array
      schema.serialize(new Float32Array([1, 2, 3]))
    })

    test("serialization roundtrip", () => {
      const arr = createTypedArray(Float32Array, values)
      testRoundtrip(schema, arr)
    })
  })

  describe("Float64Array", () => {
    const schema = BorshSchema.Vec(BorshSchema.f64)
    const values = [-Math.PI, 0, Math.PI]

    test("type inference", () => {
      // @ts-expect-error - Should not accept regular array
      schema.serialize([1, 2, 3])
      // Should accept Float64Array
      schema.serialize(new Float64Array([1, 2, 3]))
    })

    test("serialization roundtrip", () => {
      const arr = createTypedArray(Float64Array, values)
      testRoundtrip(schema, arr)
    })
  })

  describe("Regular arrays", () => {
    const schema = BorshSchema.Vec(BorshSchema.String)
    const values = ["hello", "world"]

    test("type inference", () => {
      expect(() => {
        // @ts-expect-error - Should not accept typed arrays
        schema.serialize(new Uint8Array([1, 2, 3]))
      }).toThrow()
      // Should accept string array
      schema.serialize(["hello", "world"])
    })

    test("serialization roundtrip", () => {
      testRoundtrip(schema, values)
    })
  })

  describe("Nested typed arrays", () => {
    test("struct with typed array field", () => {
      const schema = BorshSchema.Struct({
        name: BorshSchema.String,
        scores: BorshSchema.Vec(BorshSchema.u16),
      })

      const value = {
        name: "Alice",
        scores: createTypedArray(Uint16Array, [90, 95, 100]),
      }

      testRoundtrip(schema, value)

      // Verify the deserialized value has the correct type
      const deserialized = schema.deserialize(schema.serialize(value))
      expect(deserialized.scores).toBeInstanceOf(Uint16Array)
    })

    test("deeply nested typed arrays", () => {
      const schema = BorshSchema.Struct({
        outer: BorshSchema.Struct({
          inner: BorshSchema.Struct({
            data: BorshSchema.Vec(BorshSchema.i32),
          }),
        }),
      })

      const value = {
        outer: {
          inner: {
            data: createTypedArray(Int32Array, [-1000000, 0, 1000000]),
          },
        },
      }

      testRoundtrip(schema, value)

      // Verify the deeply nested array is correctly typed
      const deserialized = schema.deserialize(schema.serialize(value))
      expect(deserialized.outer.inner.data).toBeInstanceOf(Int32Array)
    })

    test("map with typed array values", () => {
      const schema = BorshSchema.HashMap(BorshSchema.String, BorshSchema.Vec(BorshSchema.f32))

      const value = new Map([
        ["measurements1", createTypedArray(Float32Array, [1.1, 2.2, 3.3])],
        ["measurements2", createTypedArray(Float32Array, [4.4, 5.5, 6.6])],
      ])

      testRoundtrip(schema, value)

      // Verify map values are typed arrays
      const deserialized = schema.deserialize(schema.serialize(value))
      for (const [, arr] of deserialized) {
        expect(arr).toBeInstanceOf(Float32Array)
      }
    })

    test("enum variant with typed array", () => {
      const schema = BorshSchema.Enum({
        Data: BorshSchema.Vec(BorshSchema.u8),
        Empty: BorshSchema.Unit,
      })

      const dataValue = { Data: createTypedArray(Uint8Array, [1, 2, 3]) }
      const emptyValue = { Empty: {} }

      testRoundtrip(schema, dataValue)
      testRoundtrip(schema, emptyValue)

      // Verify the Data variant contains a typed array
      const deserialized = schema.deserialize(schema.serialize(dataValue))
      console.log(deserialized)
      if ("Data" in deserialized) {
        expect(deserialized.Data).toBeInstanceOf(Uint8Array)
      } else {
        assert.fail("Expected Data variant")
      }
    })

    test("array of structs containing typed arrays", () => {
      const playerSchema = BorshSchema.Struct({
        name: BorshSchema.String,
        position: BorshSchema.Vec(BorshSchema.f32), // x,y,z coordinates
      })
      const schema = BorshSchema.Array(playerSchema, 2)

      const value = [
        {
          name: "Player1",
          position: createTypedArray(Float32Array, [1.0, 2.0, 3.0]),
        },
        {
          name: "Player2",
          position: createTypedArray(Float32Array, [4.0, 5.0, 6.0]),
        },
      ]

      testRoundtrip(schema, value)

      // Verify each struct in the array has a typed array
      const deserialized = schema.deserialize(schema.serialize(value))
      for (const player of deserialized) {
        expect(player.position).toBeInstanceOf(Float32Array)
      }
    })

    test("complex nested structure with multiple typed arrays", () => {
      // Define a complex game state schema with deeply nested typed arrays
      const playerStatsSchema = BorshSchema.Struct({
        health: BorshSchema.u8,
        position: BorshSchema.Vec(BorshSchema.f32), // x,y,z coordinates
        velocity: BorshSchema.Vec(BorshSchema.f32), // velocity vector
      })

      const inventoryItemSchema = BorshSchema.Enum({
        Weapon: BorshSchema.Struct({
          damage: BorshSchema.u16,
          effects: BorshSchema.Vec(BorshSchema.i8), // status effect IDs
        }),
        Armor: BorshSchema.Struct({
          defense: BorshSchema.u16,
          resistances: BorshSchema.Vec(BorshSchema.u8), // resistance values
        }),
      })

      const gameStateSchema = BorshSchema.Struct({
        players: BorshSchema.HashMap(
          BorshSchema.String, // player ID
          BorshSchema.Struct({
            stats: playerStatsSchema,
            inventory: BorshSchema.Array(inventoryItemSchema, 3),
            achievements: BorshSchema.Struct({
              scores: BorshSchema.Vec(BorshSchema.u32),
              timestamps: BorshSchema.Vec(BorshSchema.i64),
              badges: BorshSchema.HashMap(
                BorshSchema.String,
                BorshSchema.Vec(BorshSchema.u8), // badge data
              ),
            }),
          }),
        ),
        worldData: BorshSchema.Struct({
          chunks: BorshSchema.HashMap(
            BorshSchema.String, // chunk coordinates
            BorshSchema.Vec(BorshSchema.i16), // terrain height map
          ),
          entities: BorshSchema.Vec(BorshSchema.u32), // entity IDs
        }),
      })

      // Create a complex test value
      const testValue = {
        players: new Map([
          [
            "player1",
            {
              stats: {
                health: 100,
                position: createTypedArray(Float32Array, [1.5, 2.5, 3.5]),
                velocity: createTypedArray(Float32Array, [0.1, 0.2, -0.3]),
              },
              inventory: [
                { Weapon: { damage: 50, effects: createTypedArray(Int8Array, [1, -2, 3]) } },
                { Armor: { defense: 30, resistances: createTypedArray(Uint8Array, [5, 10, 15]) } },
                { Weapon: { damage: 75, effects: createTypedArray(Int8Array, [-1, 2, -3]) } },
              ],
              achievements: {
                scores: createTypedArray(Uint32Array, [1000, 2000, 3000]),
                timestamps: BigInt64Array.from([1000n, 2000n, 3000n]),
                badges: new Map([
                  ["gold", createTypedArray(Uint8Array, [1, 2, 3])],
                  ["silver", createTypedArray(Uint8Array, [4, 5, 6])],
                ]),
              },
            },
          ],
        ]),
        worldData: {
          chunks: new Map([
            ["0,0", createTypedArray(Int16Array, [100, 200, 300])],
            ["0,1", createTypedArray(Int16Array, [150, 250, 350])],
          ]),
          entities: createTypedArray(Uint32Array, [1, 2, 3, 4, 5]),
        },
      }

      // Test serialization roundtrip
      testRoundtrip(gameStateSchema, testValue)

      // Verify all typed arrays in the deserialized data
      const deserialized = gameStateSchema.deserialize(gameStateSchema.serialize(testValue))

      // Check player data
      const player = deserialized.players.get("player1")
      if (!player) {
        assert.fail("Expected player1 data")
        return
      }
      if (player === undefined) assert.fail("Expected player1 data")

      expect(player.stats.position).toBeInstanceOf(Float32Array)
      expect(player.stats.velocity).toBeInstanceOf(Float32Array)

      // Check inventory items
      const [weapon1, armor, weapon2] = player.inventory
      if ("Weapon" in weapon1) {
        expect(weapon1.Weapon.effects).toBeInstanceOf(Int8Array)
      } else {
        assert.fail("Expected Weapon variant")
      }
      if ("Armor" in armor) {
        expect(armor.Armor.resistances).toBeInstanceOf(Uint8Array)
      } else {
        assert.fail("Expected Armor variant")
      }
      if ("Weapon" in weapon2) {
        expect(weapon2.Weapon.effects).toBeInstanceOf(Int8Array)
      } else {
        assert.fail("Expected Weapon variant")
      }

      // Check achievements
      expect(player.achievements.scores).toBeInstanceOf(Uint32Array)
      expect(player.achievements.timestamps).toBeInstanceOf(BigInt64Array)
      for (const [, badgeData] of player.achievements.badges) {
        expect(badgeData).toBeInstanceOf(Uint8Array)
      }

      // Check world data
      for (const [, heightMap] of deserialized.worldData.chunks) {
        expect(heightMap).toBeInstanceOf(Int16Array)
      }
      expect(deserialized.worldData.entities).toBeInstanceOf(Uint32Array)
    })
  })
})

// Helper type for TypeScript
type TypedArray =
  | Uint8Array
  | Uint16Array
  | Uint32Array
  | Int8Array
  | Int16Array
  | Int32Array
  | Float32Array
  | Float64Array
