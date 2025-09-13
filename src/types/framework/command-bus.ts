import type { EventStore } from '../adapter/event-store'
import type { Command, CommandResult } from '../core/command'

export interface CommandHandlerDeps {
  eventStore: EventStore
}

export type CommandHandler = (command: Command) => CommandResult

export type CommandHandlerMiddleware = (command: Command, next: CommandHandler) => CommandResult

export type CommandBus = CommandHandler
