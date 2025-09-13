import { describe, expect, test } from 'bun:test'
import { createAggregate, fromReducer } from '../../src/command/aggregate-builder'
import type { DeciderMap, EventDecider, Reducer, ReducerMap } from '../../src/types/command'
import type { AggregateId } from '../../src/types/core'

// Test types
type TestState = {
  type: 'active' | 'inactive'
  id: AggregateId<'test'>
  value: number
}

type TestCommand =
  | { type: 'create'; id: AggregateId<'test'>; payload: { value: number } }
  | { type: 'update'; id: AggregateId<'test'>; payload: { value: number } }
  | { type: 'deactivate'; id: AggregateId<'test'> }

type TestEvent =
  | { type: 'created'; id: AggregateId<'test'>; payload: { value: number } }
  | { type: 'updated'; id: AggregateId<'test'>; payload: { value: number } }
  | { type: 'deactivated'; id: AggregateId<'test'> }

// Test fixtures
const testId = (id: string): AggregateId<'test'> => ({ type: 'test', value: id })

const testDecider: EventDecider<TestState, TestCommand, TestEvent> = {
  create: ({ command }) => ({ type: 'created', id: command.id, payload: command.payload }),
  update: ({ command }) => ({ type: 'updated', id: command.id, payload: command.payload }),
  deactivate: ({ command }) => ({ type: 'deactivated', id: command.id })
}

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

