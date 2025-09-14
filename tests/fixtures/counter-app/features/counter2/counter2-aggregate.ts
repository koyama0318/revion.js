import { createAggregate } from '../../../../../src/command/aggregate-builder'
import type {
  EventDecider,
  EventDeciderMap,
  Reducer,
  ReducerMap
} from '../../../../../src/types/command'
import type { CounterCommand, CounterEvent, CounterState } from './types'

const deciderMap = {
  create: [],
  increment: ['active'],
  decrement: ['active']
} satisfies EventDeciderMap<CounterState, CounterCommand>

const decider: EventDecider<CounterState, CounterCommand, CounterEvent> = {
  create: ({ command }) => {
    return {
      type: 'created',
      id: command.id,
      payload: { count: command.payload.count }
    }
  },
  increment: ({ command }) => {
    return {
      type: 'incremented',
      id: command.id
    }
  },
  decrement: ({ command }) => {
    return {
      type: 'decremented',
      id: command.id
    }
  }
}

const reducerMap = {
  created: [],
  incremented: ['active'],
  decremented: ['active']
} satisfies ReducerMap<CounterState, CounterEvent>

const reducer: Reducer<CounterState, CounterEvent, typeof reducerMap> = {
  created: ({ event }) => {
    return {
      type: 'active',
      id: event.id,
      count: event.payload.count
    }
  },
  incremented: ({ state }) => {
    state.count += 1
  },
  decremented: ({ state }) => {
    state.count -= 1
  }
}

export const counter2 = createAggregate<CounterState, CounterCommand, CounterEvent>()
  .type('counter')
  .deciderWithMap(decider, deciderMap)
  .reducerWithMap(reducer, reducerMap)
  .build()
