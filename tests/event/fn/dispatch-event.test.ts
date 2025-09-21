import { describe, expect, test } from 'bun:test'
import { zeroId } from '../../../src/command/helpers/aggregate-id'
import { createDispatchEventFnFactory } from '../../../src/event/fn/dispatch-event'
import type { AggregateId, ExtendedDomainEvent } from '../../../src/types/core'

type TestEvent = { type: 'created'; id: AggregateId<'test'>; payload: { name: string } }

describe('[event] dispatch event function', () => {
  describe('createDispatchEventFnFactory', () => {
    test('returns ok when policy returns no command', async () => {
      // Arrange
      const policy = () => null
      const dispatcher = {
        dispatch: async () => {
          return Promise.resolve()
        }
      }
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
      const dispatcher = {
        dispatch: async () => {
          throw new Error('Mock dispatch failed')
        }
      }
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
        expect((result.error.cause as Error).message).toBe('Mock dispatch failed')
      }
    })

    test('returns ok when command dispatch succeeds', async () => {
      // Arrange
      const policy = () => ({
        type: 'notify' as const,
        id: zeroId('test'),
        payload: { message: 'test' }
      })
      const dispatcher = {
        dispatch: async () => {
          return Promise.resolve()
        }
      }
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
