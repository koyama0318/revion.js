import type { Draft } from 'immer'
import type { DomainEvent, ReadModel } from '../core'
import type { MutateOrReplace, ProjectionMap, ProjectionParams } from './projection-fn'

export type Projection<
  E extends DomainEvent,
  RM extends ReadModel,
  PM extends ProjectionMap<E, RM>
> = {
  [K in keyof PM]: {
    [VT in PM[K][number]['readModel']]: (
      params: ProjectionParams<Extract<E, { type: K }>, Draft<Extract<RM, { type: VT }>>>
    ) => MutateOrReplace<Extract<RM, { type: VT }>>
  }
}
