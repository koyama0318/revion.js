import type { EventDeciderPreparedMap, PrepareDepsFn } from '../../types/command'
import type { Command } from '../../types/core'
import type { CommandHandlerDeps } from '../../types/framework'
import { err, ok } from '../../utils/result'

export function createPrepareDepsFnFactory<C extends Command, D = unknown>(
  preparedMap: EventDeciderPreparedMap<C, D>
): PrepareDepsFn<C> {
  return async (command: C, deps: CommandHandlerDeps) => {
    // If the event decider has a preparedMap, execute the preparation function
    const prepareFn = preparedMap[command.type as keyof typeof preparedMap]
    if (prepareFn) {
      try {
        // Type assertion is needed due to complex generic constraints
        const result = await prepareFn({
          command: command as Extract<C, { type: typeof command.type }>,
          deps: deps as D
        })
        return ok(result)
      } catch (error) {
        return err({
          code: 'PREPARE_DEPS_ERROR',
          message: 'Prepare deps error',
          cause: error
        })
      }
    }
    return ok({})
  }
}
