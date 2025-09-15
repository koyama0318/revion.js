import { createAggregate } from '../../../../../src/command/aggregate-builder'
import type {
  EventDecider,
  EventDeciderMap,
  EventDeciderPreparedMap,
  Reducer,
  ReducerMap
} from '../../../../../src/types/command'
import type { Repository } from '../../shared/dependency/repository'
import type { CounterCommand, CounterEvent, CounterState } from './types'

const deciderMap = {
  create: [],
  increment: ['active'],
  decrement: ['active']
} satisfies EventDeciderMap<CounterState, CounterCommand>

const preparedMap = {
  create: async ({ command, deps }) => {
    return {
      counter: await deps.counterRepository.getCounter(command.id.value)
    }
  }
} satisfies EventDeciderPreparedMap<CounterCommand, Repository>

const decider: EventDecider<
  CounterState,
  CounterCommand,
  CounterEvent,
  typeof deciderMap,
  typeof preparedMap
> = {
  create: ({ command, prepared }) => {
    if (prepared.counter) {
      throw new Error('Counter already exists')
    }
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
  .deciderWithMap(decider, deciderMap, preparedMap)
  .reducerWithMap(reducer, reducerMap)
  .build()
