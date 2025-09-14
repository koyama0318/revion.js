import { describe, expect, test } from 'bun:test'
import { zeroId } from '../../../src/command/helpers/aggregate-id'
import { createDispatchEventFnFactory } from '../../../src/event/fn/dispatch-event'
import type { CommandDispatcher } from '../../../src/types/adapter'
import type { AggregateId, ExtendedDomainEvent } from '../../../src/types/core'

type TestEvent = { type: 'created'; id: AggregateId<'test'>; payload: { name: string } }

// Mock command dispatcher that fails
class MockCommandDispatcherError implements CommandDispatcher {
  async dispatch() {
    throw new Error('Mock dispatch failed')
  }
}

// Mock command dispatcher that succeeds
class MockCommandDispatcherSuccess implements CommandDispatcher {
  async dispatch() {
    throw new Error('Mock dispatch failed')
  }
}

describe('[event] dispatch event function', () => {
  describe('createDispatchEventFnFactory', () => {
    test('returns ok when policy returns no command', async () => {
      // Arrange
      const policy = () => null
      const dispatcher = new MockCommandDispatcherSuccess()
      const dispatchFn = createDispatchEventFnFactory(policy)(dispatcher)
      const event: ExtendedDomainEvent<TestEvent> = {
        type: 'created',
        id: zeroId('test'),
        payload: { name: 'test' },
        version: 1,
        timestamp: new Date()
      }

      // Act
      const result = await dispatchFn(event)

      // Assert
      expect(result.ok).toBe(true)
    })

    test('handles command dispatch failure', async () => {
      // Arrange
      const policy = () => ({
        type: 'notify' as const,
        id: zeroId('test'),
        payload: { message: 'test' }
      })
      const dispatcher = new MockCommandDispatcherError()
      const dispatchFn = createDispatchEventFnFactory(policy)(dispatcher)
      const event: ExtendedDomainEvent<TestEvent> = {
        type: 'created',
        id: zeroId('test'),
        payload: { name: 'test' },
        version: 1,
        timestamp: new Date()
      }

      // Act
      const result = await dispatchFn(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('COMMAND_DISPATCH_FAILED')
        expect(result.error.message).toBe('Command dispatch failed')
      }
    })

    test('returns ok when command dispatch succeeds', async () => {
      // Arrange
      class MockCommandDispatcherOk implements CommandDispatcher {
        async dispatch() {
          return Promise.resolve()
        }
      }

      const policy = () => ({
        type: 'notify' as const,
        id: zeroId('test'),
        payload: { message: 'test' }
      })
      const dispatcher = new MockCommandDispatcherOk()
      const dispatchFn = createDispatchEventFnFactory(policy)(dispatcher)
      const event: ExtendedDomainEvent<TestEvent> = {
        type: 'created',
        id: zeroId('test'),
        payload: { name: 'test' },
        version: 1,
        timestamp: new Date()
      }

      // Act
      const result = await dispatchFn(event)

      // Assert
      expect(result.ok).toBe(true)
    })
  })
})
