import { CommandDispatcherMock } from '../adapter/command-dispatcher-mock'
import { EventStoreInMemory } from '../adapter/event-store-in-memory'
import { ReadModelStoreInMemory } from '../adapter/read-model-store-in-memory'
import { createCommandBus } from '../command/command-bus'
import { zeroId } from '../command/helpers/aggregate-id'
import { createEventBus } from '../event/event-bus'
import { createQueryBus } from '../query/query-bus'
import type { AnyAggregate } from '../types/command'
import type {
  Command,
  CommandResult,
  DomainEvent,
  ExtendedDomainEvent,
  Query,
  QueryResult,
  ReadModel
} from '../types/core'
import type { AnyEventReactor } from '../types/event'
import type { CommandBus, CommandHandlerMiddleware, EventBus, QueryBus } from '../types/framework'
import type { AnyQuerySource } from '../types/query/query-source'
import { ok } from '../utils/result'

const defaultConfig = {
  skipReadModelProjectionErrors: false,
  allowUnbrandedAggregateId: false
}

export class FakeHandler {
  readonly eventStore: EventStoreInMemory
  readonly readDatabase: ReadModelStoreInMemory
  readonly commandDispatcher: CommandDispatcherMock
  readonly config: typeof defaultConfig

  private readonly commandBus: CommandBus
  private readonly eventBus: EventBus
  private readonly queryBus: QueryBus

  constructor({
    aggregates = [],
    middleware = [],
    reactors = [],
    querySources = [],
    eventStore = new EventStoreInMemory(),
    readDatabase = new ReadModelStoreInMemory(),
    commandDispatcher = new CommandDispatcherMock(),
    config = {}
  }: {
    aggregates?: AnyAggregate[]
    middleware?: CommandHandlerMiddleware[]
    reactors?: AnyEventReactor[]
    querySources?: AnyQuerySource[]
    eventStore?: EventStoreInMemory
    readDatabase?: ReadModelStoreInMemory
    commandDispatcher?: CommandDispatcherMock
    config?: Partial<typeof defaultConfig>
  }) {
    this.eventStore = eventStore
    this.readDatabase = readDatabase
    this.commandDispatcher = commandDispatcher

    this.commandBus = createCommandBus({
      deps: { eventStore: this.eventStore },
      aggregates: aggregates ?? [],
      middleware: middleware ?? []
    })

    this.eventBus = createEventBus({
      deps: { commandDispatcher: this.commandDispatcher, readModelStore: this.readDatabase },
      reactors: reactors ?? []
    })

    this.queryBus = createQueryBus({
      deps: { readModelStore: this.readDatabase },
      querySources: querySources ?? [],
      middleware: []
    })

    this.config = { ...defaultConfig, ...config }
  }

  async command(cmd: Command): CommandResult {
    const command = this.config.allowUnbrandedAggregateId
      ? { ...cmd, id: { ...zeroId(cmd.id.type), value: cmd.id.value } }
      : cmd

    const beforeEvents = this.eventStore.events.slice()

    const dispatched = await this.commandBus(command)
    if (!dispatched.ok) {
      return dispatched
    }

    const afterEvents = this.eventStore.events.slice()

    const diff = afterEvents
      .filter((e: any) => !beforeEvents.includes(e))
      .sort((a: any, b: any) => a.timestamp.getTime() - b.timestamp.getTime())

    for (const event of diff) {
      const handled = await this.eventBus(event)
      if (!handled.ok) {
        const acceptedCodes = ['VIEW_NOT_FOUND', 'EVENT_HANDLER_NOT_FOUND']
        if (
          this.config.skipReadModelProjectionErrors &&
          acceptedCodes.includes(handled.error?.code)
        ) {
          continue
        }
        return handled
      }

      const commands = this.commandDispatcher.getCommands().slice()
      this.commandDispatcher.reset()

      for (const command of commands) {
        const dispatched = await this.command(command)
        if (!dispatched.ok) return dispatched
      }
    }

    return ok(dispatched.value)
  }

  async query<Q extends Query>(query: Q): QueryResult {
    return await this.queryBus(query)
  }

  setEventStore(events: ExtendedDomainEvent<DomainEvent>[]) {
    this.eventStore.events = [...events]
  }

  setReadDatabase(storage: Record<string, Record<string, ReadModel>>) {
    this.readDatabase.storage = storage
  }

  reset() {
    this.eventStore.events = []
    this.eventStore.snapshots = []
    this.readDatabase.storage = {}
    this.commandDispatcher.reset()
  }
}
