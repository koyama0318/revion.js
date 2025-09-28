import { produce } from 'immer'
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

    // If the projection returns a completely new read model object, store it here.
    let replacementReadModel: RM | null = null
    let shouldReturnOriginal = false

    const producedReadModel = produce(params.readModel, draft => {
      const projectionParams = {
        ...params,
        readModel: draft
      }

      // biome-ignore lint/suspicious/noExplicitAny: "result is used to store the result of the projection function"
      const result = projectionFn(projectionParams as any)
      if (result === undefined) {
        // Projection mutated the draft in-place → immer will return the new read model automatically.
        return
      }

      if (result === null) {
        // Signal to return original read model
        shouldReturnOriginal = true
        return
      }

      if (typeof result !== 'object') {
        throw new Error(
          `Projection for event "${String(eventType)}" returned an invalid value (${typeof result}). ` +
            'Expected either undefined (mutate draft), null, or a valid read model object.'
        )
      }

      replacementReadModel = result
    })

    // Special handling for null result - return original read model
    if (shouldReturnOriginal) {
      return params.readModel
    }

    // If the projection returned a new read model object, use it; otherwise, use the produced draft result.
    return replacementReadModel ?? producedReadModel
  }
}