describe('[command] aggregate builder', () => {
  describe('createAggregate', () => {
    test('creates aggregate builder instance', () => {
      // Arrange & Act
      const builder = createAggregate<TestState, TestCommand, TestEvent>()

      // Assert
      expect(builder).toBeDefined()
      expect(typeof builder.type).toBe('function')
    })
  })

  describe('aggregate building and functionality', () => {
    test('builds functioning aggregate with basic configuration', () => {
      // Arrange & Act
      const aggregate = createAggregate<TestState, TestCommand, TestEvent>()
        .type('test')
        .decider(testDecider)
        .reducer(testReducer)
        .build()

      // Assert
      expect(aggregate).toBeDefined()
      expect(aggregate.type).toBe('test')
      expect(typeof aggregate.acceptsCommand).toBe('function')
      expect(typeof aggregate.acceptsEvent).toBe('function')
      expect(typeof aggregate.decider).toBe('function')
      expect(typeof aggregate.reducer).toBe('function')
    })

    test('builds functioning aggregate with decider and reducer maps', () => {
      // Arrange
      const deciderMap: DeciderMap<TestState, TestCommand> = {
        create: [],
        update: ['active'],
        deactivate: ['active', 'inactive']
      }

      const reducerMap: ReducerMap<TestState, TestEvent> = {
        created: [],
        updated: ['active'],
        deactivated: ['active', 'inactive']
      }

      // Act
      const aggregate = createAggregate<TestState, TestCommand, TestEvent>()
        .type('test')
        .deciderWithMap(testDecider, deciderMap)
        .reducerWithMap(testReducer, reducerMap)
        .build()

      // Assert
      expect(aggregate.type).toBe('test')
      expect(typeof aggregate.decider).toBe('function')
      expect(typeof aggregate.reducer).toBe('function')
    })

    test('builds functioning aggregate with decider map and reducer', () => {
      // Arrange
      const deciderMap: DeciderMap<TestState, TestCommand> = {
        create: [],
        update: ['active'],
        deactivate: ['active', 'inactive']
      }

      // Act
      const aggregate = createAggregate<TestState, TestCommand, TestEvent>()
        .type('test')
        .deciderWithMap(testDecider, deciderMap)
        .reducer(testReducer)
        .build()

      // Assert
      expect(aggregate.type).toBe('test')
      expect(typeof aggregate.decider).toBe('function')
      expect(typeof aggregate.reducer).toBe('function')
    })

    test('builds functioning aggregate with decider and reducer map', () => {
      // Arrange
      const reducerMap: ReducerMap<TestState, TestEvent> = {
        created: [],
        updated: ['active'],
        deactivated: ['active', 'inactive']
      }

      // Act
      const aggregate = createAggregate<TestState, TestCommand, TestEvent>()
        .type('test')
        .decider(testDecider)
        .reducerWithMap(testReducer, reducerMap)
        .build()

      // Assert
      expect(aggregate.type).toBe('test')
      expect(typeof aggregate.decider).toBe('function')
      expect(typeof aggregate.reducer).toBe('function')
    })

    test('created aggregate processes commands correctly', () => {
      // Arrange
      const aggregate = createAggregate<TestState, TestCommand, TestEvent>()
        .type('test')
        .decider(testDecider)
        .reducer(testReducer)
        .build()

      const command: TestCommand = {
        type: 'create',
        id: testId('123'),
        payload: { value: 42 }
      }

      const mockState = { type: 'active' as const, id: testId('123'), value: 0 }
      const ctx = { timestamp: new Date() }

      // Act
      const event = aggregate.decider({ ctx, state: mockState, command })

      // Assert
      expect(event).toBeDefined()
      expect(event.id).toEqual(testId('123'))
      expect(event.type).toBe('created')
      if (event.type === 'created') {
        expect(event.payload).toEqual({ value: 42 })
      }
    })

    test('created aggregate processes events correctly', () => {
      // Arrange
      const aggregate = createAggregate<TestState, TestCommand, TestEvent>()
        .type('test')
        .decider(testDecider)
        .reducer(testReducer)
        .build()

      const event: TestEvent = {
        type: 'created',
        id: testId('123'),
        payload: { value: 42 }
      }

      const initialState = { type: 'inactive' as const, id: testId('123'), value: 0 }
      const ctx = { timestamp: new Date() }

      // Act
      const newState = aggregate.reducer({ ctx, state: initialState, event })

      // Assert
      expect(newState).toBeDefined()
      expect(newState.type).toBe('active')
      expect(newState.value).toBe(42)
    })

    test('preserves state immutability in reducer', () => {
      // Arrange
      const aggregate = createAggregate<TestState, TestCommand, TestEvent>()
        .type('test')
        .decider(testDecider)
        .reducer(testReducer)
        .build()

      const event: TestEvent = {
        type: 'updated',
        id: testId('immutable'),
        payload: { value: 500 }
      }

      const originalState = { type: 'active' as const, id: testId('immutable'), value: 100 }
      const ctx = { timestamp: new Date() }

      // Act
      const newState = aggregate.reducer({ ctx, state: originalState, event })

      // Assert - Original state should remain unchanged
      expect(originalState.value).toBe(100)
      // New state should have updated value
      expect(newState.value).toBe(500)
      // But they should be different objects
      expect(newState).not.toBe(originalState)
    })
  })

  describe('fromReducer utility', () => {
    test('converts Reducer object to ReducerFn', () => {
      // Arrange & Act
      const reducerFn = fromReducer<TestState, TestEvent>(testReducer)

      // Assert
      expect(typeof reducerFn).toBe('function')
    })

    test('converted ReducerFn processes events correctly', () => {
      // Arrange
      const reducerFn = fromReducer<TestState, TestEvent>(testReducer)

      const event: TestEvent = {
        type: 'created',
        id: testId('456'),
        payload: { value: 100 }
      }

      const state = { type: 'inactive' as const, id: testId('456'), value: 0 }
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
      const reducerFn = fromReducer<TestState, TestEvent>(testReducer)

      const updateEvent: TestEvent = {
        type: 'updated',
        id: testId('789'),
        payload: { value: 200 }
      }

      const state = { type: 'active' as const, id: testId('789'), value: 50 }
      const ctx = { timestamp: new Date() }

      // Act
      const result = reducerFn({ ctx, state, event: updateEvent })

      // Assert
      expect(result).toBeDefined()
      expect(result.value).toBe(200)
    })

    test('throws error for unknown event type', () => {
      // Arrange
      const reducerFn = fromReducer<TestState, TestEvent>(testReducer)

      const unknownEvent = {
        type: 'unknown',
        id: testId('error')
      }

      const state = { type: 'active' as const, id: testId('error'), value: 0 }
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

      const reducerFn = fromReducer<TestState, TestEvent>(replacingReducer)

      const event: TestEvent = {
        type: 'created',
        id: testId('replace'),
        payload: { value: 300 }
      }

      const state = { type: 'inactive' as const, id: testId('old'), value: 0 }
      const ctx = { timestamp: new Date() }

      // Act
      const result = reducerFn({ ctx, state, event })

      // Assert
      expect(result).toBeDefined()
      expect(result.type).toBe('active')
      expect(result.value).toBe(300)
      expect(result.id).toEqual(testId('replace'))
    })
  })
})
