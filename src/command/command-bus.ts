import type { AnyAggregate } from '../types/command'
import type { Command, CommandResult } from '../types/core'
import type {
  CommandHandler,
  CommandHandlerDeps,
  CommandHandlerMiddleware
} from '../types/framework'
import { err } from '../utils/result'
import { createCommandHandlers } from './command-handler'
import { validateCommand } from './helpers/validate-command'

export function createCommandBus({
  deps,
  aggregates = [],
  middleware = []
}: {
  deps: CommandHandlerDeps
  aggregates: AnyAggregate[]
  middleware: CommandHandlerMiddleware[]
}): CommandHandler {
  const handlers = createCommandHandlers(deps, aggregates)

  const applyMiddleware = (handler: CommandHandler): CommandHandler => {
    return middleware.reduceRight<CommandHandler>((next, m) => {
      return (command: Command) => m(command, next)
    }, handler)
  }

  return async (command: Command): CommandResult => {
    const validated = validateCommand(command)
    if (!validated.ok) return validated

    const handler = handlers[command.id.type]
    if (!handler) {
      return err({
        code: 'COMMAND_HANDLER_NOT_FOUND',
        message: `Handler for type ${command.type} not found`
      })
    }

    return applyMiddleware(handler)(command)
  }
}
