import type { FilterCondition } from '../adapter'
import type { DomainEvent, ReadModel } from '../core'

export type ProjectionCtx = {
  readonly timestamp: Date
}

type ProjectionMapValue<E extends DomainEvent, RM extends ReadModel> = {
  readModel: RM['type']
  where?: (e: E) => FilterCondition<Extract<RM, { type: RM['type'] }>>
}

export type ProjectionMap<E extends DomainEvent, RM extends ReadModel> = {
  [K in E['type']]: ProjectionMapValue<E, RM>[]
}

export type ProjectionParams<E extends DomainEvent, RM extends ReadModel> = {
  ctx: ProjectionCtx
  event: E
  readModel: RM
}

export type ProjectionFn<E extends DomainEvent, RM extends ReadModel> = (
  params: ProjectionParams<E, RM>
) => RM

// This function may either mutate the draftreadModel directly (via Immer) and return nothing, or return a newreadModel object entirely.
// The union `RM | void` intentionally captures both behaviors.
// biome-ignore lint/suspicious/noConfusingVoidType: ''
export type MutateOrReplace<RM extends ReadModel> = RM | void
