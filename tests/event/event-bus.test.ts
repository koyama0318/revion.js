import { describe, expect, test } from 'bun:test'
import { CommandDispatcherMock } from '../../src/adapter/command-dispatcher-mock'
import { ReadModelStoreInMemory } from '../../src/adapter/read-model-store-in-memory'
import { zeroId } from '../../src/command/helpers/aggregate-id'
import { createEventBus } from '../../src/event/event-bus'
import type { ExtendedDomainEvent } from '../../src/types/core'
import type { EventReactor } from '../../src/types/event'
import type { CounterEvent } from '../fixtures/counter-app/features/counter'
import { counterReactor } from '../fixtures/counter-app/features/counter'

describe('[event] event bus', () => {
  describe('createEventBus', () => {
    test('creates event bus with dependencies and reactors', () => {
      // Arrange
      const deps = {
        commandDispatcher: new CommandDispatcherMock(),
        readModelStore: new ReadModelStoreInMemory()
      }
      const reactors = [counterReactor]

      // Act
      const eventBus = createEventBus({ deps, reactors })

      // Assert
      expect(eventBus).toBeDefined()
      expect(typeof eventBus).toBe('function')
    })

    test('creates event bus with empty reactors array', () => {
      // Arrange
      const deps = {
        commandDispatcher: new CommandDispatcherMock(),
        readModelStore: new ReadModelStoreInMemory()
      }
      const reactors: EventReactor<any, any, any>[] = []

      // Act
      const eventBus = createEventBus({ deps, reactors })

      // Assert
      expect(eventBus).toBeDefined()
      expect(typeof eventBus).toBe('function')
    })
  })

  describe('event processing', () => {
    test('processes event successfully when handler exists', async () => {
      // Arrange
      const id = zeroId('counter')
      const deps = {
        commandDispatcher: new CommandDispatcherMock(),
        readModelStore: new ReadModelStoreInMemory()
      }
      const counterReadModel = {
        type: 'counter',
        id: id.value,
        count: 0
      }
      await deps.readModelStore.save(counterReadModel)
      const eventBus = createEventBus({ deps, reactors: [counterReactor] })
      const event: ExtendedDomainEvent<CounterEvent> = {
        type: 'created',
        id,
        payload: { count: 5 },
        version: 1,
        timestamp: new Date()
      }

      // Act
      const res = await eventBus(event)

      // Assert
      expect(res.ok).toBe(true)
    })

    test('returns error for invalid event', async () => {
      // Arrange
      const deps = {
        commandDispatcher: new CommandDispatcherMock(),
        readModelStore: new ReadModelStoreInMemory()
      }
      const eventBus = createEventBus({ deps, reactors: [] })

      // Act
      const res = await eventBus(null as any)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('INVALID_EVENT')
      }
    })

    test('returns error for event without id.type', async () => {
      // Arrange
      const deps = {
        commandDispatcher: new CommandDispatcherMock(),
        readModelStore: new ReadModelStoreInMemory()
      }
      const eventBus = createEventBus({ deps, reactors: [] })
      const invalidEvent = {
        type: 'created',
        id: {},
        payload: { count: 0 },
        version: 1,
        timestamp: new Date()
      }

      // Act
      const res = await eventBus(invalidEvent as any)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('INVALID_AGGREGATE_ID')
      }
    })

    test('returns error when handler not found', async () => {
      // Arrange
      const deps = {
        commandDispatcher: new CommandDispatcherMock(),
        readModelStore: new ReadModelStoreInMemory()
      }
      const eventBus = createEventBus({ deps, reactors: [] })
      const event: ExtendedDomainEvent<CounterEvent> = {
        type: 'created',
        id: zeroId('counter'),
        payload: { count: 0 },
        version: 1,
        timestamp: new Date()
      }

      // Act
      const res = await eventBus(event)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('EVENT_HANDLER_NOT_FOUND')
      }
    })

    test('returns error when handler not found for specific aggregate type', async () => {
      // Arrange
      const deps = {
        commandDispatcher: new CommandDispatcherMock(),
        readModelStore: new ReadModelStoreInMemory()
      }
      const eventBus = createEventBus({ deps, reactors: [counterReactor] })
      const event = {
        type: 'created',
        id: { type: 'hoge', value: '00000000-0000-0000-0000-000000000000' },
        payload: { name: 'test' },
        version: 1,
        timestamp: new Date()
      }

      // Act
      const res = await eventBus(event)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('EVENT_HANDLER_NOT_FOUND')
      }
    })
  })
})
