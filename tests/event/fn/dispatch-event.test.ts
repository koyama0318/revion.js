import { describe, expect, test } from 'bun:test'
import { CommandDispatcherMock } from '../../../src/adapter/command-dispatcher-mock'
import { zeroId } from '../../../src/command/helpers/aggregate-id'
import { createDispatchEventFnFactory } from '../../../src/event/fn/dispatch-event'
import type { CounterCommand, CounterEvent } from '../../fixtures/counter-app/features/counter/types'
import type { ExtendedDomainEvent } from '../../../src/types/core'

describe('[event] dispatch-event', () => {
  describe('createDispatchEventFnFactory', () => {
    test('returns ok when policy returns no command', async () => {
      // Arrange
      const policy = () => null
      const dispatcher = new CommandDispatcherMock()
      const dispatchFn = createDispatchEventFnFactory(policy)(dispatcher)
      const event: ExtendedDomainEvent<CounterEvent> = {
        type: 'created',
        id: zeroId('counter'),
        payload: { count: 0 },
        version: 1,
        timestamp: new Date()
      }

      // Act
      const result = await dispatchFn(event)

      // Assert
      expect(result.ok).toBe(true)
    })

    test('returns ok when command dispatch succeeds', async () => {
      // Arrange
      const policy = (): CounterCommand => ({
        type: 'increment',
        id: zeroId('counter')
      })
      const dispatcher = new CommandDispatcherMock()
      const dispatchFn = createDispatchEventFnFactory(policy)(dispatcher)
      const event: ExtendedDomainEvent<CounterEvent> = {
        type: 'created',
        id: zeroId('counter'),
        payload: { count: 0 },
        version: 1,
        timestamp: new Date()
      }

      // Act
      const result = await dispatchFn(event)

      // Assert
      expect(result.ok).toBe(true)
    })

    test('handles policy function throwing error', async () => {
      // Arrange
      const policy = () => {
        throw new Error('Policy execution failed')
      }
      const dispatcher = new CommandDispatcherMock()
      const dispatchFn = createDispatchEventFnFactory(policy)(dispatcher)
      const event: ExtendedDomainEvent<CounterEvent> = {
        type: 'created',
        id: zeroId('counter'),
        payload: { count: 0 },
        version: 1,
        timestamp: new Date()
      }

      // Act
      const result = await dispatchFn(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('POLICY_EXECUTION_FAILED')
      }
    })

    test('handles command dispatch failure', async () => {
      // Arrange
      const policy = (): CounterCommand => ({
        type: 'increment',
        id: zeroId('counter')
      })
      const dispatcher = new CommandDispatcherMock()
      dispatcher.dispatch = async () => {
        throw new Error('Mock dispatch failed')
      }
      const dispatchFn = createDispatchEventFnFactory(policy)(dispatcher)
      const event: ExtendedDomainEvent<CounterEvent> = {
        type: 'created',
        id: zeroId('counter'),
        payload: { count: 0 },
        version: 1,
        timestamp: new Date()
      }

      // Act
      const result = await dispatchFn(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('COMMAND_DISPATCH_FAILED')
        expect(result.error.message).toBe('Command dispatch failed: increment for event created')
      }
    })

    test('returns error when policy is null', async () => {
      // Arrange
      const dispatcher = new CommandDispatcherMock()
      const dispatchFn = createDispatchEventFnFactory(null as any)(dispatcher)
      const event: ExtendedDomainEvent<CounterEvent> = {
        type: 'created',
        id: zeroId('counter'),
        payload: { count: 0 },
        version: 1,
        timestamp: new Date()
      }

      // Act
      const result = await dispatchFn(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_POLICY')
      }
    })

    test('returns error when dispatcher is invalid', async () => {
      // Arrange
      const policy = () => null
      const dispatchFn = createDispatchEventFnFactory(policy)(null as any)
      const event: ExtendedDomainEvent<CounterEvent> = {
        type: 'created',
        id: zeroId('counter'),
        payload: { count: 0 },
        version: 1,
        timestamp: new Date()
      }

      // Act
      const result = await dispatchFn(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_DISPATCHER')
      }
    })

    test('returns error when event has no timestamp', async () => {
      // Arrange
      const policy = () => null
      const dispatcher = new CommandDispatcherMock()
      const dispatchFn = createDispatchEventFnFactory(policy)(dispatcher)
      const event = {
        type: 'created',
        id: zeroId('counter'),
        payload: { count: 0 },
        version: 1
      } as any

      // Act
      const result = await dispatchFn(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_EVENT')
      }
    })
  })
})
