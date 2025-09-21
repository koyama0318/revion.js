import { describe, expect, test } from 'bun:test'
import { CommandDispatcherMock } from '../../src/adapter/command-dispatcher-mock'
import { ReadModelStoreInMemory } from '../../src/adapter/read-model-store-in-memory'
import { zeroId } from '../../src/command/helpers/aggregate-id'
import { createEventBus } from '../../src/event/event-bus'
import type { ExtendedDomainEvent } from '../../src/types/core'
import type { EventReactor } from '../../src/types/event'
import { counterReactor } from '../fixtures'
import type { CounterEvent } from '../fixtures/counter-app/features/counter/types'

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

    test('creates event bus with minimal configuration', () => {
      // Arrange
      const deps = {
        commandDispatcher: new CommandDispatcherMock(),
        readModelStore: new ReadModelStoreInMemory()
      }

      // Act
      const eventBus = createEventBus({ deps, reactors: [] })

      // Assert
      expect(eventBus).toBeDefined()
      expect(typeof eventBus).toBe('function')
    })
  })

  describe('event processing', () => {
    describe('successful event handling', () => {
      test('processes event successfully when matching handler exists', async () => {
        // Arrange
        const deps = {
          commandDispatcher: new CommandDispatcherMock(),
          readModelStore: new ReadModelStoreInMemory()
        }
        const eventBus = createEventBus({ deps, reactors: [counterReactor] })
        const event: ExtendedDomainEvent<CounterEvent> = {
          type: 'created',
          id: zeroId('counter'),
          payload: { count: 0 },
          version: 1,
          timestamp: new Date()
        }

        // Act
        const res = await eventBus(event)
        console.log('res', res)

        // Assert
        expect(res.ok).toBe(true)
      })
    })

    describe('error handling', () => {
      test('returns error when handler not found for event type', async () => {
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
          expect(res.error.message).toBe('Handler for event type created not found')
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
          id: { type: 'hoge', value: '123' },
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

      test('returns error when handler exists but event processing fails', async () => {
        // Arrange
        const deps = {
          commandDispatcher: new CommandDispatcherMock(),
          readModelStore: new ReadModelStoreInMemory()
        }
        deps.readModelStore.save = async () => {
          throw new Error('Database error')
        }

        const eventBus = createEventBus({ deps, reactors: [counterReactor] })
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
          expect(res.error.code).toBe('SAVE_VIEW_FAILED')
        }
      })
    })
  })
})
