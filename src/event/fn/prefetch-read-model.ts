import type { ReadModelStore } from '../../types/adapter'
import type { DomainEvent, ReadModel } from '../../types/core'
import type { ProjectionMap } from '../../types/event'
import type { AppError, AsyncResult } from '../../types/utils'
import { ok } from '../../utils/result'

export type PrefetchReadModelFn<E extends DomainEvent> = (
  event: E
) => AsyncResult<Record<string, ReadModel>, AppError>

export function createPrefetchReadModel<E extends DomainEvent>(
  map: ProjectionMap<E, ReadModel>
): (store: ReadModelStore) => PrefetchReadModelFn<E> {
  return (store: ReadModelStore) => {
    return async (event: E) => {
      const dict: Record<string, ReadModel> = {}

      if (!map) return ok(dict)

      const modelFetchList = map[event.type as keyof typeof map]

      if (!modelFetchList || !Array.isArray(modelFetchList)) {
        return ok(dict)
      }

      for (const fetch of modelFetchList) {
        const modelType: string = fetch.readModel

        if (fetch.where) {
          // where から等価フィルタを構築して findMany
          const criteria = fetch.where(event) as Partial<ReadModel>
          const filter =
            criteria && typeof criteria === 'object'
              ? (
                  Object.entries(criteria) as [
                    keyof ReadModel & string,
                    ReadModel[keyof ReadModel]
                  ][]
                ).map(([by, value]) => ({
                  by,
                  operator: 'eq' as const,
                  value
                }))
              : undefined

          const models = await store.findMany(modelType, { filter })
          for (const model of models) {
            const key = modelType + model.id
            dict[key] = model
          }
        } else {
          // id 指定で findById（存在しなければスキップ）
          const model = await store.findById(modelType, event.id.value)
          if (model) {
            const key = modelType + model.id
            dict[key] = model
          }
        }
      }

      return ok(dict)
    }
  }
}
