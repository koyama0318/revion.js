import { CommandDispatcherMock } from '../adapter/command-dispatcher-mock'
import { ReadModelStoreInMemory } from '../adapter/read-model-store-in-memory'
import { createDispatchEventFnFactory } from '../event/fn/dispatch-event'
import { mapProjectionToFn } from '../event/mapper/map-to-projection-fn'
import type { Command, DomainEvent, ExtendedDomainEvent, ReadModel } from '../types/core'
import type { EventReactor } from '../types/event'
import type { AppError } from '../types/utils'

type ReactorTestContext = {
  readModel: {
    before: Record<string, Record<string, ReadModel>>
    after: Record<string, Record<string, ReadModel>>
  }
  issuedCommands: Command[]
  error: AppError | null
}

class ReactorTestFixture<E extends DomainEvent, C extends Command, RM extends ReadModel> {
  private readonly commandDispatcher: CommandDispatcherMock
  private readonly readDatabase: ReadModelStoreInMemory
  private readonly reactor: EventReactor<E, C, RM>
  private context: ReactorTestContext

  constructor(reactor: EventReactor<E, C, RM>) {
    this.commandDispatcher = new CommandDispatcherMock()
    this.readDatabase = new ReadModelStoreInMemory()
    this.reactor = reactor
    this.context = {
      readModel: { before: {}, after: {} },
      issuedCommands: [],
      error: null
    }
  }

  given(readModel: RM) {
    this.context.readModel.before = {
      ...this.context.readModel.before,
      [readModel.type]: {
        ...(this.context.readModel.before[readModel.type] ?? {}),
        [readModel.id]: readModel
      }
    }
    return this
  }

  async when(event: ExtendedDomainEvent<E>) {
    // reset
    this.commandDispatcher.reset()
    this.readDatabase.storage = { ...this.context.readModel.before }

    // execute receiving command (policy)
    const dispatchFn = createDispatchEventFnFactory(this.reactor.policy)(this.commandDispatcher)
    const dispatch = await dispatchFn(event)
    if (!dispatch.ok) {
      this.context.error = dispatch.error
    }

    // projection workflow - same as EventHandler
    // 1. prefetch readModels based on projectionMap
    const modelDict: Record<string, ReadModel> = {}
    const modelFetchList =
      this.reactor.projectionMap[event.type as keyof typeof this.reactor.projectionMap]

    if (modelFetchList && Array.isArray(modelFetchList)) {
      for (const fetch of modelFetchList) {
        if (!fetch || typeof fetch !== 'object' || !fetch.readModel) {
          continue
        }

        const modelType: string = fetch.readModel

        if (fetch.where) {
        } else {
          // Find by event ID
          if (event.id?.value && this.readDatabase.storage[modelType]?.[event.id.value]) {
            const model = this.readDatabase.storage[modelType][event.id.value]
            if (model) {
              const key = modelType + model.id
              modelDict[key] = model
            }
          }
        }
      }
    }

    // 2. apply projection to each readModel
    const projectionFn = mapProjectionToFn(this.reactor.projection)
    const updatedDict: Record<string, ReadModel> = {}

    for (const [key, model] of Object.entries(modelDict)) {
      const updatedModel = projectionFn({
        ctx: { timestamp: event.timestamp },
        event: event as unknown as E,
        readModel: model as RM
      })
      updatedDict[key] = updatedModel
    }

    // Handle new readModel creation (when no existing readModel found)
    if (Object.keys(modelDict).length === 0 && modelFetchList && Array.isArray(modelFetchList)) {
      for (const fetch of modelFetchList) {
        if (!fetch || typeof fetch !== 'object' || !fetch.readModel) {
          continue
        }

        const modelType: string = fetch.readModel

        // Create a placeholder readModel for new creation
        const placeholderModel = {
          type: modelType,
          id: event.id?.value || 'unknown'
        } as ReadModel

        try {
          const newModel = projectionFn({
            ctx: { timestamp: event.timestamp },
            event: event as unknown as E,
            readModel: placeholderModel as RM
          })

          if (newModel && newModel !== placeholderModel) {
            const key = modelType + newModel.id
            updatedDict[key] = newModel
          }
        } catch {
          // Continue if projection fails for non-existing model
        }
      }
    }

    // 3. save updated readModels back to storage
    this.readDatabase.storage = { ...this.context.readModel.before }
    for (const [, model] of Object.entries(updatedDict)) {
      const type = model.type
      if (!this.readDatabase.storage[type]) this.readDatabase.storage[type] = {}
      this.readDatabase.storage[type][model.id] = model
    }

    // set after readModel
    this.context.issuedCommands = this.commandDispatcher.getCommands() as C[]
    this.context.readModel.after = this.readDatabase.storage

    return this
  }

  assert(assertFn: (context: ReactorTestContext) => void) {
    assertFn(this.context)
    return this
  }
}

export function reactorFixture<E extends DomainEvent, C extends Command, RM extends ReadModel>(
  reactor: EventReactor<E, C, RM>
) {
  return new ReactorTestFixture(reactor)
}
