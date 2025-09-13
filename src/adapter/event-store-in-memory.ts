import type { EventStore } from '../types/adapter'
import type { AggregateId, DomainEvent, ExtendedDomainEvent, Snapshot, State } from '../types/core'

export class EventStoreInMemory implements EventStore {
  constructor(
    public events: ExtendedDomainEvent<DomainEvent>[] = [],
    public snapshots: Snapshot<State>[] = []
  ) {}

  async getEvents<E extends DomainEvent>(
    aggregateId: AggregateId,
    fromVersion = 0
  ): Promise<ExtendedDomainEvent<E>[]> {
    const events = this.events.filter(
      e =>
        e.id.type === aggregateId.type &&
        e.id.value === aggregateId.value &&
        e.version >= fromVersion
    )
    return events as ExtendedDomainEvent<E>[]
  }

  async getLastEventVersion(aggregateId: AggregateId): Promise<number> {
    let maxVersion = 0
    for (const event of this.events) {
      if (event.id.type === aggregateId.type && event.id.value === aggregateId.value) {
        maxVersion = Math.max(maxVersion, event.version)
      }
    }
    return maxVersion
  }

  async saveEvent<E extends DomainEvent>(event: ExtendedDomainEvent<E>): Promise<void> {
    this.events.push(event)
  }

  async getSnapshot<S extends State>(aggregateId: AggregateId): Promise<Snapshot<S> | null> {
    const snapshot = this.snapshots
      .filter(s => s.id.type === aggregateId.type && s.id.value === aggregateId.value)
      .sort((a, b) => b.version - a.version)[0]

    return (snapshot as Snapshot<S>) ?? null
  }

  async saveSnapshot<S extends State>(snapshot: Snapshot<S>): Promise<void> {
    this.snapshots.push(snapshot)
  }
}
