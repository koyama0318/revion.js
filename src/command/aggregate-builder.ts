import type {
  Aggregate,
  EventDecider,
  EventDeciderFn,
  EventDeciderMap,
  Reducer,
  ReducerFn,
  ReducerMap
} from '../types/command'
import type { Command, DomainEvent, State } from '../types/core'
import { mapToAcceptsCommandFn, mapToAcceptsEventFn } from './mapper/map-to-accepts-fn'
import { mapToEventDeciderFn } from './mapper/map-to-event-decider-fn'
import { mapToReducerFn } from './mapper/map-to-reducer-fn'

/**
 * Internal type representing the accumulated values in the builder
 */
type BuilderValue<S extends State, C extends Command, E extends DomainEvent> = {
  type: S['id']['type']
  decider: EventDecider<S, C, E> | EventDecider<S, C, E, EventDeciderMap<S, C>>
  deciderMap?: EventDeciderMap<S, C>
  reducer: Reducer<S, E> | Reducer<S, E, ReducerMap<S, E>>
  reducerMap?: ReducerMap<S, E>
}

/**
 * Builder state types for enforcing correct method call order
 */
export type BuilderState = 'initial' | 'hasType' | 'hasDecider' | 'hasReducer' | 'complete'

/**
 * Public interface for aggregate builder
 * Provides type-safe fluent API for building aggregates
 */
export interface IAggregateBuilder<
  ST extends BuilderState,
  S extends State,
  C extends Command,
  E extends DomainEvent
> {
  readonly _state: ST

  type<T extends string>(
    this: IAggregateBuilder<'initial', S, C, E>,
    value: T
  ): IAggregateBuilder<'hasType', S, C, E>

  decider(
    this: IAggregateBuilder<'hasType', S, C, E>,
    value: EventDecider<S, C, E>
  ): IAggregateBuilder<'hasDecider', S, C, E>

  deciderWithMap(
    this: IAggregateBuilder<'hasType', S, C, E>,
    value: EventDecider<S, C, E>,
    transitionMap: EventDeciderMap<S, C>
  ): IAggregateBuilder<'hasDecider', S, C, E>

  reducer(
    this: IAggregateBuilder<'hasDecider', S, C, E>,
    value: Reducer<S, E>
  ): IAggregateBuilder<'complete', S, C, E>

  reducerWithMap(
    this: IAggregateBuilder<'hasDecider', S, C, E>,
    value: Reducer<S, E>,
    transitionMap: ReducerMap<S, E>
  ): IAggregateBuilder<'complete', S, C, E>

  build(this: IAggregateBuilder<'complete', S, C, E>): Aggregate<S, C, E>
}

/**
 * Validates that all required builder values are present
 */
function isRequiredBuilderValue<S extends State, C extends Command, E extends DomainEvent, _D>(
  value: Partial<BuilderValue<S, C, E>>
): value is BuilderValue<S, C, E> {
  return value.type !== undefined && value.decider !== undefined && value.reducer !== undefined
}

/**
 * Helper to safely convert any decider to EventDeciderFn
 */
function createEventDeciderFn<S extends State, C extends Command, E extends DomainEvent, _D>(
  decider: EventDecider<S, C, E> | EventDecider<S, C, E, EventDeciderMap<S, C>>
): EventDeciderFn<S, C, E> {
  return mapToEventDeciderFn(decider as EventDecider<S, C, E>)
}

/**
 * Helper to safely convert any reducer to ReducerFn
 */
function createReducerFn<S extends State, E extends DomainEvent>(
  reducer: Reducer<S, E> | Reducer<S, E, ReducerMap<S, E>>
): ReducerFn<S, E> {
  return mapToReducerFn(reducer as Reducer<S, E>)
}

export class AggregateBuilder<
  ST extends BuilderState,
  S extends State,
  C extends Command,
  E extends DomainEvent
> {
  // @ts-expect-error: phantom type to enforce state transitions
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: phantom type to enforce state transitions
  private readonly _state!: ST

  constructor(private readonly value: Readonly<Partial<BuilderValue<S, C, E>>>) {}

  type(
    this: AggregateBuilder<'initial', S, C, E>,
    type: S['id']['type']
  ): AggregateBuilder<'hasType', S, C, E> {
    return this.withValue<'hasType', { type: string }>({ type })
  }

  decider(
    this: AggregateBuilder<'hasType', S, C, E>,
    decider: EventDecider<S, C, E>
  ): AggregateBuilder<'hasDecider', S, C, E> {
    return this.withValue<'hasDecider', { decider: EventDecider<S, C, E> }>({ decider })
  }

  deciderWithMap<DM extends EventDeciderMap<S, C>>(
    this: AggregateBuilder<'hasType', S, C, E>,
    decider: EventDecider<S, C, E, DM>,
    deciderMap: DM
  ): AggregateBuilder<'hasDecider', S, C, E> {
    return this.withValue<'hasDecider', { decider: EventDecider<S, C, E, DM>; deciderMap: DM }>({
      decider,
      deciderMap
    })
  }

  reducer(
    this: AggregateBuilder<'hasDecider', S, C, E>,
    reducer: Reducer<S, E>
  ): AggregateBuilder<'complete', S, C, E> {
    return this.withValue<'complete', { reducer: Reducer<S, E> }>({ reducer })
  }

  reducerWithMap<RM extends ReducerMap<S, E>>(
    this: AggregateBuilder<'hasDecider', S, C, E>,
    reducer: Reducer<S, E, RM>,
    reducerMap: RM
  ): AggregateBuilder<'complete', S, C, E> {
    return this.withValue<'complete', { reducer: Reducer<S, E, RM>; reducerMap: RM }>({
      reducer,
      reducerMap
    })
  }

  private withValue<NS extends BuilderState, T extends Partial<BuilderValue<S, C, E>>>(
    updates: T
  ): AggregateBuilder<NS, S, C, E> {
    const newValue = { ...this.value, ...updates }
    return new AggregateBuilder<NS, S, C, E>(newValue)
  }

  build(this: AggregateBuilder<'complete', S, C, E>): Aggregate<S, C, E> {
    if (!isRequiredBuilderValue(this.value)) {
      throw new Error('Aggregate is not ready to build. Missing required properties.')
    }

    const deciderMap: EventDeciderMap<S, C> = this.value.deciderMap ?? ({} as EventDeciderMap<S, C>)
    const acceptsCommand = mapToAcceptsCommandFn<S, C>(deciderMap)

    const reducerMap: ReducerMap<S, E> = this.value.reducerMap ?? ({} as ReducerMap<S, E>)
    const acceptsEvent = mapToAcceptsEventFn<S, E>(reducerMap)

    return {
      type: this.value.type,
      acceptsCommand,
      acceptsEvent,
      decider: createEventDeciderFn(this.value.decider as EventDecider<S, C, E>),
      reducer: createReducerFn(this.value.reducer)
    }
  }
}

export function createAggregate<S extends State, C extends Command, E extends DomainEvent, _D>() {
  return new AggregateBuilder<'initial', S, C, E>({})
}
