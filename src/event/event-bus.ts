import type { DomainEvent, ExtendedDomainEvent } from '../types/core'
import type { AnyEventReactor } from '../types/event'
import type { EventBus, EventHandlerDeps } from '../types/framework'
import type { AppError, AsyncResult } from '../types/utils'
import { err } from '../utils/result'
import { createEventHandlers } from './event-handler'
import { validateEvent } from './helpers/validate-domain-event'

export function createEventBus({
  deps,
  reactors
}: {
  deps: EventHandlerDeps
  reactors: AnyEventReactor[]
}): EventBus {
  const handlers = createEventHandlers(deps, reactors)

  return async (event: ExtendedDomainEvent<DomainEvent>): AsyncResult<void, AppError> => {
    const validated = validateEvent(event)
    if (!validated.ok) return validated

    const handler = handlers[event.id.type]
    if (!handler) {
      return err({
        code: 'EVENT_HANDLER_NOT_FOUND',
        message: `Handler for aggregate type '${event.id.type}' not found (event: ${event.type})`
      })
    }

    return handler(event)
  }
}
