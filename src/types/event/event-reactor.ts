import type { Command, DomainEvent, ReadModel } from '../core'
import type { PolicyFn } from './policy-fn'
import type { ProjectionFn } from './projection-fn'

export type EventReactor<C extends Command, E extends DomainEvent, RM extends ReadModel> = {
  type: C['id']['type']
  policy: PolicyFn<E, C>
  projection: ProjectionFn<E, RM>
}

// biome-ignore lint: To enable a generic EventReactor type for utility and type inference purposes.
export type AnyEventReactor = EventReactor<any, any, any>
