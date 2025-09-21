import type { Draft } from 'immer'
import type { DomainEvent, ReadModel } from '../../types/core'
import type { Projection, ProjectionFn, ProjectionMap, ProjectionParams } from '../../types/event'

export function mapProjectionToFn<
  E extends DomainEvent,
  RM extends ReadModel,
  PM extends ProjectionMap<E, RM>
>(projections: Projection<E, RM, PM>): ProjectionFn<E, RM> {
  return (params: ProjectionParams<E, RM>): RM => {
    const eventType = params.event.type as keyof PM

    const projection = projections[eventType]
    if (!projection || typeof projection !== 'object') {
      return params.readModel
    }

    const readModelType = params.readModel.type as keyof typeof projection
    const projectionFn = projection[readModelType]
    if (!projectionFn || typeof projectionFn !== 'function') {
      return params.readModel
    }

    const result = projectionFn(
      params as ProjectionParams<
        Extract<E, { type: Extract<keyof PM, typeof eventType> }>,
        Draft<Extract<RM, { type: Extract<keyof typeof projection, typeof readModelType> }>>
      >
    )

    // projection mutates draft in place, so result is always the new read model
    return result ?? params.readModel
  }
}
