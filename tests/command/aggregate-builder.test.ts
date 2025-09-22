import { describe, expect, test } from 'bun:test'
import { createAggregate } from '../../src/command/aggregate-builder'
import type { EventDecider, EventDeciderMap, Reducer, ReducerMap } from '../../src/types/command'
import type { AggregateId } from '../../src/types/core'

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
      const deciderMap: EventDeciderMap<TestState, TestCommand> = {
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
      const deciderMap: EventDeciderMap<TestState, TestCommand> = {
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

    test('created aggregate processes commands correctly', async () => {
      // Arrange
      const aggregate = createAggregate<TestState, TestCommand, TestEvent>()
        .type('test')
        .decider(testDecider)
        .reducer(testReducer)
        .build()

      const command: TestCommand = {
        type: 'create',
        id: { type: 'test', value: '123' },
        payload: { value: 42 }
      }

      const mockState: TestState = {
        type: 'active' as const,
        id: { type: 'test', value: '123' },
        value: 0
      }
      const ctx = { timestamp: new Date() }

      // Act
      const eventResult = aggregate.decider({ ctx, state: mockState, command })
      const event = await eventResult

      // Assert
      expect(event).toBeDefined()
      expect(event.id).toEqual({ type: 'test', value: '123' })
      expect(event.type).toBe('created')
      if (event.type === 'created') {
        expect(event.payload).toEqual({ value: 42 })
      }
    })

    test('created aggregate processes events correctly', async () => {
      // Arrange
      const aggregate = createAggregate<TestState, TestCommand, TestEvent>()
        .type('test')
        .decider(testDecider)
        .reducer(testReducer)
        .build()

      const event: TestEvent = {
        type: 'created',
        id: { type: 'test', value: '123' },
        payload: { value: 42 }
      }

      const initialState: TestState = {
        type: 'inactive' as const,
        id: { type: 'test', value: '123' },
        value: 0
      }
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
        id: { type: 'test', value: 'immutable' },
        payload: { value: 500 }
      }

      const originalState: TestState = {
        type: 'active' as const,
        id: { type: 'test', value: 'immutable' },
        value: 100
      }
      const ctx = { timestamp: new Date() }

      // Act
      const newState = aggregate.reducer({ ctx, state: originalState, event })

      // Assert
      expect(originalState.value).toBe(100)
      expect(newState.value).toBe(500)
      expect(newState).not.toBe(originalState)
    })
  })
})
