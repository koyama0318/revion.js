import type { Command, DomainEvent, State } from '../core'

export type EventDeciderContext = {
  readonly timestamp: Date
}

export type EventDeciderMap<S extends State, C extends Command> = {
  [K in C['type']]: S['type'][]
}

export type EventDeciderParams<S extends State, C extends Command, D> = {
  ctx: EventDeciderContext
  state: S
  command: C
  deps: D
}

export type EventDeciderFn<S extends State, C extends Command, E extends DomainEvent, D> = (
  params: EventDeciderParams<S, C, D>
) => E | Promise<E>
