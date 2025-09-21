import { createEventReactor } from '../../../../../src/event/event-reactor-builder'
import type { Policy, Projection, ProjectionMap } from '../../../../../src/types/event'
import type { CounterCommand, CounterEvent, CounterReadModels } from './types'

const policy: Policy<CounterEvent, CounterCommand> = {
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
    counter: ({ event }) => ({
      type: 'counter',
      id: event.id.value,
      count: event.payload.count
    }),
    achievement: ({ ctx, event }) => ({
      type: 'achievement',
      id: '1',
      counterId: event.id.value,
      level: 1,
      achievedAt: ctx.timestamp
    })
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
  .policy(policy)
  .projectionWithMap(projection, projectionMap)
  .build()
