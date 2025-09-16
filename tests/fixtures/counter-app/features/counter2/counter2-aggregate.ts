import { createAggregate } from '../../../../../src/command/aggregate-builder'
import type {
  EventDecider,
  EventDeciderMap,
  Reducer,
  ReducerMap
} from '../../../../../src/types/command'
import type { CounterCommand, CounterEvent, CounterId, CounterState } from './types'

type CounterRepository = {
  getCounter(id: CounterId): Promise<CounterState>
  saveCounter(counter: CounterState): Promise<void>
}

const deciderMap = {
  create: [],
  increment: ['active'],
  decrement: ['active']
} satisfies EventDeciderMap<CounterState, CounterCommand>

type Deps = {
  counterRepository: CounterRepository
}

const decider: EventDecider<CounterState, CounterCommand, CounterEvent, Deps, typeof deciderMap> = {
  create: async ({ command, deps }) => {
    const counter = await deps.counterRepository.getCounter(command.id)
    if (counter) {
      throw new Error(`Counter with id ${command.id.value} already exists`)
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

export const counter2 = createAggregate<CounterState, CounterCommand, CounterEvent, Deps>()
  .type('counter')
  .deciderWithMap(decider, deciderMap)
  .reducerWithMap(reducer, reducerMap)
  .build()
