import { describe, expect, test } from 'bun:test'
import { zeroId } from '../../../src'
import { createApplyEventFnFactory } from '../../../src/command/fn/apply-event'
import type { ExtendedState } from '../../../src/types/core'
import { counter, counter2 } from '../../fixtures'
import type {
  CounterCommand,
  CounterState
} from '../../fixtures/counter-app/features/counter/types'

describe('[command] apply event function', () => {
  describe('createApplyEventFnFactory', () => {
    test('should return a function when counter aggregate is provided', () => {
      // Act
      const applyEventFn = createApplyEventFnFactory(counter.decider, counter.reducer)()

      // Assert
      expect(applyEventFn).toBeDefined()
    })

    test('should return a function when counter2 aggregate is provided', () => {
      // Act
      const applyEventFn = createApplyEventFnFactory(counter2.decider, counter2.reducer)()

      // Assert
      expect(applyEventFn).toBeDefined()
    })
  })

  describe('ApplyEventFn', () => {
    test('should return a result with the new state and event when the command is valid', () => {
      // Arrange
      const applyEventFn = createApplyEventFnFactory(counter.decider, counter.reducer)()

      const id = zeroId('counter')
      const state: ExtendedState<CounterState> = {
        type: 'active',
        id,
        count: 0,
        version: 0
      }
      const command: CounterCommand = {
        type: 'create',
        id,
        payload: { count: 0 }
      }

      // Act
      const res = applyEventFn(state, command)

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

    test('should return a result with an error when the event decider returns an error', () => {
      // Arrange
      const deciderFn = (_: unknown) => {
        throw new Error('error')
      }
      const applyEventFn = createApplyEventFnFactory(deciderFn, counter.reducer)()

      const id = zeroId('counter')
      const state: ExtendedState<CounterState> = {
        type: 'active',
        id,
        count: 0,
        version: 0
      }
      const command: CounterCommand = {
        type: 'create',
        id,
        payload: { count: 0 }
      }

      // Act
      const res = applyEventFn(state, command)

      // Assert
      expect(res).toBeDefined()
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).toBeDefined()
        expect(res.error.code).toBe('EVENT_DECIDER_ERROR')
      }
    })

    test('should return a result with an error when the reducer returns an error', () => {
      // Arrange
      const reducerFn = (_: unknown) => {
        throw new Error('error')
      }
      const applyEventFn = createApplyEventFnFactory(counter.decider, reducerFn)()

      const id = zeroId('counter')
      const state: ExtendedState<CounterState> = {
        type: 'active',
        id,
        count: 0,
        version: 0
      }
      const command: CounterCommand = {
        type: 'create',
        id,
        payload: { count: 0 }
      }

      // Act
      const res = applyEventFn(state, command)

      // Assert
      expect(res).toBeDefined()
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).toBeDefined()
        expect(res.error.code).toBe('REDUCER_RETURNED_VOID')
      }
    })
  })
})
