import { describe, expect, test } from 'bun:test'
import { zeroId } from '../../../src'
import { createInitEventFnFactory } from '../../../src/command/fn/init-event'
import { counter, counter2 } from '../../fixtures'
import type { CounterCommand } from '../../fixtures/counter-app/features/counter/types'

describe('[command] init event', () => {
  describe('createInitEventFnFactory', () => {
    test('should return a function when counter aggregate is provided', () => {
      // Act
      const initEventFn = createInitEventFnFactory(counter.decider, counter.reducer)()

      // Assert
      expect(initEventFn).toBeDefined()
    })

    test('should return a function when counter2 aggregate is provided', () => {
      // Arrange
      const _deps = {
        counterRepository: {
          getCounter: async () => ({ type: 'active' as const, id: zeroId('counter'), count: 0 }),
          saveCounter: async () => {}
        }
      }

      // Act
      const initEventFn = createInitEventFnFactory(counter2.decider, counter2.reducer)()

      // Assert
      expect(initEventFn).toBeDefined()
    })
  })

  describe('InitEventFn', () => {
    test('should return a result with the new state and event when the command is valid', async () => {
      // Arrange
      const applyEventFn = createInitEventFnFactory(counter.decider, counter.reducer)()

      const id = zeroId('counter')
      const command: CounterCommand = {
        type: 'create',
        id,
        payload: { count: 0 }
      }

      // Act
      const res = await applyEventFn(command)

      // Assert
      expect(res).toBeDefined()
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.value.state).toEqual({
          type: 'active',
          id,
          count: 0,
          version: 1
        })
        expect(res.value.event).toEqual({
          type: 'created',
          id,
          payload: { count: 0 },
          version: 1,
          timestamp: expect.any(Date)
        })
      }
    })

    test('should return a result with an error when the event decider returns an error', async () => {
      // Arrange
      const deciderFn = (_: unknown) => {
        throw new Error('error')
      }
      const applyEventFn = createInitEventFnFactory(deciderFn, counter.reducer)()

      const id = zeroId('counter')
      const command: CounterCommand = {
        type: 'create',
        id,
        payload: { count: 0 }
      }

      // Act
      const res = await applyEventFn(command)

      // Assert
      expect(res).toBeDefined()
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).toBeDefined()
        expect(res.error.code).toBe('EVENT_DECIDER_ERROR')
      }
    })

    test('should return a result with an error when the reducer returns an error', async () => {
      // Arrange
      const reducerFn = (_: unknown) => {
        throw new Error('error')
      }
      const applyEventFn = createInitEventFnFactory(counter.decider, reducerFn)()

      const id = zeroId('counter')
      const command: CounterCommand = {
        type: 'create',
        id,
        payload: { count: 0 }
      }

      // Act
      const res = await applyEventFn(command)

      // Assert
      expect(res).toBeDefined()
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).toBeDefined()
        expect(res.error.code).toBe('REDUCER_RETURNED_VOID')
      }
    })

    test('should handle invalid command type for init correctly', async () => {
      // Arrange
      const applyEventFn = createInitEventFnFactory(counter.decider, counter.reducer)()

      const id = zeroId('counter')
      const command: CounterCommand = {
        type: 'increment',
        id
      }

      // Act
      const res = await applyEventFn(command)

      // Assert
      expect(res).toBeDefined()
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.value.event.type).toBe('incremented')
      }
    })
  })
})
