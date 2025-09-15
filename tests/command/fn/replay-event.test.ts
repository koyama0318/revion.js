import { describe, expect, test } from 'bun:test'
import { EventStoreInMemory } from '../../../src/adapter/event-store-in-memory'
import { createReplayEventFnFactory } from '../../../src/command/fn/replay-event'
import { zeroId } from '../../../src/command/helpers/aggregate-id'
import type { AggregateId } from '../../../src/types/core'
import { counter, counter2 } from '../../fixtures'
import type { CounterState } from '../../fixtures/counter-app/features/counter/types'

describe('[command] replay event function', () => {
  describe('createReplayEventFnFactory', () => {
    test('should return a function when counter aggregate is provided', () => {
      // Act
      const eventStore = new EventStoreInMemory()
      const replayEventFn = createReplayEventFnFactory(counter.reducer)(eventStore)

      // Assert
      expect(replayEventFn).toBeDefined()
    })

    test('should return a function when counter2 aggregate is provided', () => {
      // Act
      const eventStore = new EventStoreInMemory()
      const replayEventFn = createReplayEventFnFactory(counter2.reducer)(eventStore)

      // Assert
      expect(replayEventFn).toBeDefined()
    })
  })

  describe('ReplayEventFn', () => {
    test('should return a result with the state when the event is found', async () => {
      // Arrange
      const eventStore = new EventStoreInMemory()
      const replayEventFn = createReplayEventFnFactory(counter.reducer)(eventStore)

      // Act
      const id = zeroId('counter')
      await eventStore.saveEvent({
        type: 'created',
        id,
        payload: { count: 0 },
        version: 1,
        timestamp: new Date()
      })
      const state = await replayEventFn(id)

      // Assert
      expect(state.ok).toBe(true)
      if (state.ok) {
        expect(state.value).toEqual({
          type: 'active',
          id,
          count: 0,
          version: 1
        })
      }
    })

    test('should return a result with the state when the event and snapshot is found', async () => {
      // Arrange
      const eventStore = new EventStoreInMemory()
      const replayEventFn = createReplayEventFnFactory(counter.reducer)(eventStore)

      // Act
      const id = zeroId('counter')
      await eventStore.saveEvent({
        type: 'created',
        id,
        payload: { count: 0 },
        version: 1,
        timestamp: new Date()
      })
      await eventStore.saveSnapshot({
        type: 'active',
        id,
        count: 0,
        version: 1,
        timestamp: new Date()
      })
      const state = await replayEventFn(id)

      // Assert
      expect(state.ok).toBe(true)
      if (state.ok) {
        expect(state.value).toEqual({
          type: 'active',
          id,
          count: 0,
          version: 1
        })
      }
    })

    test('should return a error when the snapshot can not be loaded', async () => {
      // Arrange
      const eventStore = new EventStoreInMemory()
      eventStore.getSnapshot = async () => {
        throw new Error('error')
      }
      const replayEventFn = createReplayEventFnFactory(counter.reducer)(eventStore)

      // Act
      const id = zeroId('counter')
      await eventStore.saveEvent({
        type: 'created',
        id,
        payload: { count: 0 },
        version: 1,
        timestamp: new Date()
      })
      const state = await replayEventFn(id)

      // Assert
      expect(state.ok).toBe(false)
      if (!state.ok) {
        expect(state.error).toBeDefined()
        expect(state.error.code).toBe('SNAPSHOT_CANNOT_BE_LOADED')
      }
    })

    test('should return a error when the events can not be loaded', async () => {
      // Arrange
      const eventStore = new EventStoreInMemory()
      eventStore.getEvents = async () => {
        throw new Error('error')
      }
      const replayEventFn = createReplayEventFnFactory(counter.reducer)(eventStore)

      // Act
      const id = zeroId('counter')
      const state = await replayEventFn(id)

      // Assert
      expect(state.ok).toBe(false)
      if (!state.ok) {
        expect(state.error).toBeDefined()
        expect(state.error.code).toBe('EVENTS_CANNOT_BE_LOADED')
      }
    })
  })

  test('should return a error when no events are stored', async () => {
    // Arrange
    const eventStore = new EventStoreInMemory()
    const replayEventFn = createReplayEventFnFactory(counter.reducer)(eventStore)

    // Act
    const id = zeroId('counter')
    const state = await replayEventFn(id)

    // Assert
    expect(state.ok).toBe(false)
    if (!state.ok) {
      expect(state.error).toBeDefined()
      expect(state.error.code).toBe('NO_EVENTS_STORED')
    }
  })

  test('should return a error when the reducer returns void', async () => {
    // Arrange
    const eventStore = new EventStoreInMemory()
    const reducer = (_: unknown): CounterState => {
      throw new Error('error')
    }
    const replayEventFn = createReplayEventFnFactory(reducer)(eventStore)

    // Act
    const id = zeroId('counter') as AggregateId<'counter'>
    await eventStore.saveEvent({
      type: 'created',
      id,
      payload: { count: 0 },
      version: 1,
      timestamp: new Date()
    })
    const state = await replayEventFn(id)

    // Assert
    expect(state.ok).toBe(false)
    if (!state.ok) {
      expect(state.error).toBeDefined()
      expect(state.error.code).toBe('REDUCER_RETURNED_VOID')
    }
  })
})
