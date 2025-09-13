import type { Command, DomainEvent, State } from '..'

export type EventDeciderContext = {
  readonly timestamp: Date
}

export type DeciderMap<S extends State, C extends Command> = {
  [K in C['type']]: S['type'][]
}

export type EventDeciderParams<S extends State, C extends Command> = {
  ctx: EventDeciderContext
  state: S
  command: C
}

export type EventDeciderFn<S extends State, C extends Command, E extends DomainEvent> = (
  params: EventDeciderParams<S, C>
) => E
