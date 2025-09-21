import { createAggregate } from '../../../../../src/command/aggregate-builder'
import type { EventDecider, Reducer } from '../../../../../src/types/command'
import type { CounterCommand, CounterEvent, CounterState } from './types'

const decider: EventDecider<CounterState, CounterCommand, CounterEvent> = {
  create: ({ command, state }) => {
    if (state.type === 'active') {
      throw new Error('Counter already exists')
    }
    return {
      type: 'created',
      id: command.id,
      payload: { count: command.payload.count }
    }
  },
  increment: ({ command, state }) => {
    if (state.type !== 'active') {
      throw new Error('Counter does not exist')
    }
    return {
      type: 'incremented',
      id: command.id
    }
  },
  decrement: ({ command, state }) => {
    if (state.type !== 'active') {
      throw new Error('Counter does not exist')
    }
    return {
      type: 'decremented',
      id: command.id
    }
  }
}

const reducer: Reducer<CounterState, CounterEvent> = {
  created: ({ state, event }) => {
    state.type = 'active'
    state.count = event.payload.count
  },
  incremented: ({ state }) => {
    state.count += 1
  },
  decremented: ({ state }) => {
    state.count -= 1
  }
}

export const counter = createAggregate<CounterState, CounterCommand, CounterEvent>()
  .type('counter')
  .decider(decider)
  .reducer(reducer)
  .build()
