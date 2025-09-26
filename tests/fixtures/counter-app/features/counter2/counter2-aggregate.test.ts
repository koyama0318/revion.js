import { describe, expect, test } from 'bun:test'
import { zeroId } from '../../../../../src/command/helpers/aggregate-id'
import { aggregateFixture } from '../../../../../src/fake/aggregate-fixture'
import { counter2 } from './counter2-aggregate'

describe('[fixtures] counter2 app', () => {
  const counterId = zeroId('counter')

  describe('counter2 aggregate: create command', () => {
    test('handles create command and creates counter', () => {
      aggregateFixture(counter2)
        .when({
          type: 'create',
          id: counterId,
          payload: { count: 0 }
        })
        .then(fixture => {
          fixture.assert(ctx => {
            expect(ctx.error).toBeNull()
            expect(ctx.state.before.count).toBeUndefined()
            expect(ctx.state.after.type).toBe('active')
            expect(ctx.state.after.count).toBe(0)
            expect(ctx.state.after.version).toBe(1)

            expect(ctx.events.all.length).toBe(1)
            expect(ctx.events.all[0]?.type).toBe('created')

            expect(ctx.version.diff).toBe(1)
            expect(ctx.version.latest).toBe(1)
          })
        })
    })

    test('handles create command and throws error when counter already exists', () => {
      aggregateFixture(counter2)
        .given({
          type: 'created',
          id: counterId,
          payload: { count: 5 }
        })
        .when({
          type: 'create',
          id: counterId,
          payload: { count: 0 }
        })
        .then(fixture => {
          fixture.assert(ctx => {
            expect(ctx.error).not.toBeNull()
            expect(ctx.error?.code).toContain('COMMAND_NOT_ACCEPTED')
            expect(ctx.state.after.count).toBeUndefined()
            expect(ctx.events.after.length).toBe(0)
          })
        })
    })
  })

  describe('counter2 aggregate: increment command', () => {
    test('handles increment command and increments counter', () => {
      aggregateFixture(counter2)
        .given({ type: 'created', id: counterId, payload: { count: 1 } })
        .when({ type: 'increment', id: counterId })
        .then(fixture => {
          fixture.assert(ctx => {
            expect(ctx.error).toBeNull()
            expect(ctx.state.before.count).toBe(1)
            expect(ctx.state.after.type).toBe('active')
            expect(ctx.state.after.count).toBe(2)

            expect(ctx.events.all.length).toBe(2)
            expect(ctx.events.all[0]?.type).toBe('created')
            expect(ctx.events.all[1]?.type).toBe('incremented')

            expect(ctx.version.diff).toBe(1)
            expect(ctx.version.latest).toBe(2)
          })
        })
    })

    test('handles increment command and increments counter after multiple events', () => {
      aggregateFixture(counter2)
        .givenMany([
          { type: 'created', id: counterId, payload: { count: 1 } },
          { type: 'incremented', id: counterId }
        ])
        .when({ type: 'increment', id: counterId })
        .then(fixture => {
          fixture.assert(ctx => {
            expect(ctx.error).toBeNull()
            expect(ctx.state.before.count).toBe(2)
            expect(ctx.state.after.type).toBe('active')
            expect(ctx.state.after.count).toBe(3)

            expect(ctx.events.all.length).toBe(3)
            expect(ctx.events.all[0]?.type).toBe('created')
            expect(ctx.events.all[1]?.type).toBe('incremented')
            expect(ctx.events.all[2]?.type).toBe('incremented')

            expect(ctx.version.diff).toBe(1)
            expect(ctx.version.latest).toBe(3)
          })
        })
    })
  })

  describe('counter2 aggregate: decrement command', () => {
    test('handles decrement command and decrements counter', () => {
      aggregateFixture(counter2)
        .given({ type: 'created', id: counterId, payload: { count: 5 } })
        .whenMany([{ type: 'decrement', id: counterId }])
        .then(fixture => {
          fixture.assert(ctx => {
            expect(ctx.error).toBeNull()
            expect(ctx.state.before.count).toBe(5)
            expect(ctx.state.after.type).toBe('active')
            expect(ctx.state.after.count).toBe(4)

            expect(ctx.events.all.length).toBe(2)
            expect(ctx.events.all[0]?.type).toBe('created')
            expect(ctx.events.all[1]?.type).toBe('decremented')

            expect(ctx.version.diff).toBe(1)
            expect(ctx.version.latest).toBe(2)
          })
        })
    })
  })
})
