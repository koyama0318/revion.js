import type { Command, DomainEvent, State } from '../core'
import type { EventDeciderFn, EventDeciderMap } from './event-decider-fn'

export type EventDecider<
  S extends State,
  C extends Command,
  E extends DomainEvent,
  D = Record<string, unknown>,
  DM extends EventDeciderMap<S, C> = never
> = [DM] extends [never]
  ? {
      [K in C['type']]: EventDeciderFn<S, Extract<C, { type: K }>, E, D>
    }
  : {
      [K in keyof DM]: DM[K][number] extends never
        ? EventDeciderFn<never, Extract<C, { type: K }>, E, D>
        : EventDeciderFn<Extract<S, { type: DM[K][number] }>, Extract<C, { type: K }>, E, D>
    }
