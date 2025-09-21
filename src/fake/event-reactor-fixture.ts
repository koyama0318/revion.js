import { CommandDispatcherMock } from '../adapter/command-dispatcher-mock'
import { ReadModelStoreInMemory } from '../adapter/read-model-store-in-memory'
import { createDispatchEventFnFactory } from '../event/fn/dispatch-event'
import { createPrefetchReadModel } from '../event/fn/prefetch-read-model'
import { createProjectEventFnFactory } from '../event/fn/project-event'
import { createSaveReadModel } from '../event/fn/save-read-model'
import type { ReadModelMap } from '../types/adapter/read-model-store'
import type { Command, DomainEvent, ExtendedDomainEvent, ReadModel } from '../types/core'
import type { EventReactor, ProjectionFn, ProjectionMap } from '../types/event'
import type { AppError } from '../types/utils/app-error'

type ReactorTestContext = {
  readModel: {
    before: Record<string, Record<string, ReadModel>>
    after: Record<string, Record<string, ReadModel>>
  }
  issuedCommands: Command[]
  error: AppError | null
}

class ReactorTestFixture<C extends Command, E extends DomainEvent, VM extends ReadModelMap> {
  private readonly commandDispatcher: CommandDispatcherMock
  private readonly readModelStore: ReadModelStoreInMemory
  private readonly reactor: EventReactor<E, C, VM[keyof VM]>
  private context: ReactorTestContext

  constructor(reactor: EventReactor<E, C, VM[keyof VM]>) {
    this.commandDispatcher = new CommandDispatcherMock()
    this.readModelStore = new ReadModelStoreInMemory()
    this.reactor = reactor
    this.context = {
      readModel: { before: {}, after: {} },
      issuedCommands: [],
      error: null
    }
  }

  given(readModel: VM[keyof VM]) {
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
    this.readModelStore.storage = this.context.readModel.before

    // projection workflow: prefetch -> project -> save
    const prefetchFn = createPrefetchReadModel(
      this.reactor.projectionMap as unknown as ProjectionMap<E, ReadModel>
    )(this.readModelStore)
    const modelDict = await prefetchFn(event)
    if (!modelDict.ok) {
      this.context.error = modelDict.error
      return this
    }

    const projectFn = createProjectEventFnFactory(
      this.reactor.projection as unknown as ProjectionFn<E, ReadModel>
    )()
    const projected = await projectFn(event, modelDict.value)
    if (!projected.ok) {
      this.context.error = projected.error
      return this
    }

    const saveFn = createSaveReadModel()(this.readModelStore)
    const saved = await saveFn(projected.value)
    if (!saved.ok) {
      this.context.error = saved.error
      return this
    }

    // policy workflow: dispatch commands
    const dispatchFn = createDispatchEventFnFactory(this.reactor.policy)(this.commandDispatcher)
    const dispatch = await dispatchFn(event)
    if (!dispatch.ok) {
      this.context.error = dispatch.error
    }

    // set after read model
    this.context.issuedCommands = this.commandDispatcher.getCommands() as C[]
    this.context.readModel.after = this.readModelStore.storage

    return this
  }

  assert(assert: (context: ReactorTestContext) => void) {
    assert(this.context)
    return this
  }
}

export function reactorFixture<C extends Command, E extends DomainEvent, VM extends ReadModelMap>(
  reactor: EventReactor<E, C, VM[keyof VM]>
) {
  return new ReactorTestFixture(reactor)
}
