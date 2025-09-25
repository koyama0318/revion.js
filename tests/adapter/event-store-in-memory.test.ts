import { describe, expect, test } from 'bun:test'
import { EventStoreInMemory } from '../../src/adapter/event-store-in-memory'
import type {
  AggregateId,
  DomainEvent,
  ExtendedDomainEvent,
  Snapshot,
  State
} from '../../src/types/core'

interface TestEvent extends DomainEvent {
  type: 'UserCreated' | 'UserUpdated'
  payload: { name: string }
}

interface TestState extends State {
  type: 'user'
  name: string
  version: number
}

describe('[adapter] event store in memory', () => {
  describe('EventStoreInMemory', () => {
    describe('saveEvent and getEvents', () => {
      test('should save and retrieve events by aggregate id', async () => {
        const store = new EventStoreInMemory()
        const aggregateId: AggregateId = { type: 'user', value: '1' }
        const events: ExtendedDomainEvent<TestEvent>[] = [
          {
            id: aggregateId,
            type: 'UserCreated',
            payload: { name: 'Alice' },
            version: 1,
            timestamp: new Date()
          },
          {
            id: aggregateId,
            type: 'UserUpdated',
            payload: { name: 'Alice Updated' },
            version: 2,
            timestamp: new Date()
          }
        ]

        for (const e of events) {
          await store.saveEvent(e)
        }

        const retrieved = await store.getEvents<TestEvent>(aggregateId)
        expect(retrieved).toHaveLength(2)
        expect(retrieved.map(e => e.version)).toEqual([1, 2])
      })

      test('should filter events by fromVersion', async () => {
        const store = new EventStoreInMemory()
        const aggregateId: AggregateId = { type: 'user', value: '1' }
        const events: ExtendedDomainEvent<TestEvent>[] = [
          {
            id: aggregateId,
            type: 'UserCreated',
            payload: { name: 'Alice' },
            version: 1,
            timestamp: new Date()
          },
          {
            id: aggregateId,
            type: 'UserUpdated',
            payload: { name: 'Alice Updated' },
            version: 2,
            timestamp: new Date()
          }
        ]

        for (const e of events) {
          await store.saveEvent(e)
        }

        const retrieved = await store.getEvents<TestEvent>(aggregateId, 2)
        expect(retrieved).toHaveLength(1)
        expect(retrieved[0].version).toBe(2)
      })

      test('should return empty array if no events for aggregate', async () => {
        const store = new EventStoreInMemory()
        const aggregateId: AggregateId = { type: 'user', value: '1' }

        const retrieved = await store.getEvents<TestEvent>(aggregateId)

        expect(retrieved).toEqual([])
      })
    })

    describe('getLastEventVersion', () => {
      test('should return 0 when no events exist', async () => {
        const store = new EventStoreInMemory()
        const aggregateId: AggregateId = { type: 'user', value: '1' }

        const version = await store.getLastEventVersion(aggregateId)

        expect(version).toBe(0)
      })

      test('should return highest version for aggregate', async () => {
        const store = new EventStoreInMemory()
        const aggregateId: AggregateId = { type: 'user', value: '1' }
        const events: ExtendedDomainEvent<TestEvent>[] = [
          {
            id: aggregateId,
            type: 'UserCreated',
            payload: { name: 'Alice' },
            version: 1,
            timestamp: new Date()
          },
          {
            id: aggregateId,
            type: 'UserUpdated',
            payload: { name: 'Alice Updated' },
            version: 2,
            timestamp: new Date()
          }
        ]

        await store.saveEvent(events[0])
        await store.saveEvent(events[1])

        const version = await store.getLastEventVersion(aggregateId)
        expect(version).toBe(2)
      })

      test('should ignore events of other aggregates', async () => {
        const store = new EventStoreInMemory()
        const aggregateId: AggregateId = { type: 'user', value: '1' }

        await store.saveEvent({
          id: { type: 'user', value: '2' },
          type: 'UserCreated',
          payload: { name: 'Bob' },
          version: 5,
          timestamp: new Date()
        })

        const version = await store.getLastEventVersion(aggregateId)
        expect(version).toBe(0)
      })
    })

    describe('saveSnapshot and getSnapshot', () => {
      test('should save and retrieve latest snapshot', async () => {
        const store = new EventStoreInMemory()
        const aggregateId: AggregateId = { type: 'user', value: '1' }
        const snapshot: Snapshot<TestState> = {
          type: 'user',
          id: aggregateId,
          name: 'Alice',
          version: 1,
          timestamp: new Date()
        }

        await store.saveSnapshot(snapshot)

        const retrieved = await store.getSnapshot<TestState>(aggregateId)
        expect(retrieved).toEqual(snapshot)
      })

      test('should return null if no snapshot exists', async () => {
        const store = new EventStoreInMemory()
        const aggregateId: AggregateId = { type: 'user', value: '1' }

        const retrieved = await store.getSnapshot<TestState>(aggregateId)

        expect(retrieved).toBeNull()
      })

      test('should return latest snapshot when multiple exist', async () => {
        const store = new EventStoreInMemory()
        const aggregateId: AggregateId = { type: 'user', value: '1' }
        const snapshot: Snapshot<TestState> = {
          type: 'user',
          id: aggregateId,
          name: 'Alice',
          version: 1,
          timestamp: new Date()
        }
        const newerSnapshot: Snapshot<TestState> = {
          type: 'user',
          id: aggregateId,
          name: 'Alice Updated',
          version: 2,
          timestamp: new Date()
        }

        await store.saveSnapshot(snapshot)
        await store.saveSnapshot(newerSnapshot)

        const retrieved = await store.getSnapshot<TestState>(aggregateId)
        expect(retrieved?.version).toBe(2)
      })
    })
  })
})
