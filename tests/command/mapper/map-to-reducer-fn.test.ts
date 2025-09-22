import { describe, expect, test } from 'bun:test'
import { mapToReducerFn } from '../../../src/command/mapper/map-to-reducer-fn'
import type { Reducer } from '../../../src/types/command'
import type { AggregateId } from '../../../src/types/core'

type TestState =
  | { type: 'active'; id: AggregateId<'test'>; value: number }
  | { type: 'inactive'; id: AggregateId<'test'>; value: number }

type TestEvent =
  | { type: 'created'; id: AggregateId<'test'>; payload: { value: number } }
  | { type: 'updated'; id: AggregateId<'test'>; payload: { value: number } }
  | { type: 'deactivated'; id: AggregateId<'test'> }

const testReducer: Reducer<TestState, TestEvent> = {
  created: ({ state, event }) => {
    state.type = 'active'
    state.id = event.id
    state.value = event.payload.value
  },
  updated: ({ state, event }) => {
    state.value = event.payload.value
  },
  deactivated: ({ state }) => {
    state.type = 'inactive'
    state.value = 0
  }
}

describe('[command] mapToReducerFn', () => {
  test('converts Reducer object to ReducerFn', () => {
    // Arrange & Act
    const reducerFn = mapToReducerFn<TestState, TestEvent>(testReducer)

    // Assert
    expect(typeof reducerFn).toBe('function')
  })

  test('converted ReducerFn processes events correctly', () => {
    // Arrange
    const reducerFn = mapToReducerFn<TestState, TestEvent>(testReducer)

    const event: TestEvent = {
      type: 'created',
      id: { type: 'test', value: '456' },
      payload: { value: 100 }
    }

    const state: TestState = {
      type: 'inactive' as const,
      id: { type: 'test', value: '456' },
      value: 0
    }
    const ctx = { timestamp: new Date() }

    // Act
    const result: TestState = reducerFn({ ctx, state, event })

    // Assert
    expect(result).toBeDefined()
    expect(result.type).toBe('active')
    expect(result.value).toBe(100)
  })

  test('handles different event types correctly', () => {
    // Arrange
    const reducerFn = mapToReducerFn<TestState, TestEvent>(testReducer)

    const updateEvent: TestEvent = {
      type: 'updated',
      id: { type: 'test', value: '789' },
      payload: { value: 200 }
    }

    const state: TestState = {
      type: 'active' as const,
      id: { type: 'test', value: '789' },
      value: 50
    }
    const ctx = { timestamp: new Date() }

    // Act
    const result = reducerFn({ ctx, state, event: updateEvent })

    // Assert
    expect(result).toBeDefined()
    expect(result.value).toBe(200)
  })

  test('throws error for unknown event type', () => {
    // Arrange
    const reducerFn = mapToReducerFn<TestState, TestEvent>(testReducer)

    const unknownEvent = {
      type: 'unknown',
      id: { type: 'test', value: 'error' }
    }

    const state: TestState = {
      type: 'active' as const,
      id: { type: 'test', value: 'error' },
      value: 0
    }
    const ctx = { timestamp: new Date() }

    // Act & Assert
    expect(() => {
      reducerFn({ ctx, state, event: unknownEvent as TestEvent })
    }).toThrow('No reducer found for event type: unknown')
  })

  test('handles reducer that returns new state object', () => {
    // Arrange
    const replacingReducer: Reducer<TestState, TestEvent> = {
      created: ({ event }) => ({
        type: 'active',
        id: event.id,
        value: event.payload.value
      }),
      updated: ({ state, event }) => {
        state.value = event.payload.value
      },
      deactivated: ({ state }) => {
        state.type = 'inactive'
      }
    }

    const reducerFn = mapToReducerFn<TestState, TestEvent>(replacingReducer)

    const event: TestEvent = {
      type: 'created',
      id: { type: 'test', value: 'replace' },
      payload: { value: 300 }
    }

    const state: TestState = {
      type: 'inactive' as const,
      id: { type: 'test', value: 'old' },
      value: 0
    }
    const ctx = { timestamp: new Date() }

    // Act
    const result = reducerFn({ ctx, state, event })

    // Assert
    expect(result).toBeDefined()
    expect(result.type).toBe('active')
    expect(result.value).toBe(300)
    expect(result.id).toEqual({ type: 'test', value: 'replace' })
  })
})
