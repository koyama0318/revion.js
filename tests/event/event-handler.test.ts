import { describe, expect, test } from 'bun:test'
import { zeroId } from '../../src'
import { createEventHandlers } from '../../src/event/event-handler'
import type { CommandDispatcher, QueryOption, ReadModelStore } from '../../src/types/adapter'
import type { AggregateId, ReadModel } from '../../src/types/core'
import type { EventReactor } from '../../src/types/event'

// Test types
type TestCommand = { type: 'notify'; id: AggregateId<'test'>; payload: { message: string } }
type TestEvent = { type: 'created'; id: AggregateId<'test'>; payload: { name: string } }
type TestReadModel = ReadModel & { type: 'test'; id: string; name: string }

// Mock classes for testing error scenarios
class MockCommandDispatcherError implements CommandDispatcher {
  async dispatch(): Promise<void> {
    throw new Error('Mock dispatch error')
  }
}

class MockReadModelStoreError implements ReadModelStore {
  async findMany<T extends ReadModel>(_type: T['type'], _optionss: unknown): Promise<T[]> {
    throw new Error('Mock database error')
  }

  async findById<T extends ReadModel>(_type: T['type'], _idd: string): Promise<T | null> {
    throw new Error('Mock database error')
  }

  async save(): Promise<void> {
    throw new Error('Mock save error')
  }

  async delete(): Promise<void> {
    throw new Error('Mock delete error')
  }
}

class MockReadModelStoreThrows implements ReadModelStore {
  async findMany<T extends ReadModel>(_type: T['type'], _optionss: QueryOption<T>): Promise<T[]> {
    throw new Error('Method not implemented.')
  }
  async findById<T extends ReadModel>(_type: T['type'], _idd: string): Promise<T | null> {
    throw new Error('Method not implemented.')
  }

  async save(): Promise<void> {
    throw new Error('Save operation failed')
  }

  async delete(): Promise<void> {
    throw new Error('Delete operation failed')
  }
}

describe('[event] event handler', () => {
  describe('error handling in dispatch operations', () => {
    test('handles dispatch errors from policy execution', async () => {
      // Arrange
      const reactor: EventReactor<TestCommand, TestEvent, TestReadModel> = {
        type: 'test',
        policy: () => ({
          type: 'notify',
          id: zeroId('test'),
          payload: { message: 'test' }
        }),
        projection: {
          created: {
            test: () => ({
              type: 'test',
              id: '123',
              name: 'test'
            })
          }
        }
      }

      const deps = {
        commandDispatcher: new MockCommandDispatcherError(),
        ReadModelStore: new MockReadModelStoreError()
      }

      const handlers = createEventHandlers(deps, [reactor])
      const event = {
        type: 'created',
        id: zeroId('test'),
        payload: { name: 'test' },
        version: 1,
        timestamp: new Date()
      }

      // Act
      const result = await handlers['test']!(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('COMMAND_DISPATCH_FAILED')
      }
    })
  })

  describe('error handling in projection operations', () => {
    test('handles projection errors when database operations fail', async () => {
      // Arrange
      const reactor: EventReactor<TestCommand, TestEvent, TestReadModel> = {
        type: 'test',
        policy: () => null, // No command dispatch
        projection: {
          created: {
            test: () => ({
              type: 'test',
              id: '123',
              name: 'test'
            })
          }
        }
      }

      const deps = {
        commandDispatcher: new MockCommandDispatcherError(),
        ReadModelStore: new MockReadModelStoreError()
      }

      const handlers = createEventHandlers(deps, [reactor])
      const event = {
        type: 'created',
        id: zeroId('test'),
        payload: { name: 'test' },
        version: 1,
        timestamp: new Date()
      }

      // Act
      const result = await handlers['test']!(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('SAVE_VIEW_FAILED')
      }
    })
  })

  describe('unexpected error handling', () => {
    test('handles unexpected errors that escape the Result type system', async () => {
      // Arrange
      const reactor: EventReactor<TestCommand, TestEvent, TestReadModel> = {
        type: 'test',
        policy: () => null,
        projection: {
          created: {
            test: ({ event }) => ({
              type: 'test',
              id: event.id.value,
              name: 'test'
            })
          }
        }
      }

      const deps = {
        commandDispatcher: new MockCommandDispatcherError(),
        ReadModelStore: new MockReadModelStoreThrows()
      }

      const handlers = createEventHandlers(deps, [reactor])
      const event = {
        type: 'created',
        id: zeroId('test'),
        payload: { name: 'test' },
        version: 1,
        timestamp: new Date()
      }

      // Act
      const result = await handlers['test']!(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('SAVE_VIEW_FAILED')
      }
    })

    test('handles non-Error exceptions gracefully', async () => {
      // Arrange
      class ThrowsStringDatabase implements ReadModelStore {
        findMany<T extends ReadModel>(_type: T['type'], _optionss: QueryOption<T>): Promise<T[]> {
          throw new Error('Method not implemented.')
        }
        findById<T extends ReadModel>(_type: T['type'], _idd: string): Promise<T | null> {
          throw new Error('Method not implemented.')
        }
        async save(): Promise<void> {
          throw 'String error'
        }

        async delete(): Promise<void> {
          throw 'String error'
        }
      }

      const reactor: EventReactor<TestCommand, TestEvent, TestReadModel> = {
        type: 'test',
        policy: () => null,
        projection: {
          created: {
            test: ({ event }) => ({
              type: 'test',
              id: event.id.value,
              name: 'test'
            })
          }
        }
      }

      const deps = {
        commandDispatcher: new MockCommandDispatcherError(),
        ReadModelStore: new ThrowsStringDatabase()
      }

      const handlers = createEventHandlers(deps, [reactor])
      const event = {
        type: 'created',
        id: zeroId('test'),
        payload: { name: 'test' },
        version: 1,
        timestamp: new Date()
      }

      // Act
      const result = await handlers['test']!(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('SAVE_VIEW_FAILED')
      }
    })
  })
})
