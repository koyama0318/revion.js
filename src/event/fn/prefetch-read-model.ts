import { v4 } from 'uuid'
import type { FilterCondition, ReadModelStore } from '../../types/adapter'
import type { DomainEvent, ReadModel } from '../../types/core'
import type { ProjectionMap, ProjectionMapValue } from '../../types/event'
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
      for (const fetch of modelFetchList as ProjectionMapValue<
        Extract<E, { type: E['type'] }>,
        Extract<RM, { type: RM['type'] }>
      >[]) {
        if (!fetch?.readModel) continue
        const modelType = fetch.readModel

        if (fetch.where) {
          const filter = normalizeFilter(fetch.where(event as Extract<E, { type: E['type'] }>))
          const res = await toAsyncResult(() => store.findMany(modelType, { filter }))
          if (!res.ok) {
            return err({
              code: 'READ_MODEL_FETCH_FAILED',
              message: `Failed to fetch read modelsss of type '${modelType}'`,
              cause: res.error
            })
          }
          if (!res.ok) return res

          const models = res.value
          if (models.length > 0) {
            for (const m of models) if (m?.id) dict[modelType + m.id] ??= m
          } else {
            dict[modelType + v4()] ??= placeholder(modelType)
          }
        } else if (event.id?.value) {
          const res = await toAsyncResult(() => store.findById(modelType, event.id.value))
          if (!res.ok) {
            return err({
              code: 'READ_MODEL_FETCH_FAILED',
              message: `Failed to fetch read model of type '${modelType}' with id '${event.id.value}'`,
              cause: res.error
            })
          }

          const model = res.value
          dict[modelType + (model?.id ?? event.id.value)] ??=
            model ?? placeholder(modelType, event.id.value)
        }
      }

      return ok(dict)
    }
  }
}

/**
 * Normalizes where clause results into FilterCondition[] format
 * Handles both direct FilterCondition objects and plain object mappings
 */
function normalizeFilter(whereResult: unknown): FilterCondition<ReadModel>[] | undefined {
  if (!whereResult || typeof whereResult !== 'object') return undefined
  if ('by' in whereResult && 'operator' in whereResult && 'value' in whereResult) {
    return [whereResult as FilterCondition<ReadModel>]
  }
  return Object.entries(whereResult as Record<string, unknown>).map(([by, value]) => ({
    by,
    operator: 'eq' as const,
    value
  })) as FilterCondition<ReadModel>[]
}

/**
 * Creates a placeholder read model when no actual model is found
 * Uses provided ID or generates a new UUID
 */
function placeholder(modelType: string, id?: string): ReadModel {
  return { type: modelType, id: id ?? v4() } as ReadModel
}
