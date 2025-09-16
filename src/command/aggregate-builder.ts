import { produce } from 'immer'
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
import { createAcceptsCommand, createAcceptsEvent } from './helpers/create-accepts'

/**
 * Internal type representing the accumulated values in the builder
 */
type BuilderValue<
  S extends State,
  C extends Command,
  E extends DomainEvent,
  D extends Record<string, unknown>
> = {
  type: S['id']['type']
  decider: EventDecider<S, C, E, D> | EventDecider<S, C, E, D, EventDeciderMap<S, C>>
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
  E extends DomainEvent,
  D extends Record<string, unknown>
> {
  readonly _state: ST

  type<T extends string>(
    this: IAggregateBuilder<'initial', S, C, E, D>,
    value: T
  ): IAggregateBuilder<'hasType', S, C, E, D>

  decider(
    this: IAggregateBuilder<'hasType', S, C, E, D>,
    value: EventDecider<S, C, E, D>
  ): IAggregateBuilder<'hasDecider', S, C, E, D>

  deciderWithMap(
    this: IAggregateBuilder<'hasType', S, C, E, D>,
    value: EventDecider<S, C, E, D>,
    transitionMap: EventDeciderMap<S, C>
  ): IAggregateBuilder<'hasDecider', S, C, E, D>

  reducer(
    this: IAggregateBuilder<'hasDecider', S, C, E, D>,
    value: Reducer<S, E>
  ): IAggregateBuilder<'complete', S, C, E, D>

  reducerWithMap(
    this: IAggregateBuilder<'hasDecider', S, C, E, D>,
    value: Reducer<S, E>,
    transitionMap: ReducerMap<S, E>
  ): IAggregateBuilder<'complete', S, C, E, D>

  build(this: IAggregateBuilder<'complete', S, C, E, D>): Aggregate<S, C, E, D>
}

/**
 * Validates that all required builder values are present
 */
function isRequiredBuilderValue<
  S extends State,
  C extends Command,
  E extends DomainEvent,
  D extends Record<string, unknown>
>(value: Partial<BuilderValue<S, C, E, D>>): value is BuilderValue<S, C, E, D> {
  return value.type !== undefined && value.decider !== undefined && value.reducer !== undefined
}

/**
 * Helper to safely convert any decider to EventDeciderFn
 */
function createEventDeciderFn<S extends State, C extends Command, E extends DomainEvent, D>(
  decider: EventDecider<S, C, E, D> | EventDecider<S, C, E, EventDeciderMap<S, C>>
): EventDeciderFn<S, C, E, D> {
  return fromEventDecider(decider as EventDecider<S, C, E, D>)
}

/**
 * Helper to safely convert any reducer to ReducerFn
 */
function createReducerFn<S extends State, E extends DomainEvent>(
  reducer: Reducer<S, E> | Reducer<S, E, ReducerMap<S, E>>
): ReducerFn<S, E> {
  return fromReducer(reducer as Reducer<S, E>)
}

/**
 * Converts EventDecider object to EventDeciderFn
 */
export function fromEventDecider<S extends State, C extends Command, E extends DomainEvent, D>(
  deciders: EventDecider<S, C, E, D>
): EventDeciderFn<S, C, E, D> {
  return ({ ctx, state, command, deps }) => {
    const deciderMap = deciders as Record<C['type'], EventDeciderFn<S, C, E, D>>
    const decider = deciderMap[command.type as C['type']]
    if (!decider) {
      throw new Error(`No decider found for type: ${String(command.type)}`)
    }

    return decider({
      ctx,
      state,
      command: command as Extract<C, { type: typeof command.type }>,
      deps
    })
  }
}

/**
 * Converts Reducer object to ReducerFn with Immer integration
 */
export function fromReducer<S extends State, E extends DomainEvent>(
  reducers: Reducer<S, E>
): ReducerFn<S, E> {
  return ({ ctx, state, event }) => {
    const reducer = reducers[event.type as keyof typeof reducers]
    if (!reducer) {
      throw new Error(`No reducer found for event type: ${String(event.type)}`)
    }

    // Holds the new typed state if returned by the reducer
    let updatedTypedState = null

    const updatedState = produce(state, draft => {
      // The reducer mutates the draft in place. If it returns a value, store it as the typed state.
      const res = reducer({
        ctx,
        state: draft,
        event: event as Extract<E, { type: typeof event.type }>
      })
      if (res !== undefined) {
        // Validate that the returned value is a proper state object
        if (res === null || typeof res !== 'object') {
          throw new Error(
            `Reducer for event type "${String(event.type)}" returned invalid value: ${typeof res}. ` +
              'Reducers must return either undefined (to use mutated draft) or a valid state object.'
          )
        }
        updatedTypedState = res
      }
    })

    // reducer mutates draft in place, so result is always the new state
    return updatedTypedState ?? updatedState
  }
}

export class AggregateBuilder<
  ST extends BuilderState,
  S extends State,
  C extends Command,
  E extends DomainEvent,
  D extends Record<string, unknown>
> {
  // @ts-expect-error: phantom type to enforce state transitions
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: phantom type to enforce state transitions
  private readonly _state!: ST

  constructor(private readonly value: Readonly<Partial<BuilderValue<S, C, E, D>>>) {}

  type(
    this: AggregateBuilder<'initial', S, C, E, D>,
    type: S['id']['type']
  ): AggregateBuilder<'hasType', S, C, E, D> {
    return this.withValue<'hasType', { type: string }>({ type })
  }

  decider(
    this: AggregateBuilder<'hasType', S, C, E, D>,
    decider: EventDecider<S, C, E, D>
  ): AggregateBuilder<'hasDecider', S, C, E, D> {
    return this.withValue<'hasDecider', { decider: EventDecider<S, C, E, D> }>({ decider })
  }

  deciderWithMap<DM extends EventDeciderMap<S, C>>(
    this: AggregateBuilder<'hasType', S, C, E, D>,
    decider: EventDecider<S, C, E, D, DM>,
    deciderMap: DM
  ): AggregateBuilder<'hasDecider', S, C, E, D> {
    return this.withValue<'hasDecider', { decider: EventDecider<S, C, E, D, DM>; deciderMap: DM }>({
      decider,
      deciderMap
    })
  }

  reducer(
    this: AggregateBuilder<'hasDecider', S, C, E, D>,
    reducer: Reducer<S, E>
  ): AggregateBuilder<'complete', S, C, E, D> {
    return this.withValue<'complete', { reducer: Reducer<S, E> }>({ reducer })
  }

  reducerWithMap<RM extends ReducerMap<S, E>>(
    this: AggregateBuilder<'hasDecider', S, C, E, D>,
    reducer: Reducer<S, E, RM>,
    reducerMap: RM
  ): AggregateBuilder<'complete', S, C, E, D> {
    return this.withValue<'complete', { reducer: Reducer<S, E, RM>; reducerMap: RM }>({
      reducer,
      reducerMap
    })
  }

  private withValue<NS extends BuilderState, T extends Partial<BuilderValue<S, C, E, D>>>(
    updates: T
  ): AggregateBuilder<NS, S, C, E, D> {
    const newValue = { ...this.value, ...updates }
    return new AggregateBuilder<NS, S, C, E, D>(newValue)
  }

  build(this: AggregateBuilder<'complete', S, C, E, D>): Aggregate<S, C, E, D> {
    if (!isRequiredBuilderValue(this.value)) {
      throw new Error('Aggregate is not ready to build. Missing required properties.')
    }

    const deciderMap: EventDeciderMap<S, C> = this.value.deciderMap ?? ({} as EventDeciderMap<S, C>)
    const acceptsCommand = createAcceptsCommand<S, C>(deciderMap)

    const reducerMap: ReducerMap<S, E> = this.value.reducerMap ?? ({} as ReducerMap<S, E>)
    const acceptsEvent = createAcceptsEvent<S, E>(reducerMap)

    return {
      type: this.value.type,
      acceptsCommand,
      acceptsEvent,
      decider: createEventDeciderFn(this.value.decider as EventDecider<S, C, E, D>),
      reducer: createReducerFn(this.value.reducer)
    }
  }
}

export function createAggregate<
  S extends State,
  C extends Command,
  E extends DomainEvent,
  D extends Record<string, unknown> = Record<string, unknown>
>() {
  return new AggregateBuilder<'initial', S, C, E, D>({})
}
