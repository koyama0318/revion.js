import { describe, expect, test } from 'bun:test'
import { aggregateFixture, zeroId } from '../../../index'
import { counter2 } from './counter2-aggregate'
import { counterReactor2 } from './counter2-reactor'
import type { CounterCommandDeps } from './counter2-dependency'
import type { CounterState } from './types'

// Mock counter repository for testing
const createMockCounterRepository = (): CounterCommandDeps['counterRepository'] => {
  const storage = new Map<string, CounterState>()

  return {
    async getCounter(id) {
      return storage.get(id.value) || null
    },
    async saveCounter(counter) {
      storage.set(counter.id.value, counter)
    }
  }
}

describe('[fixtures] counter app 2', () => {
  describe('counter aggregate: create command', () => {
    test('should create a counter when the command is issued', () => {
      const deps: CounterCommandDeps = {
        counterRepository: createMockCounterRepository()
      }

      aggregateFixture(counter2, counterReactor2, deps)
        .when({ type: 'create', id: zeroId('counter'), payload: { count: 0 } })
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

    test('should return not accepted error when the counter already exists', () => {
      const id = zeroId('counter')
      const counterRepository = createMockCounterRepository()

      // Pre-populate the repository with an existing counter
      counterRepository.saveCounter({
        type: 'active',
        id: id,
        count: 0
      } as CounterState)

      const deps: CounterCommandDeps = {
        counterRepository
      }

      aggregateFixture(counter2, counterReactor2, deps)
        .given({ type: 'created', id, payload: { count: 0 } })
        .when({ type: 'create', id, payload: { count: 0 } })
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
      const deps: CounterCommandDeps = {
        counterRepository: createMockCounterRepository()
      }

      aggregateFixture(counter2, counterReactor2, deps)
        .given({ type: 'created', id, payload: { count: 1 } })
        .when({ type: 'increment', id })
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

    test('should increment the counter after the second state is created', () => {
      const id = zeroId('counter')
      const deps: CounterCommandDeps = {
        counterRepository: createMockCounterRepository()
      }

      aggregateFixture(counter2, counterReactor2, deps)
        .givenMany([
          { type: 'created', id, payload: { count: 1 } },
          { type: 'incremented', id }
        ])
        .when({ type: 'increment', id })
        .then(fixture => {
          fixture.assert(ctx => {
            expect(ctx.error).toBeNull()
            expect(ctx.state.before.count).toBe(2)
            expect(ctx.state.after.type).toBe('active')
            expect(ctx.state.after.count).toBe(3)
            expect(ctx.state.after.version).toBe(3)

            expect(ctx.events.all.length).toBe(3)
            expect(ctx.events.all[0]?.type).toBe('created')
            expect(ctx.events.all[1]?.type).toBe('incremented')
            expect(ctx.events.all[2]?.type).toBe('incremented')

            expect(ctx.version.diff).toBe(1)
            expect(ctx.version.latest).toBe(3)
          })
        })
    })

    test('should return not accepted error when the counter does not exist', () => {
      const id = zeroId('counter')
      aggregateFixture(counter2, counterReactor2)
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
      aggregateFixture(counter2, counterReactor2)
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
})
