import type { ReadModelStore } from '../../types/adapter'
import type { DomainEvent, ReadModel } from '../../types/core'
import type { ProjectionMap } from '../../types/event'
import type { AppError, AsyncResult } from '../../types/utils'
import { err, ok, toAsyncResult } from '../../utils/result'
import { validateEvent } from '../helpers/validate-domain-event'

export type PrefetchReadModelFn<E extends DomainEvent> = (
  event: E
) => AsyncResult<Record<string, ReadModel>, AppError>

export function createPrefetchReadModel<E extends DomainEvent, RM extends ReadModel>(
  map: ProjectionMap<E, RM>
): (store: ReadModelStore) => PrefetchReadModelFn<E> {
  return (store: ReadModelStore) => {
    return async (event: E) => {
      const validated = validateEvent(event)
      if (!validated.ok) return validated

      const dict: Record<string, ReadModel> = {}

      const modelFetchList = map[event.type as keyof typeof map]
      if (!modelFetchList || !Array.isArray(modelFetchList)) {
        return ok(dict)
      }

      // Track if we have valid configurations and if we found any models
      let hasValidConfigurations = false
      let foundAnyModels = false

      for (const fetch of modelFetchList) {
        if (!fetch || typeof fetch !== 'object' || !fetch.readModel) {
          continue // Skip invalid fetch configurations
        }

        hasValidConfigurations = true
        const modelType: string = fetch.readModel

        try {
          if (fetch.where) {
            const whereResult = fetch.where(event as Extract<E, { type: E['type'] }>)
            let filter: any

            // Check if whereResult is a FilterCondition or Partial<ReadModel>
            if (whereResult && typeof whereResult === 'object') {
              if ('by' in whereResult && 'operator' in whereResult && 'value' in whereResult) {
                // Single FilterCondition
                filter = [whereResult]
              } else {
                // Partial<ReadModel> - convert to FilterCondition array
                filter = (
                  Object.entries(whereResult) as [
                    keyof ReadModel & string,
                    ReadModel[keyof ReadModel]
                  ][]
                ).map(([by, value]) => ({
                  by,
                  operator: 'eq' as const,
                  value
                }))
              }
            }

            const modelsResult = await toAsyncResult(() => store.findMany(modelType, { filter }))
            if (!modelsResult.ok) {
              return err({
                code: 'READ_MODEL_FETCH_FAILED',
                message: `Failed to fetch read models of type '${modelType}'`,
                cause: modelsResult.error
              })
            }

            for (const model of modelsResult.value) {
              if (model?.id) {
                const key = modelType + model.id
                if (!dict[key]) {
                  // Prevent overwriting
                  dict[key] = model
                  foundAnyModels = true
                }
              }
            }
          } else {
            // id 指定で findById（存在しなければスキップ）
            if (!event.id || !event.id.value) {
              continue // Skip if event doesn't have a valid id
            }

            const modelResult = await toAsyncResult(() => store.findById(modelType, event.id.value))
            if (!modelResult.ok) {
              return err({
                code: 'READ_MODEL_FETCH_FAILED',
                message: `Failed to fetch read model of type '${modelType}' with id '${event.id.value}'`,
                cause: modelResult.error
              })
            }

            const model = modelResult.value
            if (model?.id) {
              const key = modelType + model.id
              if (!dict[key]) {
                // Prevent overwriting
                dict[key] = model
                foundAnyModels = true
              }
            }
          }
        } catch (error) {
          return err({
            code: 'READ_MODEL_FETCH_FAILED',
            message: `Unexpected error while fetching read model of type '${modelType}'`,
            cause: error
          })
        }
      }

      // If we have valid configurations but found no models, return an error
      if (hasValidConfigurations && !foundAnyModels) {
        return err({
          code: 'READ_MODEL_NOT_FOUND',
          message: 'No read models found despite having valid projection configurations'
        })
      }

      return ok(dict)
    }
  }
}
