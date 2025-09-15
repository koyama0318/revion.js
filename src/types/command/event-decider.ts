import type { Command, DomainEvent, State } from '../core'
import type { EventDeciderFn, EventDeciderMap, EventDeciderPreparedMap } from './event-decider-fn'

export type EventDecider<
  S extends State,
  C extends Command,
  E extends DomainEvent,
  DM extends EventDeciderMap<S, C> = never,
  PM extends EventDeciderPreparedMap<C, unknown> = never
> = [DM] extends [never]
  ? {
      [K in C['type']]: EventDeciderFn<S, Extract<C, { type: K }>, E>
    }
  : {
      [K in keyof DM]: DM[K][number] extends never
        ? EventDeciderFn<
            never,
            Extract<C, { type: K }>,
            E,
            K extends keyof PM
              ? Awaited<ReturnType<NonNullable<PM[K & keyof PM]>>>
              : Record<string, unknown>
          >
        : EventDeciderFn<
            Extract<S, { type: DM[K][number] }>,
            Extract<C, { type: K }>,
            E,
            K extends keyof PM
              ? Awaited<ReturnType<NonNullable<PM[K & keyof PM]>>>
              : Record<string, unknown>
          >
    }
