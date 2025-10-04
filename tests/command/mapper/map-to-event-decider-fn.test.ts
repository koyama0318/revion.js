import { describe, expect, test } from 'bun:test'
import { mapToEventDeciderFn } from '../../../src/command/mapper/map-to-event-decider-fn'
import type { EventDecider } from '../../../src/types/command'
import type { AggregateId } from '../../../src/types/core'

type TestState =
  | { type: 'active'; id: AggregateId<'test'>; value: number }
  | { type: 'inactive'; id: AggregateId<'test'>; value: number }

type TestCommand =
  | { type: 'create'; id: AggregateId<'test'>; payload: { value: number } }
  | { type: 'update'; id: AggregateId<'test'>; payload: { value: number } }
  | { type: 'deactivate'; id: AggregateId<'test'> }

type TestEvent =
  | { type: 'created'; id: AggregateId<'test'>; payload: { value: number } }
  | { type: 'updated'; id: AggregateId<'test'>; payload: { value: number } }
  | { type: 'deactivated'; id: AggregateId<'test'> }

const testDeciders: EventDecider<TestState, TestCommand, TestEvent> = {
  create: ({ command }) => ({
    type: 'created',
    id: command.id,
    payload: { value: command.payload.value }
  }),
  update: ({ command }) => ({
    type: 'updated',
    id: command.id,
    payload: { value: command.payload.value }
  }),
  deactivate: ({ command }) => ({
    type: 'deactivated',
    id: command.id
  })
}

describe('[command] map to event decider fn', () => {
  describe('mapToEventDeciderFn', () => {
    test('converts EventDecider object to EventDeciderFn', () => {
      // Arrange & Act
      const deciderFn = mapToEventDeciderFn<TestState, TestCommand, TestEvent>(testDeciders)

      // Assert
      expect(typeof deciderFn).toBe('function')
    })

    test('produces event correctly for known command', () => {
      // Arrange
      const deciderFn = mapToEventDeciderFn<TestState, TestCommand, TestEvent>(testDeciders)
      const command: TestCommand = {
        type: 'create',
        id: { type: 'test', value: '1' },
        payload: { value: 10 }
      }
      const state: TestState = { type: 'inactive', id: { type: 'test', value: '1' }, value: 0 }
      const ctx = { timestamp: new Date() }

      // Act
      const event = deciderFn({ ctx, state, command })

      // Assert
      expect(event).toEqual({
        type: 'created',
        id: { type: 'test', value: '1' },
        payload: { value: 10 }
      })
    })

    test('handles different command types correctly', () => {
      // Arrange
      const deciderFn = mapToEventDeciderFn<TestState, TestCommand, TestEvent>(testDeciders)
      const command: TestCommand = {
        type: 'update',
        id: { type: 'test', value: '2' },
        payload: { value: 200 }
      }
      const state: TestState = { type: 'active', id: { type: 'test', value: '2' }, value: 50 }
      const ctx = { timestamp: new Date() }

      // Act
      const event = deciderFn({ ctx, state, command })

      // Assert
      expect(event.type).toBe('updated')
      expect(event.id).toEqual({ type: 'test', value: '2' })
      expect((event as Extract<TestEvent, { type: 'updated' }>).payload.value).toBe(200)
    })

    test('throws error for unknown command type', () => {
      // Arrange
      const deciderFn = mapToEventDeciderFn<TestState, TestCommand, TestEvent>(testDeciders)
      const unknownCommand = { type: 'unknown', id: { type: 'test', value: 'x' } }
      const state: TestState = { type: 'active', id: { type: 'test', value: 'x' }, value: 0 }
      const ctx = { timestamp: new Date() }

      // Act & Assert
      expect(() => {
        deciderFn({ ctx, state, command: unknownCommand as TestCommand })
      }).toThrow('No decider found for type: unknown')
    })

    test('passes deps to decider', () => {
      // Arrange
      const localDecider: EventDecider<TestState, TestCommand, TestEvent> = {
        create: ({ command }) => ({
          type: 'created',
          id: command.id,
          payload: { value: command.payload.value }
        }),
        update: ({ command }) => ({
          type: 'updated',
          id: command.id,
          payload: { value: command.payload.value }
        }),
        deactivate: ({ command }) => ({
          type: 'deactivated',
          id: command.id
        })
      }
      const deciderFn = mapToEventDeciderFn<TestState, TestCommand, TestEvent>(localDecider)
      const command: TestCommand = {
        type: 'create',
        id: { type: 'test', value: '3' },
        payload: { value: 5 }
      }
      const state: TestState = { type: 'inactive', id: { type: 'test', value: '3' }, value: 0 }
      const ctx = { timestamp: new Date() }

      // Act
      const event = deciderFn({ ctx, state, command })

      // Assert
      expect(event).toEqual({
        type: 'created',
        id: { type: 'test', value: '3' },
        payload: { value: 5 }
      })
    })
  })
})
