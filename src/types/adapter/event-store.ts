import type { AggregateId } from '../core/aggregate-id'
import type { DomainEvent, ExtendedDomainEvent } from '../core/domain-event'
import type { Snapshot, State } from '../core/state'

export interface EventStore {
  getEvents<E extends DomainEvent>(
    aggregateId: AggregateId,
    fromVersion?: number
  ): Promise<ExtendedDomainEvent<E>[]>
  getLastEventVersion(aggregateId: AggregateId): Promise<number>
  saveEvent<E extends DomainEvent>(event: ExtendedDomainEvent<E>): Promise<void>
  getSnapshot<S extends State>(aggregateId: AggregateId): Promise<Snapshot<S> | null>
  saveSnapshot<S extends State>(snapshot: Snapshot<S>): Promise<void>
}
