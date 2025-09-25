import type { Command, DomainEvent, ReadModel } from '../types/core'
import type {
  EventReactor,
  Policy,
  PolicyFn,
  PolicyMap,
  PolicyParams,
  Projection,
  ProjectionMap
} from '../types/event'

/**
 * Internal type representing the accumulated values in the builder
 */
type BuilderValue<E extends DomainEvent, C extends Command, RM extends ReadModel> = {
  type: E['id']['type']
  policy: Policy<E, C> | Policy<E, C, PolicyMap<E, C>>
  policyMap?: PolicyMap<E, C>
  projection: Projection<E, RM, ProjectionMap<E, RM>>
  projectionMap?: ProjectionMap<E, RM>
}

/**
 * Builder state types for enforcing correct method call order
 */
export type BuilderState = 'initial' | 'hasType' | 'hasPolicy' | 'hasProjection' | 'complete'

/**
 * Public interface for event reactor builder
 * Provides type-safe fluent API for building event reactors
 */
export interface IEventReactorBuilder<
  ST extends BuilderState,
  C extends Command,
  E extends DomainEvent,
  RM extends ReadModel
> {
  readonly _state: ST

  type<RT extends string>(
    this: IEventReactorBuilder<'initial', E, C, RM>,
    value: RT
  ): IEventReactorBuilder<'hasType', E, C, RM>

  policy(
    this: IEventReactorBuilder<'hasType', E, C, RM>,
    value: Policy<E, C>
  ): IEventReactorBuilder<'hasPolicy', E, C, RM>

  policyWithMap(
    this: IEventReactorBuilder<'hasType', E, C, RM>,
    value: Policy<E, C>,
    transitionMap: PolicyMap<E, C>
  ): IEventReactorBuilder<'hasPolicy', E, C, RM>

  projection(
    this: IEventReactorBuilder<'hasPolicy', E, C, RM>,
    value: Projection<E, RM, ProjectionMap<E, RM>>
  ): IEventReactorBuilder<'complete', E, C, RM>

  projectionWithMap(
    this: IEventReactorBuilder<'hasPolicy', E, C, RM>,
    value: Projection<E, RM, ProjectionMap<E, RM>>,
    transitionMap: ProjectionMap<E, RM>
  ): IEventReactorBuilder<'complete', E, C, RM>

  build(this: IEventReactorBuilder<'complete', E, C, RM>): EventReactor<E, C, RM>
}

/**
 * Validates that all required builder values are present
 */
function isRequiredBuilderValue<E extends DomainEvent, C extends Command, RM extends ReadModel>(
  value: Partial<BuilderValue<E, C, RM>>
): value is BuilderValue<E, C, RM> {
  return (
    typeof value.type === 'string' &&
    value.policy !== undefined &&
    typeof value.policy === 'object' &&
    value.projection !== undefined &&
    typeof value.projection === 'object'
  )
}

/**
 * Helper to safely convert any policy to PolicyFn
 */
function createPolicyFn<E extends DomainEvent, C extends Command>(
  policy: Policy<E, C> | Policy<E, C, PolicyMap<E, C>>
): PolicyFn<E, C> {
  // Type-safe policy conversion without type assertion
  return fromPolicy(policy as Policy<E, C>)
}

/**
 * Converts Policy object to PolicyFn
 */
function fromPolicy<E extends DomainEvent, C extends Command>(
  policies: Policy<E, C>
): PolicyFn<E, C> {
  return (params: PolicyParams<E>): C | null => {
    const eventType = params.event.type

    // Type-safe key checking without type assertion
    if (!(eventType in policies)) {
      return null
    }

    const policy = policies[eventType as keyof typeof policies]
    if (!policy || typeof policy !== 'function') {
      return null
    }

    // Type-safe parameter casting
    type EventOfType = Extract<E, { type: typeof eventType }>
    return policy(params as PolicyParams<EventOfType>)
  }
}

export class EventReactorBuilder<
  ST extends BuilderState,
  E extends DomainEvent,
  C extends Command,
  RM extends ReadModel
> {
  // @ts-expect-error: phantom type to enforce state transitions
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: phantom type to enforce state transitions
  private readonly _state!: ST

  constructor(private readonly value: Readonly<Partial<BuilderValue<E, C, RM>>>) {}

  type(
    this: EventReactorBuilder<'initial', E, C, RM>,
    type: E['id']['type']
  ): EventReactorBuilder<'hasType', E, C, RM> {
    return this.withValue<'hasType', { type: E['id']['type'] }>({ type })
  }

  policy(
    this: EventReactorBuilder<'hasType', E, C, RM>,
    policy: Policy<E, C>
  ): EventReactorBuilder<'hasPolicy', E, C, RM> {
    return this.withValue<'hasPolicy', { policy: Policy<E, C> }>({ policy })
  }

  policyWithMap<PM extends PolicyMap<E, C>>(
    this: EventReactorBuilder<'hasType', E, C, RM>,
    policy: Policy<E, C, PM>,
    transitionMap: PM
  ): EventReactorBuilder<'hasPolicy', E, C, RM> {
    return this.withValue<'hasPolicy', { policy: Policy<E, C, PM>; policyMap: PM }>({
      policy,
      policyMap: transitionMap
    })
  }

  projection(
    this: EventReactorBuilder<'hasPolicy', E, C, RM>,
    projection: Projection<E, RM, ProjectionMap<E, RM>>
  ): EventReactorBuilder<'complete', E, C, RM> {
    return this.withValue<'complete', { projection: Projection<E, RM, ProjectionMap<E, RM>> }>({
      projection
    })
  }

  projectionWithMap<PJM extends ProjectionMap<E, RM>>(
    this: EventReactorBuilder<'hasPolicy', E, C, RM>,
    projection: Projection<E, RM, PJM>,
    transitionMap: PJM
  ): EventReactorBuilder<'complete', E, C, RM> {
    return this.withValue<'complete', { projection: Projection<E, RM, PJM>; projectionMap: PJM }>({
      projection,
      projectionMap: transitionMap
    })
  }

  private withValue<NS extends BuilderState, T extends Partial<BuilderValue<E, C, RM>>>(
    updates: T
  ): EventReactorBuilder<NS, E, C, RM> {
    const newValue = { ...this.value, ...updates }
    return new EventReactorBuilder<NS, E, C, RM>(newValue)
  }

  build(this: EventReactorBuilder<'complete', E, C, RM>): EventReactor<E, C, RM> {
    if (!isRequiredBuilderValue(this.value)) {
      throw new Error('EventReactor is not ready to build. Missing required properties.')
    }

    const projectionMap = this.value.projectionMap ?? ({} as ProjectionMap<E, RM>)

    return {
      type: this.value.type,
      policy: createPolicyFn(this.value.policy),
      projection: this.value.projection,
      projectionMap
    }
  }
}

export function createEventReactor<
  E extends DomainEvent,
  C extends Command,
  RM extends ReadModel
>() {
  return new EventReactorBuilder<'initial', E, C, RM>({})
}
