import type { DomainEvent, ExtendedDomainEvent } from '../types/core'
import type { AnyEventReactor } from '../types/event'
import type { EventHandler, EventHandlerDeps } from '../types/framework'
import { err, ok } from '../utils/result'
import { createDispatchEventFnFactory } from './fn/dispatch-event'
import { createProjectEventFnFactory } from './fn/project-event'

type EventHandlerFactory<D extends EventHandlerDeps = EventHandlerDeps> = (deps: D) => EventHandler

function createEventHandlerFactory<D extends EventHandlerDeps>(
  reactor: AnyEventReactor
): EventHandlerFactory<D> {
  return (deps: D) => {
    const dispatch = createDispatchEventFnFactory(reactor.policy)(deps.commandDispatcher)
    const projection = createProjectEventFnFactory(reactor.projection)(deps.readModelStore)

    return async (event: ExtendedDomainEvent<DomainEvent>) => {
      try {
        const [dispatched, projected] = await Promise.all([dispatch(event), projection(event)])

        // Check dispatch result first
        if (!dispatched.ok) {
          return dispatched
        }

        // Check projection result
        if (!projected.ok) {
          return projected
        }

        return ok(undefined)
      } catch (error) {
        // Handle unexpected errors that escape the Result type system
        return err({
          code: 'EVENT_HANDLER_ERROR',
          message: 'Unexpected error in event handler',
          cause: error instanceof Error ? error : new Error(String(error))
        })
      }
    }
  }
}

export function createEventHandlers(
  deps: EventHandlerDeps,
  eventReactors: AnyEventReactor[]
): Record<string, EventHandler> {
  const handlers: Record<string, EventHandler> = {}

  for (const reactor of eventReactors) {
    handlers[reactor.type] = createEventHandlerFactory(reactor)(deps)
  }

  return handlers
}
