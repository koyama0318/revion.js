import { produce } from 'immer'
import type { ReadModelStore } from '../../types/adapter'
import type { DomainEvent, ExtendedDomainEvent, ReadModel } from '../../types/core'
import type { ProjectionCtx, ProjectionFn } from '../../types/event'
import type { AppError, AsyncResult } from '../../types/utils'
import { err, ok, toAsyncResult } from '../../utils/result'

export type ProjectEventFn<E extends DomainEvent> = (
  event: ExtendedDomainEvent<E>
) => AsyncResult<void, AppError>

export function createProjectEventFnFactory<E extends DomainEvent>(
  projection: ProjectionFn<E, ReadModel>
): (store: ReadModelStore) => ProjectEventFn<E> {
  return (store: ReadModelStore) => {
    return async (event: ExtendedDomainEvent<E>): AsyncResult<void, AppError> => {
      const eventType = event.type

      // Type-safe event type validation
      if (typeof eventType !== 'string') {
        return err({
          code: 'INVALID_EVENT_TYPE',
          message: `Event type must be string, got: ${typeof eventType}`
        })
      }
      // 型安全のため eventType を keyof ProjectionFn<E, ReadModel> として扱う
      if (!(eventType in projection)) {
        return err({
          code: 'EVENT_TYPE_NOT_FOUND',
          message: `Event type ${eventType} not found`
        })
      }
      const definitions = projection[eventType as keyof typeof projection]
      if (!definitions) {
        return err({
          code: 'EVENT_TYPE_NOT_FOUND',
          message: `Event type ${eventType} not found`
        })
      }

      for (const [type, definition] of Object.entries(definitions)) {
        if (!definition || typeof definition !== 'function') {
          continue
        }

        const ctx: ProjectionCtx = {
          timestamp: event.timestamp
        }

        const existingReadModel = await toAsyncResult(() => store.findById(type, event.id.value))
        const readModelToUpdate =
          existingReadModel.ok && existingReadModel.value ? existingReadModel.value : {}

        try {
          const updatedReadModel = produce(readModelToUpdate, draft => {
            const result = definition({
              ctx,
              event: event,
              readModel: draft
            })
            if (result) {
              return result
            }
          })

          // Save the result if it exists and has content
          if (
            updatedReadModel &&
            typeof updatedReadModel === 'object' &&
            Object.keys(updatedReadModel).length > 0
          ) {
            const saved = await toAsyncResult(() => store.save(updatedReadModel as ReadModel))
            if (!saved.ok) {
              return err({
                code: 'SAVE_VIEW_FAILED',
                message: `SavereadModel failed: ${type} event: ${event.type} v${event.version}`,
                cause: saved.error
              })
            }
          }
        } catch (error) {
          return err({
            code: 'PROJECTION_EXECUTION_FAILED',
            message: `Projection execution failed: ${type} event: ${event.type} v${event.version}`,
            cause: error
          })
        }
      }

      return ok(undefined)
    }
  }
}
