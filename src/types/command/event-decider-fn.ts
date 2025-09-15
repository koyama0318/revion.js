import type { Command, DomainEvent, State } from '../core'

export type EventDeciderContext = {
  readonly timestamp: Date
}

export type EventDeciderMap<S extends State, C extends Command> = {
  [K in C['type']]: S['type'][]
}

export type EventDeciderPreparedMap<C extends Command, D = unknown> = {
  [K in C['type']]?: (args: {
    command: Extract<C, { type: K }>
    deps: D
  }) => Promise<Record<string, unknown>>
}

export type EventDeciderParams<
  S extends State,
  C extends Command,
  P extends Record<string, unknown>
> = {
  ctx: EventDeciderContext
  state: S
  command: C
  prepared: P
}

export type EventDeciderFn<
  S extends State,
  C extends Command,
  E extends DomainEvent,
  P extends Record<string, unknown> = never
> = (params: EventDeciderParams<S, C, P>) => E
