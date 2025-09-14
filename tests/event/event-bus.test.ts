import { describe, expect, test } from 'bun:test'
import { CommandDispatcherMock } from '../../src/adapter/command-dispatcher-mock'
import { ReadModelStoreInMemory } from '../../src/adapter/read-model-store-in-memory'
import { zeroId } from '../../src/command/helpers/aggregate-id'
import { createEventBus } from '../../src/event/event-bus'
import type { AggregateId, ExtendedDomainEvent, ReadModel } from '../../src/types/core'
import type { EventReactor } from '../../src/types/event'

// Test types
type TestCommand = { type: 'notify'; id: AggregateId<'test'>; payload: { message: string } }

type TestEvent = ExtendedDomainEvent<{
  type: 'created'
  id: AggregateId<'test'>
  payload: { name: string }
}>

type TestReadModel = ReadModel & {
  type: 'test'
  id: string
  name: string
}

const createTestReactor = (): EventReactor<TestCommand, TestEvent, TestReadModel> => ({
  type: 'test',
  policy: () => null,
  projection: {
    created: {
      test: () => ({ type: 'test', id: '123', name: 'test' })
    }
  }
})

describe('[event] event bus', () => {
  describe('createEventBus', () => {
    test('creates event bus with dependencies and reactors', () => {
      // Arrange
      const deps = {
        commandDispatcher: new CommandDispatcherMock(),
        readModelStore: new ReadModelStoreInMemory()
      }
      const reactors = [createTestReactor()]

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
      const deps = {
        commandDispatcher: new CommandDispatcherMock(),
        readModelStore: new ReadModelStoreInMemory()
      }
      const reactor = createTestReactor()
      const eventBus = createEventBus({ deps, reactors: [reactor] })
      const event: TestEvent = {
        type: 'created',
        id: zeroId('test'),
        payload: { name: 'test' },
        version: 1,
        timestamp: new Date()
      }

      // Act
      const res = await eventBus(event)

      // Assert
      expect(res.ok).toBe(true)
    })

    test('returns error when handler not found', async () => {
      // Arrange
      const deps = {
        commandDispatcher: new CommandDispatcherMock(),
        readModelStore: new ReadModelStoreInMemory()
      }
      const eventBus = createEventBus({ deps, reactors: [] })
      const event: TestEvent = {
        type: 'created',
        id: zeroId('test'),
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
        expect(res.error.message).toBe('Handler for event type created not found')
      }
    })

    test('returns error when handler not found for specific aggregate type', async () => {
      // Arrange
      const deps = {
        commandDispatcher: new CommandDispatcherMock(),
        readModelStore: new ReadModelStoreInMemory()
      }
      const reactor: EventReactor<TestCommand, TestEvent, TestReadModel> = {
        type: 'test',
        policy: () => null,
        projection: {
          created: {
            test: () => ({ type: 'test', id: '123', name: 'test' })
          }
        }
      }
      const eventBus = createEventBus({ deps, reactors: [reactor] })
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
  })
})
