import type { CommandDispatcher } from '../../types/adapter'
import type { Command, DomainEvent, ExtendedDomainEvent } from '../../types/core'
import type { PolicyFn } from '../../types/event'
import type { AppError, AsyncResult } from '../../types/utils'
import { err, ok, toAsyncResult, toResult } from '../../utils/result'

type DispatchEventFn<E extends DomainEvent> = (
  event: ExtendedDomainEvent<E>
) => AsyncResult<void, AppError>

export function createDispatchEventFnFactory<E extends DomainEvent, C extends Command>(
  policy: PolicyFn<E, C>
): (deps: CommandDispatcher) => DispatchEventFn<E> {
  return (deps: CommandDispatcher) => {
    return async (event: ExtendedDomainEvent<E>): AsyncResult<void, AppError> => {
      // Input validation
      if (!policy) {
        return err({
          code: 'INVALID_POLICY',
          message: 'Policy function is required'
        })
      }

      if (!deps || typeof deps.dispatch !== 'function') {
        return err({
          code: 'INVALID_DISPATCHER',
          message: 'CommandDispatcher with dispatch method is required'
        })
      }

      if (!event || typeof event !== 'object' || !event.timestamp) {
        return err({
          code: 'INVALID_EVENT',
          message: 'Event must have a valid timestamp property'
        })
      }

      let command: C | null

      const commandRes = toResult(() =>
        policy({
          ctx: { timestamp: event.timestamp },
          event
        })
      )
      if (!commandRes.ok) {
        return err({
          code: 'POLICY_EXECUTION_FAILED',
          message: `Policy execution failed for event type '${event.type}'`,
          cause: commandRes.error
        })
      }

      command = commandRes.value
      if (!command) return ok(undefined)

      const dispatched = await toAsyncResult(() => deps.dispatch(command))
      if (!dispatched.ok) {
        return err({
          code: 'COMMAND_DISPATCH_FAILED',
          message: `Command dispatch failed: ${command.type} for event ${event.type}`,
          cause: dispatched.error
        })
      }

      return ok(undefined)
    }
  }
}
