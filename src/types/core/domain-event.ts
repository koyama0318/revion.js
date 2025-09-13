import type { AggregateId } from './aggregate-id'

export type DomainEvent<T = unknown> = {
  readonly type: string
  readonly id: AggregateId
  readonly payload?: T
}

export type ExtendedDomainEvent<T extends DomainEvent> = Readonly<T> & {
  readonly version: number
  readonly timestamp: Date
}
