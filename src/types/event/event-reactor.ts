import type { Command, DomainEvent, ReadModel } from '../core'
import type { PolicyFn } from './policy-fn'
import type { ProjectionFn, ProjectionMap } from './projection-fn'

export type EventReactor<E extends DomainEvent, C extends Command, RM extends ReadModel> = {
  type: C['id']['type']
  policy: PolicyFn<E, C>
  projection: ProjectionFn<E, RM>
  projectionMap: ProjectionMap<E, RM>
}

// biome-ignore lint: To enable a generic EventReactor type for utility and type inference purposes.
export type AnyEventReactor = EventReactor<any, any, any>
