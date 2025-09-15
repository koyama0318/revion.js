import type { Aggregate, AnyAggregate } from '../types/command/aggregate'
import type { AggregateId, Command, CommandResult, DomainEvent, State } from '../types/core'
import type { CommandHandler, CommandHandlerDeps } from '../types/framework'
import { err, ok } from '../utils/result'
import { createApplyEventFnFactory } from './fn/apply-event'
import { createInitEventFnFactory } from './fn/init-event'
import { createReplayEventFnFactory } from './fn/replay-event'
import { createSaveEventFnFactory } from './fn/save-event'

type CommandHandlerFactory<D extends CommandHandlerDeps = CommandHandlerDeps> = (
  deps: D
) => CommandHandler

function createCommandHandlerFactory<
  S extends State,
  C extends Command,
  E extends DomainEvent,
  D extends CommandHandlerDeps
>(aggregate: Aggregate<S, C, E>): CommandHandlerFactory<D> {
  return (deps: D) => {
    const replayFn = createReplayEventFnFactory<S, E, D>(aggregate.reducer)(deps)
    const initFn = createInitEventFnFactory<S, C, E>(aggregate.decider, aggregate.reducer)()
    const applyFn = createApplyEventFnFactory<S, C, E>(aggregate.decider, aggregate.reducer)()
    const saveFn = createSaveEventFnFactory<S, E, D>()(deps)

    // Handles aggregate creation or update based on the incoming command
    return async (command: Command): CommandResult => {
      const replayed = await replayFn(command.id as AggregateId<S['id']['type']>)
      if (!replayed.ok && replayed.error.code !== 'NO_EVENTS_STORED') return replayed

      if (!replayed.ok) {
        // New aggregate creation flow (init state and apply event)
        const init = await initFn(command as C)
        if (!init.ok) return init

        const isAccepted = aggregate.acceptsCommand(init.value.state as S, command as C, 'create')
        if (!isAccepted) {
          return err({
            code: 'COMMAND_NOT_ACCEPTED',
            message: 'Create command not accepted for initial state'
          })
        }

        const saved = await saveFn(init.value.state, init.value.event)
        if (!saved.ok) return saved

        return ok({ id: init.value.state.id })
      }

      // Existing aggregate update flow (replay state and apply event)
      const isAccepted = aggregate.acceptsCommand(replayed.value as S, command as C, 'update')
      if (!isAccepted) {
        return err({
          code: 'COMMAND_NOT_ACCEPTED',
          message: 'Update command not accepted for replayed state'
        })
      }

      const prepared = await aggregate.prepareDeps(command as C, deps)
      if (!prepared.ok) return prepared

      const applied = await applyFn(replayed.value, command as C, prepared.value)
      if (!applied.ok) return applied

      const saved = await saveFn(applied.value.state, applied.value.event)
      if (!saved.ok) return saved

      return ok({ id: command.id })
    }
  }
}

export function createCommandHandlers(
  deps: CommandHandlerDeps,
  aggregates: AnyAggregate[]
): Record<string, CommandHandler> {
  const handlers: Record<string, CommandHandler> = {}

  for (const aggregate of aggregates) {
    handlers[aggregate.type] = createCommandHandlerFactory(aggregate)(deps)
  }

  return handlers
}
