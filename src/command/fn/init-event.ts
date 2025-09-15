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

type InitEventFn<S extends State, C extends Command, E extends DomainEvent> = (
  command: C
) => Result<{ state: ExtendedState<S>; event: ExtendedDomainEvent<E> }, AppError>

export function createInitEventFnFactory<S extends State, C extends Command, E extends DomainEvent>(
  eventDecider: EventDeciderFn<S, C, E, Record<string, unknown>>,
  reducer: ReducerFn<S, E>
): () => InitEventFn<S, C, E> {
  return () => {
    return (command: C) => {
      // Represents the provisional initial state in the event sourcing pattern.
      // This state is used as the starting point before any events have been applied.
      // It is constructed using the aggregate ID from the command.
      const provisionalState: ExtendedState<S> = {
        ...({ id: command.id } as S),
        version: 0
      }

      const deciderCtx: EventDeciderContext = {
        timestamp: new Date()
      }
      const eventRes = toResult(() =>
        eventDecider({
          ctx: deciderCtx,
          state: provisionalState,
          command,
          prepared: {} as Record<string, unknown>
        })
      )
      if (!eventRes.ok) {
        return err({
          code: 'EVENT_DECIDER_ERROR',
          message: 'Event decider error',
          cause: eventRes.error
        })
      }

      const event: E = eventRes.value
      const lastVersion = provisionalState.version
      const newExtendedEvent: ExtendedDomainEvent<E> = {
        ...event,
        id: provisionalState.id,
        version: lastVersion + 1,
        timestamp: new Date()
      }

      const reducerCtx: ReducerContext = {
        timestamp: new Date()
      }
      const stateRes = toResult(() =>
        reducer({
          ctx: reducerCtx,
          state: provisionalState,
          event: newExtendedEvent
        })
      )
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
