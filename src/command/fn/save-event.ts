import type { EventStore } from '../../types/adapter'
import type {
  DomainEvent,
  ExtendedDomainEvent,
  ExtendedState,
  Snapshot,
  State
} from '../../types/core'
import type { AppError, AsyncResult } from '../../types/utils'
import { err, ok, toAsyncResult } from '../../utils/result'

export const SNAPSHOT_INTERVAL = 100

export type SaveEventFn<S extends State, E extends DomainEvent> = (
  state: ExtendedState<S>,
  event: ExtendedDomainEvent<E>
) => AsyncResult<void, AppError>

export function createSaveEventFnFactory<S extends State, E extends DomainEvent>(): (
  eventStore: EventStore
) => SaveEventFn<S, E> {
  return (eventStore: EventStore) => {
    return async (state: ExtendedState<S>, event: ExtendedDomainEvent<E>) => {
      if (state.version !== event.version) {
        return err({
          code: 'VERSION_MISMATCH',
          message: `State and event versions mismatch: state version: ${state.version}, event version: ${event.version}`
        })
      }

      const gotVersion = await toAsyncResult(() => eventStore.getLastEventVersion(state.id))
      if (!gotVersion.ok) {
        return err({
          code: 'LAST_EVENT_VERSION_CANNOT_BE_LOADED',
          message: 'Last event version cannot be loaded',
          cause: gotVersion.error
        })
      }

      if (gotVersion.value + 1 !== event.version) {
        return err({
          code: 'EVENT_VERSION_CONFLICT',
          message: `Event version mismatch: expected: ${gotVersion.value + 1}, received: ${event.version}`
        })
      }

      if (state.version >= SNAPSHOT_INTERVAL) {
        const snapshot: Snapshot<S> = {
          ...state,
          timestamp: new Date()
        }

        const savedSnapshot = await toAsyncResult(() => eventStore.saveSnapshot(snapshot))
        if (!savedSnapshot.ok) {
          return err({
            code: 'SNAPSHOT_CANNOT_BE_SAVED',
            message: 'Snapshot cannot be saved',
            cause: savedSnapshot.error
          })
        }
      }

      const savedEvents = await toAsyncResult(() => eventStore.saveEvent(event))
      if (!savedEvents.ok) {
        return err({
          code: 'EVENTS_CANNOT_BE_SAVED',
          message: 'Events cannot be saved',
          cause: savedEvents.error
        })
      }

      return ok(undefined)
    }
  }
}
