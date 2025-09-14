import type { CommandDispatcher } from '../adapter/event-dispatcher'
import type { ReadModelStore } from '../adapter/read-model-store'
import type { DomainEvent, ExtendedDomainEvent } from '../core'
import type { AppError, AsyncResult } from '../utils'

export interface EventHandlerDeps {
  readModelStore: ReadModelStore
  commandDispatcher: CommandDispatcher
}

export type EventHandler = (event: ExtendedDomainEvent<DomainEvent>) => AsyncResult<void, AppError>

export type EventBus = EventHandler
