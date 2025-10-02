import { describe, expect, test } from 'bun:test'
import { type Policy, type Projection, type ProjectionMap, zeroId } from '../../../../../src'
import { createEventReactor } from '../../../../../src/event/event-reactor-builder'
import { reactorFixture } from '../../../../../src/fake/event-reactor-fixture'
import { counterReactor } from './counter-reactor'
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
      where: (e: CounterEvent) => ({ by: 'id', operator: 'eq', value: e.id.value })
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

describe('[counter] counter reactor (no Map)', () => {
  const counterId = zeroId('counter')

  test('handles created event and creates counterReadModel', () => {
    reactorFixture(counterReactor)
      .when({
        type: 'created',
        id: counterId,
        payload: { count: 5 },
        version: 1,
        timestamp: new Date()
      })
      .then(fixture => {
        fixture.assert(ctx => {
          expect(ctx.readModel.after['counter']).toBeDefined()

          const counterReadModel = ctx.readModel.after['counter']![counterId.value]
          expect(counterReadModel).toBeDefined()
          expect((counterReadModel as any).count).toBe(5)
        })
      })
  })

  test('handles incremented event and updates counterReadModel', () => {
    const counterReadModel = {
      type: 'counter' as const,
      id: counterId.value,
      count: 3
    }

    reactorFixture(counterReactor)
      .given(counterReadModel)
      .when({
        type: 'incremented',
        id: counterId,
        version: 2,
        timestamp: new Date()
      })
      .then(fixture => {
        fixture.assert(ctx => {
          const updatedReadModel = ctx.readModel.after['counter']![counterId.value]
          expect(updatedReadModel).toBeDefined()
          expect((updatedReadModel as any).count).toBe(4)
        })
      })
  })

  test('handles decremented event and updates counterReadModel', () => {
    const counterReadModel = {
      type: 'counter' as const,
      id: counterId.value,
      count: 7
    }

    reactorFixture(counterReactor)
      .given(counterReadModel)
      .when({
        type: 'decremented',
        id: counterId,
        version: 2,
        timestamp: new Date()
      })
      .then(fixture => {
        fixture.assert(ctx => {
          const updatedReadModel = ctx.readModel.after['counter']![counterId.value]
          expect(updatedReadModel).toBeDefined()
          expect((updatedReadModel as any).count).toBe(6)
        })
      })
  })

  test('handles created event and issues no commands', () => {
    reactorFixture(counterReactor)
      .when({
        type: 'created',
        id: counterId,
        payload: { count: 1 },
        version: 1,
        timestamp: new Date()
      })
      .then(fixture => {
        fixture.assert(ctx => {
          expect(ctx.issuedCommands).toHaveLength(0)
        })
      })
  })

  test('handles mode: create - creates new readModel when none exists', () => {
    const createOnlyReactor = createEventReactor<CounterEvent, CounterCommand, CounterReadModels>()
      .type('counter')
      .policy(policy)
      .projectionWithMap(projection, {
        created: [{ readModel: 'counter', mode: 'create' as const } as any],
        incremented: [{ readModel: 'counter' }],
        decremented: [{ readModel: 'counter' }]
      })
      .build()

    reactorFixture(createOnlyReactor)
      .when({
        type: 'created',
        id: counterId,
        payload: { count: 5 },
        version: 1,
        timestamp: new Date()
      })
      .then(fixture => {
        fixture.assert(ctx => {
          expect(ctx.readModel.after['counter']).toBeDefined()
          const counterReadModel = ctx.readModel.after['counter']![counterId.value]
          expect(counterReadModel).toBeDefined()
          expect((counterReadModel as any).count).toBe(5)
        })
      })
  })

  test('handles mode: upsert - creates new readModel when none exists', () => {
    const upsertReactor = createEventReactor<CounterEvent, CounterCommand, CounterReadModels>()
      .type('counter')
      .policy(policy)
      .projectionWithMap(projection, {
        created: [{ readModel: 'counter', mode: 'upsert' as const } as any],
        incremented: [{ readModel: 'counter' }],
        decremented: [{ readModel: 'counter' }]
      })
      .build()

    reactorFixture(upsertReactor)
      .when({
        type: 'created',
        id: counterId,
        payload: { count: 5 },
        version: 1,
        timestamp: new Date()
      })
      .then(fixture => {
        fixture.assert(ctx => {
          expect(ctx.readModel.after['counter']).toBeDefined()
          const counterReadModel = ctx.readModel.after['counter']![counterId.value]
          expect(counterReadModel).toBeDefined()
          expect((counterReadModel as any).count).toBe(5)
        })
      })
  })
})
