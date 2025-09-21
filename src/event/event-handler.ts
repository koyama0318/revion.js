import type { DomainEvent, ExtendedDomainEvent } from '../types/core'
import type { AnyEventReactor } from '../types/event'
import type { EventHandler, EventHandlerDeps } from '../types/framework'
import { ok } from '../utils/result'
import { createDispatchEventFnFactory } from './fn/dispatch-event'
import { createPrefetchReadModel } from './fn/prefetch-read-model'
import { createProjectEventFnFactory } from './fn/project-event'
import { createSaveReadModel } from './fn/save-read-model'

type EventHandlerFactory<D extends EventHandlerDeps = EventHandlerDeps> = (deps: D) => EventHandler

function createEventHandlerFactory<D extends EventHandlerDeps>(
  reactor: AnyEventReactor
): EventHandlerFactory<D> {
  return (deps: D) => {
    const dispatch = createDispatchEventFnFactory(reactor.policy)(deps.commandDispatcher)
    const prefetchReadModels = createPrefetchReadModel(reactor.projectionMap)(deps.readModelStore)
    const projection = createProjectEventFnFactory(reactor.projection)()
    const saveReadModel = createSaveReadModel()(deps.readModelStore)

    return async (event: ExtendedDomainEvent<DomainEvent>) => {
      // MARK: projection workflow

      const modelDict = await prefetchReadModels(event)
      if (!modelDict.ok) return modelDict

      const projected = await projection(event, modelDict.value)
      if (!projected.ok) return projected

      const saved = await saveReadModel(projected.value)
      if (!saved.ok) return saved

      // MARK: policy workflow

      const dispatched = await dispatch(event)
      if (!dispatched.ok) return dispatched

      return ok(undefined)
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
