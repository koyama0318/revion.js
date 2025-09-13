import type { Command, DomainEvent, State } from '..'
import type { DeciderMap, EventDeciderFn } from './event-decider-fn'

export type EventDecider<
  S extends State,
  C extends Command,
  E extends DomainEvent,
  DM extends DeciderMap<S, C> = never
> = [DM] extends [never]
  ? {
      [K in C['type']]: EventDeciderFn<S, Extract<C, { type: K }>, E>
    }
  : {
      [K in keyof DM]: DM[K][number] extends never
        ? EventDeciderFn<never, Extract<C, { type: K }>, E>
        : EventDeciderFn<Extract<S, { type: DM[K][number] }>, Extract<C, { type: K }>, E>
    }
