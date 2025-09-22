import { describe, expect, test } from 'bun:test'
import { CommandDispatcherMock } from '../../src/adapter/command-dispatcher-mock'
import { ReadModelStoreInMemory } from '../../src/adapter/read-model-store-in-memory'
import { zeroId } from '../../src/command/helpers/aggregate-id'
import { createEventBus } from '../../src/event/event-bus'
import type { AggregateId, ExtendedDomainEvent, ReadModel } from '../../src/types/core'
import type { EventReactor, ProjectionFn } from '../../src/types/event'

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

const projection: ProjectionFn<TestEvent, TestReadModel> = _ => {
  return { type: 'test', id: '123', name: 'test' }
}

const createTestReactor: EventReactor<TestEvent, TestCommand, TestReadModel> = {
  type: 'test',
  policy: () => null,
  projection
}

describe('[event] event bus', () => {
  describe('createEventBus', () => {
    test('creates event bus with dependencies and reactors', () => {
      // Arrange
      const deps = {
        commandDispatcher: new CommandDispatcherMock(),
        readModelStore: new ReadModelStoreInMemory()
      }
      const reactors = [createTestReactor]

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
      }
    })

    test('returns error when handler not found for specific aggregate type', async () => {
      // Arrange
      const deps = {
        commandDispatcher: new CommandDispatcherMock(),
        readModelStore: new ReadModelStoreInMemory()
      }
      const eventBus = createEventBus({ deps, reactors: [createTestReactor] })
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
