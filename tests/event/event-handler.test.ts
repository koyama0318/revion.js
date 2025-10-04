import { describe, expect, test } from 'bun:test'
import { zeroId } from '../../src'
import { CommandDispatcherMock } from '../../src/adapter/command-dispatcher-mock'
import { ReadModelStoreInMemory } from '../../src/adapter/read-model-store-in-memory'
import { createEventHandlers } from '../../src/event/event-handler'
import { createEventReactor } from '../../src/event/event-reactor-builder'
import type { ExtendedDomainEvent } from '../../src/types/core'
import type { Policy, Projection, ProjectionMap } from '../../src/types/event'
import { counterReactor } from '../fixtures/counter-app/features/counter'
import type {
  CounterCommand,
  CounterEvent,
  CounterReadModels
} from '../fixtures/counter-app/features/counter/types'

describe('[event] event handler', () => {
  describe('createEventHandlers', () => {
    test('processes events successfully when all operations succeed', async () => {
      // Arrange
      const id = zeroId('counter')
      const deps = {
        commandDispatcher: new CommandDispatcherMock(),
        readModelStore: new ReadModelStoreInMemory()
      }
      // First save a model so prefetch succeeds
      await deps.readModelStore.save({
        type: 'counter',
        id: id.value
      })

      const handlers = createEventHandlers(deps, [counterReactor])
      const event: ExtendedDomainEvent<CounterEvent> = {
        type: 'created',
        id,
        payload: { count: 5 },
        version: 1,
        timestamp: new Date()
      }

      // Act
      const result = await handlers['counter']!(event)

      // Assert
      expect(result.ok).toBe(true)
    })

    test('handles model prefetch errors when read model store fails', async () => {
      // Arrange
      const id = zeroId('counter')
      const deps = {
        commandDispatcher: new CommandDispatcherMock(),
        readModelStore: new ReadModelStoreInMemory()
      }
      deps.readModelStore.findById = async () => {
        throw new Error('Prefetch error')
      }

      const handlers = createEventHandlers(deps, [counterReactor])
      const event: ExtendedDomainEvent<CounterEvent> = {
        type: 'created',
        id,
        payload: { count: 5 },
        version: 1,
        timestamp: new Date()
      }

      // Act
      const result = await handlers['counter']!(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('READ_MODEL_FETCH_FAILED')
      }
    })

    test('handles projection function throwing error', async () => {
      // Arrange
      const id = zeroId('counter')
      const deps = {
        commandDispatcher: new CommandDispatcherMock(),
        readModelStore: new ReadModelStoreInMemory()
      }

      // First save a model so prefetch succeeds
      await deps.readModelStore.save({
        type: 'counter',
        id: id.value
      })

      // After setup, override save to fail
      deps.readModelStore.save = async () => {
        throw new Error('Save error')
      }

      const handlers = createEventHandlers(deps, [counterReactor])
      const event: ExtendedDomainEvent<CounterEvent> = {
        type: 'created',
        id,
        payload: { count: 0 },
        version: 1,
        timestamp: new Date()
      }

      // Act
      const result = await handlers['counter']!(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('MODEL_SAVE_FAILED')
      }
    })

    test('handles save errors when database operations fail', async () => {
      // Arrange
      const id = zeroId('counter')
      const deps = {
        commandDispatcher: new CommandDispatcherMock(),
        readModelStore: new ReadModelStoreInMemory()
      }
      // First save a model so prefetch succeeds
      await deps.readModelStore.save({
        type: 'counter',
        id: id.value
      })

      // After setup, override save to fail
      deps.readModelStore.save = async () => {
        throw new Error('Save error')
      }

      const handlers = createEventHandlers(deps, [counterReactor])
      const event: ExtendedDomainEvent<CounterEvent> = {
        type: 'created',
        id,
        payload: { count: 5 }, // Different value to ensure projection runs
        version: 1,
        timestamp: new Date()
      }

      // Act
      const result = await handlers['counter']!(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('MODEL_SAVE_FAILED')
      }
    })

    test('handles dispatch errors from policy execution', async () => {
      // Arrange
      const id = zeroId('counter')
      const deps = {
        commandDispatcher: new CommandDispatcherMock(),
        readModelStore: new ReadModelStoreInMemory()
      }
      deps.commandDispatcher.dispatch = async () => {
        throw new Error('Dispatch error')
      }

      // First save a model so prefetch succeeds
      await deps.readModelStore.save({
        type: 'counter',
        id: id.value
      })

      const policy: Policy<CounterEvent, CounterCommand> = {
        created: ({ event }) => {
          return { type: 'increment', id: event.id }
        },
        incremented: () => null,
        decremented: () => null
      }

      const projectionMap = {
        created: [{ readModel: 'counter' }],
        incremented: [],
        decremented: []
      } satisfies ProjectionMap<CounterEvent, CounterReadModels>

      const projection: Projection<CounterEvent, CounterReadModels, typeof projectionMap> = {
        created: {
          counter: ({ event }) => ({
            type: 'counter',
            id: event.id.value,
            count: event.payload.count
          })
        },
        incremented: {},
        decremented: {}
      }

      const counterReactor = createEventReactor<CounterEvent, CounterCommand, CounterReadModels>()
        .type('counter')
        .policy(policy)
        .projectionWithMap(projection, projectionMap)
        .build()

      const handlers = createEventHandlers(deps, [counterReactor])
      const event: ExtendedDomainEvent<CounterEvent> = {
        type: 'created',
        id,
        payload: { count: 0 },
        version: 1,
        timestamp: new Date()
      }

      // Act
      const result = await handlers['counter']!(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('COMMAND_DISPATCH_FAILED')
      }
    })
  })
})
