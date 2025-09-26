import { describe, expect, test } from 'bun:test'
import { zeroId } from '../../../../../src'
import { reactorFixture } from '../../../../../src/fake/event-reactor-fixture'
import { counterReactor } from './counter-reactor'

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
})
