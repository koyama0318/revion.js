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
  command: C
) => Result<{ state: ExtendedState<S>; event: ExtendedDomainEvent<E> }, AppError>

export function createApplyEventFnFactory<
  S extends State,
  C extends Command,
  E extends DomainEvent
>(eventDecider: EventDeciderFn<S, C, E>, reducer: ReducerFn<S, E>): () => ApplyEventFn<S, C, E> {
  return () => {
    return (state: ExtendedState<S>, command: C) => {
      const timestamp = new Date()

      const deciderCtx: EventDeciderContext = {
        timestamp
      }
      const eventRes = toResult(() => eventDecider({ ctx: deciderCtx, state, command }))
      if (!eventRes.ok) {
        return err({
          code: 'EVENT_DECIDER_ERROR',
          message: 'User defined event decider function returned an error',
          cause: eventRes.error
        })
      }

      const lastVersion = state.version
      const newVersion = lastVersion + 1

      const newExtendedEvent: ExtendedDomainEvent<E> = {
        ...eventRes.value,
        id: state.id,
        version: newVersion,
        timestamp
      }

      const reducerCtx: ReducerContext = {
        timestamp
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
        version: newVersion
      }

      return ok({
        state: newExtendedState,
        event: newExtendedEvent
      })
    }
  }
}
