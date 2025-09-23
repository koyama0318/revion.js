import type { ReadModelStore } from '../../types/adapter'
import type { ReadModel } from '../../types/core'
import type { AppError, AsyncResult } from '../../types/utils'
import { err, ok, toAsyncResult } from '../../utils/result'

export type SaveReadModelFn = (readModels: Record<string, ReadModel>) => AsyncResult<void, AppError>

export function createSaveReadModel(): (store: ReadModelStore) => SaveReadModelFn {
  return (store: ReadModelStore) => {
    return async (readModels: Record<string, ReadModel>) => {
      if (!readModels || typeof readModels !== 'object') {
        return err({
          code: 'INVALID_READ_MODELS',
          message: 'ReadModels must be a valid object'
        })
      }

      // Empty models is a valid case (e.g., no projections to save)
      if (Object.values(readModels).length === 0) {
        return ok(undefined)
      }

      for (const model of Object.values(readModels)) {
        if (!model || typeof model !== 'object' || !model.type || !model.id) {
          return err({
            code: 'INVALID_READ_MODEL',
            message: 'Each read model must have type and id properties'
          })
        }

        const saved = await toAsyncResult(() => store.save(model))
        if (!saved.ok) {
          return err({
            code: 'MODEL_SAVE_FAILED',
            message: `Model save failed: ${model.type} ${model.id}`,
            cause: saved.error
          })
        }
      }

      return ok(undefined)
    }
  }
}
