import { describe, expect, test } from 'bun:test'
import { ReadModelStoreInMemory } from '../../../src/adapter/read-model-store-in-memory'
import { zeroId } from '../../../src/command/helpers/aggregate-id'
import { createPrefetchReadModel } from '../../../src/event/fn/prefetch-read-model'
import type { ProjectionMap } from '../../../src/types/event'
import type { CounterEvent } from '../../fixtures/counter-app/features/counter/types'
import type {
  AchievementReadModel,
  CounterReadModel
} from '../../fixtures/counter-app/shared/readmodel'

describe('[event] prefetch-read-model', () => {
  describe('createPrefetchReadModel', () => {
    test('returns error when event is invalid', async () => {
      // Arrange
      const store = new ReadModelStoreInMemory()

      const projectionMap = {
        created: [{ readModel: 'counter' }],
        incremented: [],
        decremented: []
      } satisfies ProjectionMap<CounterEvent, CounterReadModel>

      const prefetchFn = createPrefetchReadModel(projectionMap)(store)

      // Act
      const result = await prefetchFn(null as any)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_EVENT')
      }
    })

    test('returns error when database findById fails', async () => {
      // Arrange
      const store = new ReadModelStoreInMemory()
      store.findById = async () => {
        throw new Error('Database error')
      }

      const projectionMap = {
        created: [{ readModel: 'counter' }],
        incremented: [],
        decremented: []
      } satisfies ProjectionMap<CounterEvent, CounterReadModel>

      const prefetchFn = createPrefetchReadModel(projectionMap)(store)
      const event: CounterEvent = {
        type: 'created',
        id: zeroId('counter'),
        payload: { count: 0 }
      }

      // Act
      const result = await prefetchFn(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('READ_MODEL_FETCH_FAILED')
      }
    })

    test('returns empty dict when event type not in projection map', async () => {
      // Arrange
      const store = new ReadModelStoreInMemory()

      const projectionMap = {
        created: [{ readModel: 'counter' }],
        incremented: [],
        decremented: []
      } satisfies ProjectionMap<CounterEvent, CounterReadModel>

      const prefetchFn = createPrefetchReadModel(projectionMap)(store)
      const event: CounterEvent = {
        type: 'incremented',
        id: zeroId('counter')
      }

      // Act
      const result = await prefetchFn(event)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(Object.keys(result.value)).toHaveLength(0)
      }
    })

    test('returns error when model with invalid type not found', async () => {
      // Arrange
      const store = new ReadModelStoreInMemory()

      const projectionMap = {
        created: [{ readModel: 'invalid_type' as any }],
        incremented: [],
        decremented: []
      } satisfies ProjectionMap<CounterEvent, CounterReadModel>

      const prefetchFn = createPrefetchReadModel(projectionMap)(store)
      const event: CounterEvent = {
        type: 'created',
        id: zeroId('counter'),
        payload: { count: 0 }
      }

      // Act
      const result = await prefetchFn(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('READ_MODEL_NOT_FOUND')
      }
    })

    test('fetches model by id when no where clause specified', async () => {
      // Arrange
      const id = zeroId('counter')

      const store = new ReadModelStoreInMemory()
      const existingModel: CounterReadModel = {
        type: 'counter',
        id: id.value,
        count: 5
      }
      await store.save(existingModel)

      const projectionMap = {
        created: [{ readModel: 'counter' }],
        incremented: [],
        decremented: []
      } satisfies ProjectionMap<CounterEvent, CounterReadModel>

      const prefetchFn = createPrefetchReadModel(projectionMap)(store)
      const event: CounterEvent = {
        type: 'created',
        id,
        payload: { count: 0 }
      }

      // Act
      const result = await prefetchFn(event)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(Object.keys(result.value)).toHaveLength(1)
        expect(result.value[`counter${id.value}`]).toEqual(existingModel)
      }
    })

    test('returns error when model not found by id', async () => {
      // Arrange
      const store = new ReadModelStoreInMemory()

      const projectionMap = {
        created: [{ readModel: 'counter' }],
        incremented: [],
        decremented: []
      } satisfies ProjectionMap<CounterEvent, CounterReadModel>

      const prefetchFn = createPrefetchReadModel(projectionMap)(store)
      const event: CounterEvent = {
        type: 'created',
        id: zeroId('counter'),
        payload: { count: 0 }
      }

      // Act
      const result = await prefetchFn(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('READ_MODEL_NOT_FOUND')
      }
    })

    test('fetches models using where clause', async () => {
      // Arrange
      const store = new ReadModelStoreInMemory()
      const model1: CounterReadModel = {
        type: 'counter',
        id: '123',
        count: 5
      }
      const model2: CounterReadModel = {
        type: 'counter',
        id: '456',
        count: 5
      }
      await store.save(model1)
      await store.save(model2)

      const projectionMap: ProjectionMap<CounterEvent, CounterReadModel> = {
        created: [
          {
            readModel: 'counter',
            where: (_: CounterEvent) => ({ by: 'count', operator: 'eq', value: 5 })
          }
        ],
        incremented: [],
        decremented: []
      }

      const prefetchFn = createPrefetchReadModel(projectionMap)(store)
      const event: CounterEvent = {
        type: 'created',
        id: zeroId('counter'),
        payload: { count: 0 }
      }

      // Act
      const result = await prefetchFn(event)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(Object.keys(result.value)).toHaveLength(2)
        expect(result.value['counter123']).toEqual(model1)
        expect(result.value['counter456']).toEqual(model2)
      }
    })

    test('fetches multiple models with different readModel types', async () => {
      // Arrange
      const id = zeroId('counter')
      const store = new ReadModelStoreInMemory()
      const counterModel: CounterReadModel = {
        type: 'counter',
        id: id.value,
        count: 5
      }
      await store.save(counterModel)
      const achievementModel: AchievementReadModel = {
        type: 'achievement',
        id: '1',
        counterId: id.value,
        level: 1,
        achievedAt: new Date()
      }
      await store.save(achievementModel)

      const projectionMap: ProjectionMap<CounterEvent, CounterReadModel | AchievementReadModel> = {
        created: [
          { readModel: 'counter' },
          {
            readModel: 'achievement',
            where: (e: CounterEvent) => ({
              by: 'id',
              operator: 'eq',
              value: e.id.value
            })
          }
        ],
        incremented: [],
        decremented: []
      }
      const prefetchFn = createPrefetchReadModel(projectionMap)(store)
      const event: CounterEvent = {
        type: 'created',
        id,
        payload: { count: 0 }
      }

      // Act
      const result = await prefetchFn(event)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(Object.keys(result.value)).toHaveLength(1)
        expect(result.value[`counter${id.value}`]).toEqual(counterModel)
      }
    })

    test('returns error when where clause finds no models', async () => {
      // Arrange
      const store = new ReadModelStoreInMemory()

      const projectionMap: ProjectionMap<CounterEvent, CounterReadModel> = {
        created: [
          {
            readModel: 'counter',
            where: (_: CounterEvent) => ({ by: 'count', operator: 'eq', value: 5 })
          }
        ],
        incremented: [],
        decremented: []
      }

      const prefetchFn = createPrefetchReadModel(projectionMap)(store)
      const event: CounterEvent = {
        type: 'created',
        id: zeroId('counter'),
        payload: { count: 0 }
      }

      // Act
      const result = await prefetchFn(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('READ_MODEL_NOT_FOUND')
      }
    })

    test('returns error when database findMany fails', async () => {
      // Arrange
      const store = new ReadModelStoreInMemory()
      store.findMany = async () => {
        throw new Error('Database findMany error')
      }

      const projectionMap: ProjectionMap<CounterEvent, AchievementReadModel> = {
        created: [
          {
            readModel: 'achievement',
            where: (_: CounterEvent) => ({ by: 'id', operator: 'eq', value: '1' })
          }
        ],
        incremented: [],
        decremented: []
      } satisfies ProjectionMap<CounterEvent, AchievementReadModel>

      const prefetchFn = createPrefetchReadModel(projectionMap)(store)
      const event: CounterEvent = {
        type: 'created',
        id: zeroId('counter'),
        payload: { count: 0 }
      }

      // Act
      const result = await prefetchFn(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('READ_MODEL_FETCH_FAILED')
      }
    })

    test('returns not found error when projection map is not empty and event id is invalid', async () => {
      // Arrange
      const store = new ReadModelStoreInMemory()

      const projectionMap: ProjectionMap<CounterEvent, AchievementReadModel> = {
        created: [
          {
            readModel: 'achievement',
            where: (event: CounterEvent) => ({
              by: 'counterId',
              operator: 'eq',
              value: event.id.value
            })
          }
        ],
        incremented: [],
        decremented: []
      }

      const prefetchFn = createPrefetchReadModel(projectionMap)(store)
      const event: CounterEvent = {
        type: 'created',
        id: { type: 'counter', value: '00000000-0000-0000-0000-000000000000' },
        payload: { count: 0 }
      }

      // Act
      const result = await prefetchFn(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('READ_MODEL_NOT_FOUND')
      }
    })
  })

  test('returns empty dict when projection map is empty', async () => {
    // Arrange
    const store = new ReadModelStoreInMemory()

    const projectionMap: ProjectionMap<CounterEvent, AchievementReadModel> = {
      created: [],
      incremented: [],
      decremented: []
    }

    const prefetchFn = createPrefetchReadModel(projectionMap)(store)
    const event: CounterEvent = {
      type: 'created',
      id: { type: 'counter', value: '00000000-0000-0000-0000-000000000000' },
      payload: { count: 0 }
    }

    // Act
    const result = await prefetchFn(event)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(Object.keys(result.value)).toHaveLength(0)
    }
  })

  test('skips invalid fetch configurations in projection map', async () => {
    // Arange
    const store = new ReadModelStoreInMemory()
    const projectionMap = {
      created: [
        null, // invalid
        {} as any, // invalid
        { readModel: null } as any // invalid
      ]
    } as unknown as ProjectionMap<CounterEvent, CounterReadModel> satisfies ProjectionMap<
      CounterEvent,
      CounterReadModel
    >

    const prefetchFn = createPrefetchReadModel(projectionMap)(store)
    const event: CounterEvent = {
      type: 'created',
      id: zeroId('counter'),
      payload: { count: 0 }
    }

    // Act
    const result = await prefetchFn(event)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(Object.keys(result.value)).toHaveLength(0)
    }
  })

  test('converts Partial<ReadModel> returned by where into eq filter', async () => {
    // Arange
    const store = new ReadModelStoreInMemory()
    const model: CounterReadModel = { type: 'counter', id: 'abc', count: 10 }
    await store.save(model)

    const projectionMap = {
      created: [
        {
          readModel: 'counter',
          where: (_: CounterEvent) => ({ count: 10 })
        }
      ]
    } as unknown as ProjectionMap<CounterEvent, CounterReadModel> satisfies ProjectionMap<
      CounterEvent,
      CounterReadModel
    >

    const prefetchFn = createPrefetchReadModel(projectionMap)(store)
    const event: CounterEvent = { type: 'created', id: zeroId('counter'), payload: { count: 0 } }

    // Act
    const result = await prefetchFn(event)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(Object.keys(result.value)).toHaveLength(1)
      expect(result.value['counterabc']).toEqual(model)
    }
  })

  test('prevents overwriting read models with duplicate keys', async () => {
    // Arange
    const store = new ReadModelStoreInMemory()
    const model1: CounterReadModel = { type: 'counter', id: '1', count: 1 }
    const model2: CounterReadModel = { type: 'counter', id: '1', count: 2 } // same id
    await store.save(model1)
    await store.save(model2)

    const projectionMap = {
      created: [
        { readModel: 'counter', where: () => ({ by: 'count', operator: 'eq', value: 1 }) },
        { readModel: 'counter', where: () => ({ by: 'count', operator: 'eq', value: 2 }) }
      ]
    } as unknown as ProjectionMap<CounterEvent, CounterReadModel> satisfies ProjectionMap<
      CounterEvent,
      CounterReadModel
    >

    const prefetchFn = createPrefetchReadModel(projectionMap)(store)
    const event: CounterEvent = { type: 'created', id: zeroId('counter'), payload: { count: 0 } }

    // Act
    const result = await prefetchFn(event)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(Object.keys(result.value)).toHaveLength(1)
      expect(result.value['counter1']).toEqual(model2)
    }
  })
})
