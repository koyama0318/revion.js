import { describe, expect, test } from 'bun:test'
import { zeroId } from '../../../src/command/helpers/aggregate-id'
import { mapProjectionToFn } from '../../../src/event/mapper/map-to-projection-fn'
import type { AggregateId, ReadModel } from '../../../src/types/core'
import type { Projection, ProjectionMap, ProjectionParams } from '../../../src/types/event'

type TestEvent =
  | { type: 'created'; id: AggregateId<'test'>; payload: { name: string } }
  | { type: 'updated'; id: AggregateId<'test'>; payload: { name: string } }
  | { type: 'deleted'; id: AggregateId<'test'> }

type TestReadModel = ReadModel & {
  type: 'test'
  id: string
  name: string
  status: 'active' | 'inactive'
}

describe('[event] map to projection fn', () => {
  describe('mapProjectionToFn', () => {
    test('returns original read model when event type not found in projection', () => {
      // Arrange
      const projection: Projection<
        TestEvent,
        TestReadModel,
        ProjectionMap<TestEvent, TestReadModel>
      > = {
        created: {
          test: ({ event }) => ({
            type: 'test',
            id: event.id.value,
            name: event.payload.name,
            status: 'active'
          })
        }
      } as any
      const projectionFn = mapProjectionToFn(projection)
      const originalReadModel: TestReadModel = {
        type: 'test',
        id: '123',
        name: 'original',
        status: 'inactive'
      }
      const params: ProjectionParams<TestEvent, TestReadModel> = {
        ctx: { timestamp: new Date() },
        event: {
          type: 'updated',
          id: zeroId('test'),
          payload: { name: 'updated' }
        },
        readModel: originalReadModel
      }

      // Act
      const result = projectionFn(params)

      // Assert
      expect(result).toBe(originalReadModel)
    })

    test('returns original read model when projection is not an object', () => {
      // Arrange
      const projection = {
        created: 'invalid'
      } as any
      const projectionFn = mapProjectionToFn(projection)
      const originalReadModel: TestReadModel = {
        type: 'test',
        id: '123',
        name: 'original',
        status: 'inactive'
      }
      const params: ProjectionParams<TestEvent, TestReadModel> = {
        ctx: { timestamp: new Date() },
        event: {
          type: 'created',
          id: zeroId('test'),
          payload: { name: 'new' }
        },
        readModel: originalReadModel
      }

      // Act
      const result = projectionFn(params)

      // Assert
      expect(result).toBe(originalReadModel)
    })

    test('returns original read model when read model type not found in projection', () => {
      // Arrange
      const projection: Projection<
        TestEvent,
        TestReadModel,
        ProjectionMap<TestEvent, TestReadModel>
      > = {
        created: {
          test: ({ event }) => ({
            type: 'test',
            id: event.id.value,
            name: event.payload.name,
            status: 'active'
          })
        },
        updated: { test: () => {} },
        deleted: { test: () => {} }
      }
      const projectionFn = mapProjectionToFn(projection)
      const originalReadModel: TestReadModel = {
        type: 'different' as any,
        id: '123',
        name: 'original',
        status: 'inactive'
      }
      const params: ProjectionParams<TestEvent, TestReadModel> = {
        ctx: { timestamp: new Date() },
        event: {
          type: 'created',
          id: zeroId('test'),
          payload: { name: 'new' }
        },
        readModel: originalReadModel
      }

      // Act
      const result = projectionFn(params)

      // Assert
      expect(result).toBe(originalReadModel)
    })

    test('returns original read model when projection function is not a function', () => {
      // Arrange
      const projection = {
        created: {
          test: 'not-a-function'
        }
      } as any
      const projectionFn = mapProjectionToFn(projection)
      const originalReadModel: TestReadModel = {
        type: 'test',
        id: '123',
        name: 'original',
        status: 'inactive'
      }
      const params: ProjectionParams<TestEvent, TestReadModel> = {
        ctx: { timestamp: new Date() },
        event: {
          type: 'created',
          id: zeroId('test'),
          payload: { name: 'new' }
        },
        readModel: originalReadModel
      }

      // Act
      const result = projectionFn(params)

      // Assert
      expect(result).toBe(originalReadModel)
    })

    test('applies projection function and returns new read model', () => {
      // Arrange
      const projection: Projection<
        TestEvent,
        TestReadModel,
        ProjectionMap<TestEvent, TestReadModel>
      > = {
        created: {
          test: ({ event }) => ({
            type: 'test',
            id: event.id.value,
            name: event.payload.name,
            status: 'active'
          })
        },
        updated: { test: () => {} },
        deleted: { test: () => {} }
      }
      const projectionFn = mapProjectionToFn(projection)
      const originalReadModel: TestReadModel = {
        type: 'test',
        id: '123',
        name: 'original',
        status: 'inactive'
      }
      const params: ProjectionParams<TestEvent, TestReadModel> = {
        ctx: { timestamp: new Date() },
        event: {
          type: 'created',
          id: zeroId('test'),
          payload: { name: 'new name' }
        },
        readModel: originalReadModel
      }

      // Act
      const result = projectionFn(params)

      // Assert
      expect(result).not.toBe(originalReadModel)
      expect(result.name).toBe('new name')
      expect(result.status).toBe('active')
    })

    test('applies projection function that mutates read model in place', () => {
      // Arrange
      const projection: Projection<
        TestEvent,
        TestReadModel,
        ProjectionMap<TestEvent, TestReadModel>
      > = {
        updated: {
          test: ({ event, readModel }) => {
            readModel.name = event.payload.name
            readModel.status = 'active'
          }
        },
        created: { test: () => {} },
        deleted: { test: () => {} }
      }
      const projectionFn = mapProjectionToFn(projection)
      const originalReadModel: TestReadModel = {
        type: 'test',
        id: '123',
        name: 'original',
        status: 'inactive'
      }
      const params: ProjectionParams<TestEvent, TestReadModel> = {
        ctx: { timestamp: new Date() },
        event: {
          type: 'updated',
          id: zeroId('test'),
          payload: { name: 'updated name' }
        },
        readModel: originalReadModel
      }

      // Act
      const result = projectionFn(params)

      // Assert
      expect(result.name).toBe('updated name')
      expect(result.status).toBe('active')
    })

    test('returns original read model when projection function returns null', () => {
      // Arrange
      const projection: Projection<
        TestEvent,
        TestReadModel,
        ProjectionMap<TestEvent, TestReadModel>
      > = {
        created: { test: () => {} },
        updated: { test: () => {} },
        deleted: {
          test: () => {
            null
          }
        }
      }
      const projectionFn = mapProjectionToFn(projection)
      const originalReadModel: TestReadModel = {
        type: 'test',
        id: '123',
        name: 'original',
        status: 'active'
      }
      const params: ProjectionParams<TestEvent, TestReadModel> = {
        ctx: { timestamp: new Date() },
        event: {
          type: 'deleted',
          id: zeroId('test')
        },
        readModel: originalReadModel
      }

      // Act
      const result = projectionFn(params)

      // Assert
      expect(result).toBe(originalReadModel)
    })

    test('returns original read model when projection function returns undefined', () => {
      // Arrange
      const projection: Projection<
        TestEvent,
        TestReadModel,
        ProjectionMap<TestEvent, TestReadModel>
      > = {
        created: { test: () => {} },
        updated: { test: () => {} },
        deleted: {
          test: () => undefined
        }
      }
      const projectionFn = mapProjectionToFn(projection)
      const originalReadModel: TestReadModel = {
        type: 'test',
        id: '123',
        name: 'original',
        status: 'active'
      }
      const params: ProjectionParams<TestEvent, TestReadModel> = {
        ctx: { timestamp: new Date() },
        event: {
          type: 'deleted',
          id: zeroId('test')
        },
        readModel: originalReadModel
      }

      // Act
      const result = projectionFn(params)

      // Assert
      expect(result).toBe(originalReadModel)
    })
  })

  test('returns original read model when projection function explicitly returns null', () => {
    const projection: Projection<
      TestEvent,
      TestReadModel,
      ProjectionMap<TestEvent, TestReadModel>
    > = {
      deleted: {
        test: () => null
      }
    } as any

    const projectionFn = mapProjectionToFn(projection)
    const originalReadModel: TestReadModel = {
      type: 'test',
      id: '123',
      name: 'original',
      status: 'active'
    }
    const params: ProjectionParams<TestEvent, TestReadModel> = {
      ctx: { timestamp: new Date() },
      event: { type: 'deleted', id: zeroId('test') },
      readModel: originalReadModel
    }

    const result = projectionFn(params)
    expect(result).toBe(originalReadModel)
  })

  test('throws when projection function returns invalid (non-object) value', () => {
    const projection: Projection<
      TestEvent,
      TestReadModel,
      ProjectionMap<TestEvent, TestReadModel>
    > = {
      updated: {
        test: () => 123 as any
      }
    } as any

    const projectionFn = mapProjectionToFn(projection)
    const originalReadModel: TestReadModel = {
      type: 'test',
      id: '123',
      name: 'original',
      status: 'active'
    }
    const params: ProjectionParams<TestEvent, TestReadModel> = {
      ctx: { timestamp: new Date() },
      event: { type: 'updated', id: zeroId('test'), payload: { name: 'oops' } },
      readModel: originalReadModel
    }

    expect(() => projectionFn(params)).toThrowError(/returned an invalid value/)
  })
})
