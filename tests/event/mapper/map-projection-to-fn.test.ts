import { describe, expect, test } from 'bun:test'
import { mapProjectionToFn } from '../../../src/event/mapper/map-projection-to-fn'
import type { AggregateId } from '../../../src/types/core'
import type { Projection, ProjectionMap } from '../../../src/types/event'

type TestEvent =
  | { type: 'incremented'; id: AggregateId<'test'>; payload: { amount: number } }
  | { type: 'reset'; id: AggregateId<'test'> }

type TestReadModel =
  | { type: 'counter'; id: string; value: number; updatedAt?: Date }
  | { type: 'stats'; id: string; total: number }

const projectionMap = {
  incremented: [{ readModel: 'counter' }, { readModel: 'stats' }],
  reset: [{ readModel: 'counter' }]
} satisfies ProjectionMap<TestEvent, TestReadModel>

const projections: Projection<TestEvent, TestReadModel, typeof projectionMap> = {
  incremented: {
    counter: ({ event, readModel, ctx }) => {
      readModel.value += event.payload.amount
      readModel.updatedAt = ctx.timestamp
    },
    stats: ({ event, readModel }) => {
      readModel.total += event.payload.amount
    }
  },
  reset: {
    counter: ({ readModel, ctx }) => {
      return {
        type: 'counter',
        id: readModel.id,
        value: 0,
        updatedAt: ctx.timestamp
      }
    }
  }
}

describe('[event] mapProjectionToFn', () => {
  test('converts Projection object to ProjectionFn', () => {
    // Arrange & Act
    const projectionFn = mapProjectionToFn(projections)

    // Assert
    expect(typeof projectionFn).toBe('function')
  })

  test('applies mutation projection correctly (same reference)', () => {
    // Arrange
    const projectionFn = mapProjectionToFn(projections)
    const ctx = { timestamp: new Date() }
    const event: TestEvent = {
      type: 'incremented',
      id: { type: 'test', value: '1' },
      payload: { amount: 3 }
    }
    const readModel: TestReadModel = {
      type: 'counter',
      id: 'r1',
      value: 10
    }

    // Act
    const result = projectionFn({ ctx, event, readModel })

    // Assert
    expect(result).toBe(readModel)
    expect(result.value).toBe(13)
    expect(result.updatedAt).toEqual(ctx.timestamp)
  })

  test('applies replacement projection correctly (different reference)', () => {
    // Arrange
    const projectionFn = mapProjectionToFn(projections)
    const ctx = { timestamp: new Date() }
    const event: TestEvent = {
      type: 'reset',
      id: { type: 'test', value: '2' }
    }
    const readModel: TestReadModel = {
      type: 'counter',
      id: 'r2',
      value: 42
    }

    // Act
    const result = projectionFn({ ctx, event, readModel })

    // Assert
    expect(result).not.toBe(readModel)
    expect(result.type).toBe('counter')
    expect(result.id).toBe('r2')
    expect(result.value).toBe(0)
    expect((result as Extract<TestReadModel, { type: 'counter' }>).updatedAt).toEqual(ctx.timestamp)
  })

  test('handles different read model types for the same event', () => {
    // Arrange
    const projectionFn = mapProjectionToFn(projections)
    const ctx = { timestamp: new Date() }
    const event: TestEvent = {
      type: 'incremented',
      id: { type: 'test', value: '3' },
      payload: { amount: 5 }
    }
    const readModelCounter: TestReadModel = { type: 'counter', id: 'c1', value: 1 }
    const readModelStats: TestReadModel = { type: 'stats', id: 's1', total: 7 }

    // Act
    const updatedCounter = projectionFn({ ctx, event, readModel: readModelCounter })
    const updatedStats = projectionFn({ ctx, event, readModel: readModelStats })

    // Assert
    expect(updatedCounter.value).toBe(6)
    expect((updatedCounter as Extract<TestReadModel, { type: 'counter' }>).updatedAt).toEqual(
      ctx.timestamp
    )
    expect(updatedStats.total).toBe(12)
  })

  test('returns original readModel for unknown event type', () => {
    // Arrange
    const projectionFn = mapProjectionToFn(projections)
    const ctx = { timestamp: new Date() }
    const unknownEvent = {
      type: 'unknown',
      id: { type: 'test', value: 'x' }
    }
    const readModel: TestReadModel = { type: 'counter', id: 'rx', value: 9 }

    // Act
    const result = projectionFn({ ctx, event: unknownEvent as TestEvent, readModel })

    // Assert
    expect(result).toBe(readModel)
    expect(result.value).toBe(9)
  })

  test('returns original readModel when projection for readModel type is missing', () => {
    // Arrange
    const projectionFn = mapProjectionToFn(projections)
    const ctx = { timestamp: new Date() }
    const event: TestEvent = {
      type: 'reset',
      id: { type: 'test', value: 'y' }
    }
    const readModel: TestReadModel = { type: 'stats', id: 's-missing', total: 100 }

    // Act
    const result = projectionFn({ ctx, event, readModel })

    // Assert
    expect(result).toBe(readModel)
    expect(result.total).toBe(100)
  })
})
