import type { AnyAggregate } from '../types/command'
import type {
  Command,
  CommandResultPayload,
  DomainEvent,
  ExtendedDomainEvent,
  Query,
  QueryResultPayload,
  ReadModel
} from '../types/core'
import type { AnyEventReactor } from '../types/event'
import type { CommandBus, CommandHandlerMiddleware } from '../types/framework/command-bus'
import type { EventBus } from '../types/framework/event-bus'
import type { QueryBus } from '../types/framework/query-bus'
import type { AnyQuerySource } from '../types/query/query-source'
import type { AppError } from '../types/utils/app-error'
import type { Result } from '../types/utils/result'
// Domain service type for fake handler
export type DomainService<T = unknown> = {
  type: string
  implementation: T
}

export type AnyDomainService = DomainService<unknown>

import { CommandDispatcherMock } from '../adapter/command-dispatcher-mock'
import { EventStoreInMemory } from '../adapter/event-store-in-memory'
import { ReadModelStoreInMemory } from '../adapter/read-model-store-in-memory'
import { createCommandBus } from '../command/command-bus'
import { zeroId } from '../command/helpers/aggregate-id'
import { createEventBus } from '../event/event-bus'
import { createQueryBus } from '../query/query-bus'
import {
  FakeHandlerLogger,
  type IFakeHandlerLogger,
  NullFakeHandlerLogger
} from './fake-handler-logger'

const defaultConfig = {
  // enables logging of event store, read database, and command queue
  enableLogging: false,
  // ignores read model projection error handling when enabled
  skipReadModelProjectionErrors: false,
  // allows aggregate id usage without brand symbol when enabled
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
  private readonly logger: IFakeHandlerLogger

  constructor({
    aggregates = [],
    middleware = [],
    reactors = [],
    resolvers = [],
    eventStore = new EventStoreInMemory(),
    readDatabase = new ReadModelStoreInMemory(),
    commandDispatcher = new CommandDispatcherMock(),
    config = {}
  }: {
    aggregates?: AnyAggregate[]
    middleware?: CommandHandlerMiddleware[]
    reactors?: AnyEventReactor[]
    resolvers?: AnyQuerySource[]
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
      querySources: resolvers ?? [],
      middleware: []
    })

    this.config = { ...defaultConfig, ...config }
    this.logger = this.config.enableLogging ? new FakeHandlerLogger() : new NullFakeHandlerLogger()
  }

  async command(cmd: Command): Promise<Result<CommandResultPayload, AppError>> {
    // make id if not created by constructor
    const command = this.config.allowUnbrandedAggregateId
      ? { ...cmd, id: { ...zeroId(cmd.id.type), value: cmd.id.value } }
      : cmd

    this.logger.logCommand(command, 'start')

    const beforeEvents = this.eventStore.events.slice()

    // command dispatch
    const dispatched = await this.commandBus(command)
    if (!dispatched.ok) {
      this.logger.logCommand(command, 'error')
      return dispatched
    }

    const afterEvents = this.eventStore.events.slice()

    const diff = afterEvents
      .filter(e => !beforeEvents.includes(e))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    this.logger.logEvents(diff)

    // event Handle
    for (const event of diff) {
      this.logger.logEventHandling(event, 'start')

      // project read model and dispatch commands
      const handled = await this.eventBus(event)
      if (!handled.ok) {
        const acceptedCodes = ['PROJECTION_EXECUTION_FAILED', 'MODEL_SAVE_FAILED']
        if (
          this.config.skipReadModelProjectionErrors &&
          acceptedCodes.includes(handled.error?.code)
        ) {
          this.logger.logEventHandling(event, 'error')
          continue
        }
        this.logger.logEventHandling(event, 'error')
        return handled
      }

      this.logger.logEventHandling(event, 'success')

      // recursively dispatch commands
      const commands = this.commandDispatcher.getCommands().slice()
      this.commandDispatcher.reset()

      for (const command of commands) {
        const dispatched = await this.command(command)
        if (!dispatched.ok) return dispatched
      }
    }

    this.logger.logCommand(command, 'success')
    this.logger.logState(this.eventStore, this.readDatabase, this.commandDispatcher)

    return dispatched
  }

  async query<Q extends Query>(query: Q): Promise<Result<QueryResultPayload, AppError>> {
    return await this.queryBus(query)
  }

  setEventStore(events: ExtendedDomainEvent<DomainEvent>[]) {
    this.eventStore.events = [...events]
  }

  setReadDatabase(storage: Record<string, Record<string, ReadModel>>) {
    this.readDatabase.storage = storage
  }

  log(): string {
    return `event store: ${JSON.stringify(this.eventStore.events, null, 2)}\nevent queue: ${JSON.stringify(this.commandDispatcher.getCommands(), null, 2)}\nread database: ${JSON.stringify(this.readDatabase.storage, null, 2)}`
  }

  reset() {
    this.eventStore.events = []
    this.eventStore.snapshots = []
    this.readDatabase.storage = {}
    this.commandDispatcher.reset()
  }
}
