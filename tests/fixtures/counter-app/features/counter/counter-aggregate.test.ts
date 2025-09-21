import { describe, expect, test } from 'bun:test'
import { aggregateFixture, zeroId } from '../../../index'
import { counter } from './counter-aggregate'
import { counterReactor } from './counter-reactor'

describe('[fixtures] counter app', () => {
  describe('counter aggregate: create command', () => {
    test('should create a counter when the command is issued', () => {
      aggregateFixture(counter, counterReactor)
        .when({ type: 'create', id: zeroId('counter'), payload: { count: 5 } })
        .then(fixture => {
          fixture.assert(ctx => {
            expect(ctx.error).toBeNull()
            expect(ctx.state.before.count).toBeUndefined()
            expect(ctx.state.after.type).toBe('active')
            expect(ctx.state.after.count).toBe(5)
            expect(ctx.state.after.version).toBe(1)

            expect(ctx.events.all.length).toBe(1)
            expect(ctx.events.all[0]?.type).toBe('created')
            expect(ctx.events.all[0]?.payload.count).toBe(5)

            expect(ctx.version.diff).toBe(1)
            expect(ctx.version.latest).toBe(1)
          })
        })
    })

    test('should return not accepted error when the counter already exists', () => {
      const id = zeroId('counter')
      aggregateFixture(counter, counterReactor)
        .given({ type: 'created', id, payload: { count: 5 } })
        .when({ type: 'create', id, payload: { count: 5 } })
        .then(fixture => {
          fixture.assert(ctx => {
            expect(ctx.error).not.toBeNull()
            expect(ctx.error?.code).toBe('COMMAND_NOT_ACCEPTED')
            expect(ctx.events.all.length).toBe(1)
          })
        })
    })
  })

  describe('counter aggregate: increment command', () => {
    test('should increment the counter when the command is issued', () => {
      const id = zeroId('counter')
      aggregateFixture(counter, counterReactor)
        .given({ type: 'created', id, payload: { count: 5 } })
        .when({ type: 'increment', id })
        .then(fixture => {
          fixture.assert(ctx => {
            expect(ctx.error).toBeNull()
            expect(ctx.state.before.count).toBe(5)
            expect(ctx.state.after.type).toBe('active')
            expect(ctx.state.after.count).toBe(6)

            expect(ctx.events.all.length).toBe(2)
            expect(ctx.events.all[0]?.type).toBe('created')
            expect(ctx.events.all[1]?.type).toBe('incremented')

            expect(ctx.version.diff).toBe(1)
            expect(ctx.version.latest).toBe(2)
          })
        })
    })

    test('should return not accepted error when the counter does not exist', () => {
      const id = zeroId('counter')
      aggregateFixture(counter, counterReactor)
        .when({ type: 'increment', id })
        .then(fixture => {
          fixture.assert(ctx => {
            expect(ctx.error).not.toBeNull()
            expect(ctx.error?.code).toBe('COMMAND_NOT_ACCEPTED')
            expect(ctx.events.all.length).toBe(0)
          })
        })
    })
  })

  describe('counter aggregate: decrement command', () => {
    test('should decrement the counter when the command is issued', () => {
      const id = zeroId('counter')
      aggregateFixture(counter, counterReactor)
        .given({ type: 'created', id, payload: { count: 5 } })
        .whenMany([{ type: 'decrement', id }])
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

  describe('counter aggregate: multiple operations', () => {
    test('should work correctly with multiple operations', () => {
      const id = zeroId('counter')
      aggregateFixture(counter, counterReactor)
        .given({ type: 'created', id, payload: { count: 0 } })
        .whenMany([
          { type: 'increment', id },
          { type: 'increment', id },
          { type: 'decrement', id }
        ])
        .then(fixture => {
          fixture.assert(ctx => {
            expect(ctx.error).toBeNull()
            expect(ctx.state.after.count).toBe(1)

            expect(ctx.events.all.length).toBe(4)
            expect(ctx.events.all[0]?.type).toBe('created')
            expect(ctx.events.all[1]?.type).toBe('incremented')
            expect(ctx.events.all[2]?.type).toBe('incremented')
            expect(ctx.events.all[3]?.type).toBe('decremented')

            expect(ctx.version.diff).toBe(3)
            expect(ctx.version.latest).toBe(4)
          })
        })
    })
  })
})
