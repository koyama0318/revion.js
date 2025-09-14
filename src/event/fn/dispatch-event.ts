import type { CommandDispatcher } from '../../types/adapter'
import type { Command, DomainEvent, ExtendedDomainEvent } from '../../types/core'
import type { PolicyFn } from '../../types/event'
import type { AppError, AsyncResult } from '../../types/utils'
import { err, ok, toAsyncResult } from '../../utils/result'

type DispatchEventFn<E extends DomainEvent> = (
  event: ExtendedDomainEvent<E>
) => AsyncResult<void, AppError>

export function createDispatchEventFnFactory<E extends DomainEvent, C extends Command>(
  policy: PolicyFn<E, C>
): (deps: CommandDispatcher) => DispatchEventFn<E> {
  return (deps: CommandDispatcher) => {
    return async (event: ExtendedDomainEvent<E>): AsyncResult<void, AppError> => {
      const command = policy({
        ctx: { timestamp: event.timestamp },
        event
      })
      if (!command) return ok(undefined)

      const dispatched = await toAsyncResult(() => deps.dispatch(command))
      if (!dispatched.ok) {
        return err({
          code: 'COMMAND_DISPATCH_FAILED',
          message: 'Command dispatch failed',
          cause: dispatched.error
        })
      }

      return ok(undefined)
    }
  }
}
