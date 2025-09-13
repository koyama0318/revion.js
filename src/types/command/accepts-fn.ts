import type { Command, DomainEvent, State } from '..'

export type ApplyEventType = 'create' | 'update'

export type AcceptsCommandFn<S extends State, C extends Command> = (
  state: S,
  command: C,
  eventType: ApplyEventType
) => boolean

export type AcceptsEventFn<S extends State, E extends DomainEvent> = (
  state: S,
  event: E,
  eventType: ApplyEventType
) => boolean
