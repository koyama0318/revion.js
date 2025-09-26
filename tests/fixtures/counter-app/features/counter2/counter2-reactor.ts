import { createEventReactor } from '../../../../../src/event/event-reactor-builder'
import type { Policy, PolicyMap, Projection, ProjectionMap } from '../../../../../src/types/event'
import type { CounterCommand, CounterEvent, CounterReadModels } from './types'

const policyMap = {
  created: [],
  incremented: [],
  decremented: []
} satisfies PolicyMap<CounterEvent, CounterCommand>

const policy: Policy<CounterEvent, CounterCommand, typeof policyMap> = {
  created: () => null,
  incremented: () => null,
  decremented: () => null
}

const projectionMap = {
  created: [
    { readModel: 'counter' },
    {
      readModel: 'achievement',
      where: (_e: CounterEvent) => ({ by: 'id', operator: 'eq', value: '1' })
    }
  ],
  incremented: [{ readModel: 'counter' }],
  decremented: [{ readModel: 'counter' }]
} satisfies ProjectionMap<CounterEvent, CounterReadModels>

const projection: Projection<CounterEvent, CounterReadModels, typeof projectionMap> = {
  created: {
    counter: ({ event }) => {
      return {
        type: 'counter',
        id: event.id.value,
        count: event.payload.count
      }
    },
    achievement: ({ ctx, event }) => {
      return {
        type: 'achievement',
        id: '1',
        counterId: event.id.value,
        level: 1,
        achievedAt: ctx.timestamp
      }
    }
  },
  incremented: {
    counter: ({ readModel }) => {
      readModel.count += 1
    }
  },
  decremented: {
    counter: ({ readModel }) => {
      readModel.count -= 1
    }
  }
}

export const counterReactor = createEventReactor<CounterEvent, CounterCommand, CounterReadModels>()
  .type('counter')
  .policyWithMap(policy, policyMap)
  .projectionWithMap(projection, projectionMap)
  .build()
