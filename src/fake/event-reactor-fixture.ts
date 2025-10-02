import { CommandDispatcherMock } from '../adapter/command-dispatcher-mock'
import { ReadModelStoreInMemory } from '../adapter/read-model-store-in-memory'
import { createEventHandlers } from '../event/event-handler'
import type { Command, DomainEvent, ExtendedDomainEvent, ReadModel } from '../types/core'
import type { AnyEventReactor, EventReactor } from '../types/event'
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
  private readonly readModelStore: ReadModelStoreInMemory
  private readonly reactor: EventReactor<E, C, RM>
  private context: ReactorTestContext

  constructor(reactor: EventReactor<E, C, RM>) {
    this.commandDispatcher = new CommandDispatcherMock()
    this.readModelStore = new ReadModelStoreInMemory()
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
    this.readModelStore.records = structuredClone(this.context.readModel.before)

    // use central event handler to process the event end-to-end
    const handlers = createEventHandlers(
      { commandDispatcher: this.commandDispatcher, readModelStore: this.readModelStore },
      [this.reactor as unknown as AnyEventReactor]
    )

    const handler = handlers[this.reactor.type]
    if (!handler) {
      this.context.error = {
        code: 'EVENT_HANDLER_NOT_FOUND',
        message: `No event handler found for type: ${String(this.reactor.type)}`
      } as AppError
      return this
    }

    const handled = await handler(event as unknown as ExtendedDomainEvent<DomainEvent>)
    if (!handled.ok) {
      this.context.error = handled.error
    }

    // set after readModel and issued commands
    this.context.issuedCommands = this.commandDispatcher.getCommands() as C[]
    this.context.readModel.after = structuredClone(this.readModelStore.records)

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
