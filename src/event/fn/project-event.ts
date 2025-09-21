import { produce } from 'immer'
import type { DomainEvent, ExtendedDomainEvent, ReadModel } from '../../types/core'
import type { ProjectionCtx, ProjectionFn } from '../../types/event'
import type { AppError, AsyncResult } from '../../types/utils'
import { err, ok } from '../../utils/result'

export type ProjectEventFn<E extends DomainEvent> = (
  event: ExtendedDomainEvent<E>,
  readModels: Record<string, ReadModel>
) => AsyncResult<Record<string, ReadModel>, AppError>

export function createProjectEventFnFactory<E extends DomainEvent>(
  projection: ProjectionFn<E, ReadModel>
): () => ProjectEventFn<E> {
  return () => {
    return async (
      event: ExtendedDomainEvent<E>,
      readModels: Record<string, ReadModel>
    ): AsyncResult<Record<string, ReadModel>, AppError> => {
      const ctx: ProjectionCtx = {
        timestamp: event.timestamp
      }

      const updatedDict: Record<string, ReadModel> = {}

      if (!readModels || typeof readModels !== 'object') {
        return ok(updatedDict)
      }

      for (const [key, model] of Object.entries(readModels)) {
        try {
          const updatedModel = produce(model, draft => {
            const result = projection({
              ctx,
              event: event as unknown as E,
              // Draft での in-place mutate / 置換の両方を許容
              readModel: draft as unknown as ReadModel
            })
            if (result) {
              return result
            }
          })

          updatedDict[key] = updatedModel as ReadModel
        } catch (error) {
          return err({
            code: 'PROJECTION_EXECUTION_FAILED',
            message: `Projection execution failed: ${model.type} event: ${String(event.type)} v${event.version}`,
            cause: error
          })
        }
      }

      return ok(updatedDict)
    }
  }
}
