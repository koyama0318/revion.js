import type { Command, DomainEvent, State } from '../core'
import type { AcceptsCommandFn, AcceptsEventFn } from './accepts-fn'
import type { EventDeciderFn } from './event-decider-fn'
import type { PrepareDepsFn } from './prepare-deps-fn'
import type { ReducerFn } from './reducer-fn'

export type Aggregate<S extends State, C extends Command, E extends DomainEvent> = {
  type: S['id']['type']
  acceptsCommand: AcceptsCommandFn<S, C>
  acceptsEvent: AcceptsEventFn<S, E>
  prepareDeps: PrepareDepsFn<C>
  decider: EventDeciderFn<S, C, E, Record<string, unknown>>
  reducer: ReducerFn<S, E>
}

// biome-ignore lint: To enable a generic Aggregate type for utility and type inference purposes.
export type AnyAggregate = Aggregate<any, any, any>
