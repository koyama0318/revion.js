import type { EventStore } from '../../types/adapter'
import type { ReducerContext, ReducerFn } from '../../types/command'
import type { AggregateId, DomainEvent, ExtendedState, Snapshot, State } from '../../types/core'
import type { AppError, AsyncResult } from '../../types/utils'
import { err, ok, toAsyncResult, toResult } from '../../utils/result'

export type ReplayEventFn<T extends string, S extends State> = (
  id: AggregateId<T>
) => AsyncResult<ExtendedState<S>, AppError>

export function createReplayEventFnFactory<S extends State, E extends DomainEvent>(
  reducer: ReducerFn<S, E>
): (eventStore: EventStore) => ReplayEventFn<S['id']['type'], S> {
  return (eventStore: EventStore) => {
    return async (id: AggregateId<S['id']['type']>) => {
      let state: ExtendedState<S> | null = null
      let currentVersion = 0

      const snapshot = await toAsyncResult(() =>
        eventStore.getSnapshot(id as AggregateId<S['id']['type']>)
      )
      if (!snapshot.ok) {
        return err({
          code: 'SNAPSHOT_CANNOT_BE_LOADED',
          message: 'Snapshot cannot be loaded',
          cause: snapshot.error
        })
      }
      if (snapshot.value) {
        // biome-ignore lint/correctness/noUnusedVariables: timestamp is not used for extended state
        const { timestamp, ...rest } = snapshot.value as Snapshot<S>
        currentVersion = rest.version
        state = rest as ExtendedState<S>
      }

      const events = await toAsyncResult(() =>
        eventStore.getEvents<E>(id as AggregateId<S['id']['type']>, currentVersion + 1)
      )
      if (!events.ok) {
        return err({
          code: 'EVENTS_CANNOT_BE_LOADED',
          message: 'Events cannot be loaded',
          cause: events.error
        })
      }

      currentVersion += events.value.length
      if (currentVersion === 0) {
        return err({
          code: 'NO_EVENTS_STORED',
          message: 'No events stored'
        })
      }

      const provisionalState: ExtendedState<S> = {
        ...({ id: id as AggregateId } as S),
        version: 0
      }

      let nextState: S = state ?? provisionalState
      for (const event of events.value) {
        const ctx: ReducerContext = {
          timestamp: event.timestamp
        }
        const stateRes = toResult(() => reducer({ ctx, state: nextState, event }))
        if (!stateRes.ok) {
          return err({
            code: 'REDUCER_RETURNED_VOID',
            message: 'Reducer returned void'
          })
        }
        nextState = stateRes.value
      }

      return ok({
        ...nextState,
        version: currentVersion
      })
    }
  }
}
