import type { ReadModelStore } from '../../types/adapter'
import type { ReadModel } from '../../types/core'
import type { AppError, AsyncResult } from '../../types/utils'
import { err, ok, toAsyncResult } from '../../utils/result'

export type SaveReadModelFn = (readModels: Record<string, ReadModel>) => AsyncResult<void, AppError>

export function createSaveReadModel(): (store: ReadModelStore) => SaveReadModelFn {
  return (store: ReadModelStore) => {
    return async (readModels: Record<string, ReadModel>) => {
      if (Object.values(readModels).length === 0) {
        return err({
          code: 'READ_MODEL_NOT_FOUND',
          message: 'Read model not found'
        })
      }

      for (const model of Object.values(readModels)) {
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
