import type { DomainEvent, State } from '..'

export type ReducerContext = {
  readonly timestamp: Date
}

export type ReducerMap<S extends State, E extends DomainEvent> = {
  [K in E['type']]: S['type'][]
}

export type ReducerParams<S extends State, E extends DomainEvent> = {
  ctx: ReducerContext
  state: S
  event: E
}

export type ReducerFn<S extends State, E extends DomainEvent> = (params: ReducerParams<S, E>) => S

// This function may either mutate the draft state directly (via Immer) and return nothing, or return a new state object entirely.
// The union `S | void` intentionally captures both behaviors.
// biome-ignore lint/suspicious/noConfusingVoidType: ''
export type MutateOrReplace<S extends State> = S | void
