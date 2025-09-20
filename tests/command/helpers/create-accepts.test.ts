import { describe, expect, test } from 'bun:test'
import { zeroId } from '../../../src'
import {
  mapToAcceptsCommandFn,
  mapToAcceptsEventFn
} from '../../../src/command/mapper/map-to-accepts-fn'
import type { EventDeciderMap, ReducerMap } from '../../../src/types/command'
import type { AggregateId } from '../../../src/types/core'

type TestState =
  | { type: 'initial'; id: AggregateId }
  | { type: 'active'; id: AggregateId; value: number }
  | { type: 'inactive'; id: AggregateId }

type TestCommand =
  | { type: 'create'; id: AggregateId; payload: { value: number } }
  | { type: 'update'; id: AggregateId; payload: { value: number } }
  | { type: 'activate'; id: AggregateId }
  | { type: 'deactivate'; id: AggregateId }

type TestEvent =
  | { type: 'created'; id: AggregateId; payload: { value: number } }
  | { type: 'updated'; id: AggregateId; payload: { value: number } }
  | { type: 'activated'; id: AggregateId }
  | { type: 'deactivated'; id: AggregateId }

describe('[command] create accepts function', () => {
  describe('mapToAcceptsCommandFnFn', () => {
    test('accepts all command and state combinations when empty map is provided', () => {
      const emptyMap = {} as EventDeciderMap<TestState, TestCommand>
      const acceptsCommand = mapToAcceptsCommandFn(emptyMap)

      const id = zeroId('test')
      const initialState: TestState = { type: 'initial', id }
      const activeState: TestState = { type: 'active', id, value: 10 }
      const createCommand: TestCommand = { type: 'create', id, payload: { value: 5 } }
      const updateCommand: TestCommand = { type: 'update', id, payload: { value: 15 } }

      // Test with create event type
      expect(acceptsCommand(initialState, createCommand, 'create')).toBe(true)
      expect(acceptsCommand(activeState, createCommand, 'create')).toBe(true)

      // Test with update event type
      expect(acceptsCommand(initialState, updateCommand, 'update')).toBe(true)
      expect(acceptsCommand(activeState, updateCommand, 'update')).toBe(true)
    })

    test('accepts commands with empty array definition for create event type', () => {
      const deciderMap: EventDeciderMap<TestState, TestCommand> = {
        create: [], // create command only allowed during initial creation (no existing state)
        update: ['active'], // update command only accepted in active state
        activate: ['initial'], // activate command only accepted in initial state
        deactivate: ['active'] // deactivate command only accepted in active state
      }

      const acceptsCommand = mapToAcceptsCommandFn(deciderMap)
      const id = zeroId('test')
      const createCommand: TestCommand = { type: 'create', id, payload: { value: 5 } }
      const anyState: TestState = { type: 'active', id, value: 10 }

      // create command has empty array, so it's accepted during creation
      expect(acceptsCommand(anyState, createCommand, 'create')).toBe(true)
    })

    test('rejects commands with state array definition for create event type', () => {
      const deciderMap: EventDeciderMap<TestState, TestCommand> = {
        create: [],
        update: ['active'],
        activate: ['initial'],
        deactivate: ['active']
      }

      const acceptsCommand = mapToAcceptsCommandFn(deciderMap)
      const id = zeroId('test')
      const updateCommand: TestCommand = { type: 'update', id, payload: { value: 15 } }
      const anyState: TestState = { type: 'active', id, value: 10 }

      // update command has state array defined, so it's rejected during creation
      expect(acceptsCommand(anyState, updateCommand, 'create')).toBe(false)
    })

    test('accepts commands in allowed states for update event type', () => {
      const deciderMap: EventDeciderMap<TestState, TestCommand> = {
        create: [],
        update: ['active'],
        activate: ['initial'],
        deactivate: ['active']
      }

      const acceptsCommand = mapToAcceptsCommandFn(deciderMap)
      const id = zeroId('test')
      const activeState: TestState = { type: 'active', id, value: 10 }
      const initialState: TestState = { type: 'initial', id }

      const updateCommand: TestCommand = { type: 'update', id, payload: { value: 15 } }
      const activateCommand: TestCommand = { type: 'activate', id }

      // Commands are allowed in their specified states
      expect(acceptsCommand(activeState, updateCommand, 'update')).toBe(true)
      expect(acceptsCommand(initialState, activateCommand, 'update')).toBe(true)
    })

    test('rejects commands in disallowed states for update event type', () => {
      const deciderMap: EventDeciderMap<TestState, TestCommand> = {
        create: [],
        update: ['active'],
        activate: ['initial'],
        deactivate: ['active']
      }

      const acceptsCommand = mapToAcceptsCommandFn(deciderMap)
      const id = zeroId('test')
      const activeState: TestState = { type: 'active', id, value: 10 }
      const initialState: TestState = { type: 'initial', id }

      const updateCommand: TestCommand = { type: 'update', id, payload: { value: 15 } }
      const activateCommand: TestCommand = { type: 'activate', id }

      // Commands are rejected in non-specified states
      expect(acceptsCommand(initialState, updateCommand, 'update')).toBe(false)
      expect(acceptsCommand(activeState, activateCommand, 'update')).toBe(false)
    })

    test('rejects commands not defined in map for all states and event types', () => {
      const deciderMap: EventDeciderMap<TestState, TestCommand> = {
        create: [],
        update: ['active'],
        activate: ['initial'],
        deactivate: ['active']
      }

      const acceptsCommand = mapToAcceptsCommandFn(deciderMap)
      const id = zeroId('test')
      const unknownCommand = { type: 'unknown', id } as unknown as TestCommand
      const activeState: TestState = { type: 'active', id, value: 10 }

      expect(acceptsCommand(activeState, unknownCommand, 'update')).toBe(false)
      expect(acceptsCommand(activeState, unknownCommand, 'create')).toBe(false)
    })
  })

  describe('mapToAcceptsEventFnFn', () => {
    test('accepts all event and state combinations when empty map is provided', () => {
      const emptyMap = {} as ReducerMap<TestState, TestEvent>
      const acceptsEvent = mapToAcceptsEventFn(emptyMap)

      const id = zeroId('test')
      const initialState: TestState = { type: 'initial', id }
      const activeState: TestState = { type: 'active', id, value: 10 }
      const createdEvent: TestEvent = { type: 'created', id, payload: { value: 5 } }
      const updatedEvent: TestEvent = { type: 'updated', id, payload: { value: 15 } }

      // Test with create event type
      expect(acceptsEvent(initialState, createdEvent, 'create')).toBe(true)
      expect(acceptsEvent(activeState, createdEvent, 'create')).toBe(true)

      // Test with update event type
      expect(acceptsEvent(initialState, updatedEvent, 'update')).toBe(true)
      expect(acceptsEvent(activeState, updatedEvent, 'update')).toBe(true)
    })

    test('accepts events with empty array definition for create event type', () => {
      const reducerMap: ReducerMap<TestState, TestEvent> = {
        created: [], // created event only during initial creation
        updated: ['active'], // updated event only applies to active state
        activated: ['initial'], // activated event only applies to initial state
        deactivated: ['active'] // deactivated event only applies to active state
      }

      const acceptsEvent = mapToAcceptsEventFn(reducerMap)
      const id = zeroId('test')
      const createdEvent: TestEvent = { type: 'created', id, payload: { value: 5 } }
      const anyState: TestState = { type: 'active', id, value: 10 }

      // created event has empty array, so it's accepted during creation
      expect(acceptsEvent(anyState, createdEvent, 'create')).toBe(true)
    })

    test('rejects events with state array definition for create event type', () => {
      const reducerMap: ReducerMap<TestState, TestEvent> = {
        created: [],
        updated: ['active'],
        activated: ['initial'],
        deactivated: ['active']
      }

      const acceptsEvent = mapToAcceptsEventFn(reducerMap)
      const id = zeroId('test')
      const updatedEvent: TestEvent = { type: 'updated', id, payload: { value: 15 } }
      const anyState: TestState = { type: 'active', id, value: 10 }

      // updated event has state array defined, so it's rejected during creation
      expect(acceptsEvent(anyState, updatedEvent, 'create')).toBe(false)
    })

    test('accepts events in allowed states for update event type', () => {
      const reducerMap: ReducerMap<TestState, TestEvent> = {
        created: [],
        updated: ['active'],
        activated: ['initial'],
        deactivated: ['active']
      }

      const acceptsEvent = mapToAcceptsEventFn(reducerMap)
      const id = zeroId('test')
      const activeState: TestState = { type: 'active', id, value: 10 }
      const initialState: TestState = { type: 'initial', id }

      const updatedEvent: TestEvent = { type: 'updated', id, payload: { value: 15 } }
      const activatedEvent: TestEvent = { type: 'activated', id }

      // Events are allowed in their specified states
      expect(acceptsEvent(activeState, updatedEvent, 'update')).toBe(true)
      expect(acceptsEvent(initialState, activatedEvent, 'update')).toBe(true)
    })

    test('rejects events in disallowed states for update event type', () => {
      const reducerMap: ReducerMap<TestState, TestEvent> = {
        created: [],
        updated: ['active'],
        activated: ['initial'],
        deactivated: ['active']
      }

      const acceptsEvent = mapToAcceptsEventFn(reducerMap)
      const id = zeroId('test')
      const activeState: TestState = { type: 'active', id, value: 10 }
      const initialState: TestState = { type: 'initial', id }

      const updatedEvent: TestEvent = { type: 'updated', id, payload: { value: 15 } }
      const activatedEvent: TestEvent = { type: 'activated', id }

      // Events are rejected in non-specified states
      expect(acceptsEvent(initialState, updatedEvent, 'update')).toBe(false)
      expect(acceptsEvent(activeState, activatedEvent, 'update')).toBe(false)
    })

    test('correctly handles state transition patterns', () => {
      const reducerMap: ReducerMap<TestState, TestEvent> = {
        created: [],
        updated: ['active'],
        activated: ['initial'],
        deactivated: ['active']
      }

      const acceptsEvent = mapToAcceptsEventFn(reducerMap)
      const id = zeroId('test')
      const activatedEvent: TestEvent = { type: 'activated', id }
      const deactivatedEvent: TestEvent = { type: 'deactivated', id }

      const initialState: TestState = { type: 'initial', id }
      const activeState: TestState = { type: 'active', id, value: 10 }
      const inactiveState: TestState = { type: 'inactive', id }

      // initial -> active transition
      expect(acceptsEvent(initialState, activatedEvent, 'update')).toBe(true)
      expect(acceptsEvent(activeState, activatedEvent, 'update')).toBe(false)
      expect(acceptsEvent(inactiveState, activatedEvent, 'update')).toBe(false)

      // active -> inactive transition
      expect(acceptsEvent(activeState, deactivatedEvent, 'update')).toBe(true)
      expect(acceptsEvent(initialState, deactivatedEvent, 'update')).toBe(false)
      expect(acceptsEvent(inactiveState, deactivatedEvent, 'update')).toBe(false)
    })

    test('rejects events not defined in map for all states and event types', () => {
      const reducerMap: ReducerMap<TestState, TestEvent> = {
        created: [],
        updated: ['active'],
        activated: ['initial'],
        deactivated: ['active']
      }

      const acceptsEvent = mapToAcceptsEventFn(reducerMap)
      const id = zeroId('test')
      const unknownEvent = { type: 'unknown', id } as unknown as TestEvent
      const activeState: TestState = { type: 'active', id, value: 10 }

      expect(acceptsEvent(activeState, unknownEvent, 'update')).toBe(false)
      expect(acceptsEvent(activeState, unknownEvent, 'create')).toBe(false)
    })

    test('properly handles null and undefined values in map', () => {
      // Arrange - intentionally create map with null and undefined values
      const mapWithNull = {
        created: [],
        updated: null, // intentionally set to null
        activated: undefined, // intentionally set to undefined
        deactivated: ['active'] // Add required property
      } as unknown as ReducerMap<TestState, TestEvent>

      const acceptsEvent = mapToAcceptsEventFn(mapWithNull)
      const id = zeroId('test')
      const activeState: TestState = { type: 'active', id, value: 10 }

      const updatedEvent: TestEvent = { type: 'updated', id, payload: { value: 15 } }
      const activatedEvent: TestEvent = { type: 'activated', id }

      // null/undefined cases are handled properly
      expect(acceptsEvent(activeState, updatedEvent, 'update')).toBe(false)
      expect(acceptsEvent(activeState, activatedEvent, 'update')).toBe(false)
    })
  })
})
