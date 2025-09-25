import type { DomainEvent, ExtendedDomainEvent, ReadModel } from '../../types/core'
import type { ProjectionCtx, ProjectionFn } from '../../types/event'
import type { AppError, AsyncResult } from '../../types/utils'
import { err, ok } from '../../utils/result'

export type ProjectEventFn<E extends DomainEvent, RM extends ReadModel> = (
  event: ExtendedDomainEvent<E>,
  readModels: Record<string, RM>
) => AsyncResult<Record<string, RM>, AppError>

export function createProjectEventFnFactory<E extends DomainEvent, RM extends ReadModel>(
  projection: ProjectionFn<E, RM>
): () => ProjectEventFn<E, RM> {
  return () => {
    return async (
      event: ExtendedDomainEvent<E>,
      readModels: Record<string, RM>
    ): AsyncResult<Record<string, RM>, AppError> => {
      const ctx: ProjectionCtx = {
        timestamp: event.timestamp
      }

      const updatedDict: Record<string, RM> = {}

      if (!readModels || typeof readModels !== 'object') {
        return ok(updatedDict)
      }

      for (const [key, model] of Object.entries(readModels)) {
        try {
          const updatedModel = projection({
            ctx,
            event: event as unknown as E,
            readModel: model as unknown as RM
          })

          updatedDict[key] = updatedModel
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
