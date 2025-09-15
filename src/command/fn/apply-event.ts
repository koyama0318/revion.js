import type {
  EventDeciderContext,
  EventDeciderFn,
  ReducerContext,
  ReducerFn
} from '../../types/command'
import type {
  Command,
  DomainEvent,
  ExtendedDomainEvent,
  ExtendedState,
  State
} from '../../types/core'
import type { AppError, Result } from '../../types/utils'
import { err, ok, toResult } from '../../utils/result'

type ApplyEventFn<S extends State, C extends Command, E extends DomainEvent> = (
  state: ExtendedState<S>,
  command: C,
  prepared: Record<string, unknown> | null
) => Result<{ state: ExtendedState<S>; event: ExtendedDomainEvent<E> }, AppError>

export function createApplyEventFnFactory<
  S extends State,
  C extends Command,
  E extends DomainEvent
>(
  eventDecider: EventDeciderFn<S, C, E, Record<string, unknown>>,
  reducer: ReducerFn<S, E>
): () => ApplyEventFn<S, C, E> {
  return () => {
    return (state: ExtendedState<S>, command: C, prepared: Record<string, unknown> | null) => {
      const deciderCtx: EventDeciderContext = {
        timestamp: new Date()
      }
      const eventRes = toResult(() => {
        return eventDecider({
          ctx: deciderCtx,
          state,
          command,
          prepared: prepared ?? ({} as Record<string, unknown>)
        })
      })
      if (!eventRes.ok) {
        return err({
          code: 'EVENT_DECIDER_ERROR',
          message: 'User defined event decider function returned an error',
          cause: eventRes.error
        })
      }

      const event: E = eventRes.value
      const lastVersion = state.version
      const newExtendedEvent: ExtendedDomainEvent<E> = {
        ...event,
        id: state.id,
        version: lastVersion + 1,
        timestamp: new Date()
      }

      const reducerCtx: ReducerContext = {
        timestamp: new Date()
      }
      const stateRes = toResult(() => reducer({ ctx: reducerCtx, state, event: newExtendedEvent }))
      if (!stateRes.ok) {
        return err({
          code: 'REDUCER_RETURNED_VOID',
          message: 'Reducer returned void'
        })
      }

      const newState: S = stateRes.value
      const newExtendedState: ExtendedState<S> = {
        ...newState,
        version: lastVersion + 1
      }

      return ok({
        state: newExtendedState,
        event: newExtendedEvent
      })
    }
  }
}
