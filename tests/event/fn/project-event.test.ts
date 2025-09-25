import { describe, expect, test } from 'bun:test'
import { zeroId } from '../../../src'
import { createProjectEventFnFactory } from '../../../src/event/fn/project-event'
import { mapProjectionToFn } from '../../../src/event/mapper/map-to-projection-fn'
import type { ExtendedDomainEvent } from '../../../src/types/core'
import type { Projection, ProjectionMap } from '../../../src/types/event'
import type { CounterEvent } from '../../fixtures/counter-app/features/counter/types'
import type { CounterReadModel } from '../../fixtures/counter-app/shared/readmodel'

describe('[event] project-event', () => {
  describe('createProjectEventFnFactory', () => {
    test('returns empty dict when no read models provided', async () => {
      // Arrange
      const id = zeroId('counter')
      const projection: Projection<
        CounterEvent,
        CounterReadModel,
        ProjectionMap<CounterEvent, CounterReadModel>
      > = {
        created: {
          counter: ({ event }) => ({
            type: 'counter',
            id: event.id.value,
            count: event.payload.count
          })
        },
        incremented: { counter: () => {} },
        decremented: { counter: () => {} }
      }

      const projectionFn = mapProjectionToFn<
        CounterEvent,
        CounterReadModel,
        ProjectionMap<CounterEvent, CounterReadModel>
      >(projection)
      const projectFn = createProjectEventFnFactory(projectionFn)()

      const event: ExtendedDomainEvent<CounterEvent> = {
        type: 'created',
        id,
        payload: { count: 0 },
        version: 1,
        timestamp: new Date()
      } as ExtendedDomainEvent<CounterEvent>

      // Act
      const result = await projectFn(event, {})

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(Object.keys(result.value)).toHaveLength(0)
      }
    })

    test('processes read models with projection function', async () => {
      // Arrange
      const id = zeroId('counter')
      const projection: Projection<
        CounterEvent,
        CounterReadModel,
        ProjectionMap<CounterEvent, CounterReadModel>
      > = {
        created: {
          counter: ({ event }) => ({
            type: 'counter',
            id: event.id.value,
            count: event.payload.count
          })
        },
        incremented: { counter: () => {} },
        decremented: { counter: () => {} }
      }
      const projectionFn = mapProjectionToFn(projection)
      const projectFn = createProjectEventFnFactory(projectionFn)()
      const event: ExtendedDomainEvent<CounterEvent> = {
        type: 'created',
        id,
        payload: { count: 5 },
        version: 1,
        timestamp: new Date()
      } as ExtendedDomainEvent<CounterEvent>
      const readModels = {
        counter123: {
          type: 'counter',
          id: '123',
          count: 0
        } as CounterReadModel
      }

      // Act
      const result = await projectFn(event, readModels)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(Object.keys(result.value)).toHaveLength(1)
        expect(result.value.counter123.count).toBe(5)
      }
    })

    test('handles projection function throwing error', async () => {
      // Arrange
      const id = zeroId('counter')
      const projection: Projection<
        CounterEvent,
        CounterReadModel,
        ProjectionMap<CounterEvent, CounterReadModel>
      > = {
        created: {
          counter: () => {
            throw new Error('Projection function error')
          }
        },
        incremented: { counter: () => {} },
        decremented: { counter: () => {} }
      }
      const projectionFn = mapProjectionToFn(projection)
      const projectFn = createProjectEventFnFactory(projectionFn)()
      const event: ExtendedDomainEvent<CounterEvent> = {
        type: 'created',
        id,
        payload: { count: 5 },
        version: 1,
        timestamp: new Date()
      } as ExtendedDomainEvent<CounterEvent>
      const readModels = {
        counter123: {
          type: 'counter',
          id: '123',
          count: 0
        } as CounterReadModel
      }

      // Act
      const result = await projectFn(event, readModels)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('PROJECTION_EXECUTION_FAILED')
        expect(result.error.message).toContain('Projection execution failed')
      }
    })

    test('handles invalid readModels parameter', async () => {
      // Arrange
      const id = zeroId('counter')
      const projection: Projection<
        CounterEvent,
        CounterReadModel,
        ProjectionMap<CounterEvent, CounterReadModel>
      > = {
        created: {
          counter: ({ event }) => ({
            type: 'counter',
            id: event.id.value,
            count: event.payload.count
          })
        },
        incremented: { counter: () => {} },
        decremented: { counter: () => {} }
      }
      const projectionFn = mapProjectionToFn(projection)
      const projectFn = createProjectEventFnFactory(projectionFn)()
      const event: ExtendedDomainEvent<CounterEvent> = {
        type: 'created',
        id,
        payload: { count: 5 },
        version: 1,
        timestamp: new Date()
      } as ExtendedDomainEvent<CounterEvent>

      // Act
      const result = await projectFn(event, null as any)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(Object.keys(result.value)).toHaveLength(0)
      }
    })
  })
})
