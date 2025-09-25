import { beforeEach, describe, expect, test } from 'bun:test'
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
    let store: EventStoreInMemory
    let aggregateId: AggregateId
    let events: ExtendedDomainEvent<TestEvent>[]
    let snapshots: Snapshot<TestState>[]

    beforeEach(() => {
      aggregateId = { type: 'user', value: '1' }
      events = [
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
      snapshots = [
        {
          type: 'user',
          id: aggregateId,
          name: 'Alice',
          version: 1,
          timestamp: new Date()
        }
      ]
      store = new EventStoreInMemory()
    })

    describe('saveEvent and getEvents', () => {
      test('should save and retrieve events by aggregate id', async () => {
        for (const e of events) {
          await store.saveEvent(e)
        }

        const retrieved = await store.getEvents<TestEvent>(aggregateId)
        expect(retrieved).toHaveLength(2)
        expect(retrieved.map(e => e.version)).toEqual([1, 2])
      })

      test('should filter events by fromVersion', async () => {
        for (const e of events) {
          await store.saveEvent(e)
        }

        const retrieved = await store.getEvents<TestEvent>(aggregateId, 2)
        expect(retrieved).toHaveLength(1)
        expect(retrieved[0].version).toBe(2)
      })

      test('should return empty array if no events for aggregate', async () => {
        const retrieved = await store.getEvents<TestEvent>(aggregateId)
        expect(retrieved).toEqual([])
      })
    })

    describe('getLastEventVersion', () => {
      test('should return 0 when no events exist', async () => {
        const version = await store.getLastEventVersion(aggregateId)
        expect(version).toBe(0)
      })

      test('should return highest version for aggregate', async () => {
        await store.saveEvent(events[0])
        await store.saveEvent(events[1])

        const version = await store.getLastEventVersion(aggregateId)
        expect(version).toBe(2)
      })

      test('should ignore events of other aggregates', async () => {
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
        await store.saveSnapshot(snapshots[0])

        const retrieved = await store.getSnapshot<TestState>(aggregateId)
        expect(retrieved).toEqual(snapshots[0])
      })

      test('should return null if no snapshot exists', async () => {
        const retrieved = await store.getSnapshot<TestState>(aggregateId)
        expect(retrieved).toBeNull()
      })

      test('should return latest snapshot when multiple exist', async () => {
        const newerSnapshot: Snapshot<TestState> = {
          type: 'user',
          id: aggregateId,
          name: 'Alice Updated',
          version: 2,
          timestamp: new Date()
        }

        await store.saveSnapshot(snapshots[0])
        await store.saveSnapshot(newerSnapshot)

        const retrieved = await store.getSnapshot<TestState>(aggregateId)
        expect(retrieved?.version).toBe(2)
      })
    })
  })
})
