import { describe, expect, test } from 'bun:test'
import { EventStoreInMemory, zeroId } from '../../../src'
import { createSaveEventFnFactory } from '../../../src/command/fn/save-event'
import type { ExtendedDomainEvent, ExtendedState, Snapshot } from '../../../src/types/core'
import type { CounterEvent, CounterState } from '../../fixtures/counter-app/features/counter/types'

describe('[command] save event', () => {
  describe('createSaveEventFnFactory', () => {
    test('should return a function when eventStore is provided', () => {
      // Act
      const eventStore = new EventStoreInMemory()
      const saveEventFn = createSaveEventFnFactory()(eventStore)

      // Assert
      expect(saveEventFn).toBeDefined()
    })
  })

  describe('SaveEventFn', () => {
    test('should return ok when the event is saved', async () => {
      // Arrange
      const eventStore = new EventStoreInMemory()
      const saveEventFn = createSaveEventFnFactory()(eventStore)

      // Act
      const id = zeroId('counter')
      const state: ExtendedState<CounterState> = {
        type: 'active',
        id,
        count: 0,
        version: 1
      }
      const event: ExtendedDomainEvent<CounterEvent> = {
        type: 'created',
        id,
        payload: { count: 0 },
        version: 1,
        timestamp: new Date()
      }
      const res = await saveEventFn(state, event)

      // Assert
      expect(res.ok).toBe(true)
    })

    test('should return ok when the event and shapshot are saved', async () => {
      // Arrange
      const eventStore = new EventStoreInMemory()
      const saveEventFn = createSaveEventFnFactory()(eventStore)

      const id = zeroId('counter')
      const createEvent: ExtendedDomainEvent<CounterEvent> = {
        type: 'created',
        id,
        payload: { count: 0 },
        version: 1,
        timestamp: new Date()
      }
      const incrementEvents: ExtendedDomainEvent<CounterEvent>[] = Array.from(
        { length: 98 },
        (_, i) =>
          ({
            type: 'incremented',
            id,
            version: 2 + i,
            timestamp: new Date()
          }) as ExtendedDomainEvent<CounterEvent>
      )
      const events = [createEvent, ...incrementEvents]
      for (const event of events) {
        await eventStore.saveEvent(event)
      }

      // Act
      const state: ExtendedState<CounterState> = {
        type: 'active',
        id,
        count: 99,
        version: 100
      }
      const event: ExtendedDomainEvent<CounterEvent> = {
        type: 'incremented',
        id,
        version: 100,
        timestamp: new Date()
      }
      const res = await saveEventFn(state, event)
      const snapshot = await eventStore.getSnapshot(id)

      // Assert
      expect(res.ok).toBe(true)
      expect(snapshot).toEqual({
        type: 'active',
        id,
        count: 99,
        version: 100,
        timestamp: expect.any(Date) as Date
      } as Snapshot<CounterState>)
    })

    test('should return error when the snapshot can not be saved', async () => {
      // Arrange
      const eventStore = new EventStoreInMemory()
      eventStore.saveSnapshot = async () => {
        throw new Error('error')
      }
      const saveEventFn = createSaveEventFnFactory()(eventStore)

      const id = zeroId('counter')
      const createEvent: ExtendedDomainEvent<CounterEvent> = {
        type: 'created',
        id,
        payload: { count: 0 },
        version: 1,
        timestamp: new Date()
      }
      const incrementEvents: ExtendedDomainEvent<CounterEvent>[] = Array.from(
        { length: 98 },
        (_, i) =>
          ({
            type: 'incremented',
            id,
            version: 2 + i,
            timestamp: new Date()
          }) as ExtendedDomainEvent<CounterEvent>
      )
      const events = [createEvent, ...incrementEvents]
      for (const event of events) {
        await eventStore.saveEvent(event)
      }

      // Act
      const state: ExtendedState<CounterState> = {
        type: 'active',
        id,
        count: 0,
        version: 100
      }
      const event: ExtendedDomainEvent<CounterEvent> = {
        type: 'incremented',
        id,
        version: 100,
        timestamp: new Date()
      }
      const res = await saveEventFn(state, event)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).toBeDefined()
        expect(res.error.code).toBe('SNAPSHOT_CANNOT_BE_SAVED')
      }
    })

    test('should return error when the state and event versions mismatch', async () => {
      // Arrange
      const eventStore = new EventStoreInMemory()
      const saveEventFn = createSaveEventFnFactory()(eventStore)

      // Act
      const id = zeroId('counter')
      const state: ExtendedState<CounterState> = {
        type: 'active',
        id,
        count: 0,
        version: 0
      }
      const event: ExtendedDomainEvent<CounterEvent> = {
        type: 'created',
        id,
        payload: { count: 0 },
        version: 1,
        timestamp: new Date()
      }
      const res = await saveEventFn(state, event)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).toBeDefined()
        expect(res.error.code).toBe('VERSION_MISMATCH')
      }
    })

    test('should return error when the last event version can not be loaded', async () => {
      // Arrange
      const eventStore = new EventStoreInMemory()
      eventStore.getLastEventVersion = async () => {
        throw new Error('error')
      }
      const saveEventFn = createSaveEventFnFactory()(eventStore)

      // Act
      const id = zeroId('counter')
      const state: ExtendedState<CounterState> = {
        type: 'active',
        id,
        count: 0,
        version: 2
      }
      const event: ExtendedDomainEvent<CounterEvent> = {
        type: 'created',
        id,
        payload: { count: 0 },
        version: 2,
        timestamp: new Date()
      }
      const res = await saveEventFn(state, event)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).toBeDefined()
        expect(res.error.code).toBe('LAST_EVENT_VERSION_CANNOT_BE_LOADED')
      }
    })

    test('should return error when the event version is not the next version', async () => {
      // Arrange
      const eventStore = new EventStoreInMemory()
      const saveEventFn = createSaveEventFnFactory()(eventStore)

      // Act
      const id = zeroId('counter')
      const state: ExtendedState<CounterState> = {
        type: 'active',
        id,
        count: 0,
        version: 2
      }
      const event: ExtendedDomainEvent<CounterEvent> = {
        type: 'created',
        id,
        payload: { count: 0 },
        version: 2,
        timestamp: new Date()
      }
      const res = await saveEventFn(state, event)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).toBeDefined()
        expect(res.error.code).toBe('EVENT_VERSION_CONFLICT')
      }
    })

    test('should return a error when the events can not be loaded', async () => {
      // Arrange
      const eventStore = new EventStoreInMemory()
      eventStore.saveEvent = async () => {
        throw new Error('error')
      }
      const saveEventFn = createSaveEventFnFactory()(eventStore)

      // Act
      const id = zeroId('counter')
      const state: ExtendedState<CounterState> = {
        type: 'active',
        id,
        count: 0,
        version: 1
      }
      const event: ExtendedDomainEvent<CounterEvent> = {
        type: 'created',
        id,
        payload: { count: 0 },
        version: 1,
        timestamp: new Date()
      }
      const res = await saveEventFn(state, event)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).toBeDefined()
        expect(res.error.code).toBe('EVENTS_CANNOT_BE_SAVED')
      }
    })
  })
})
