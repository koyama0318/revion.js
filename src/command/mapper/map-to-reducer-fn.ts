import { produce } from 'immer'
import type { Reducer, ReducerFn } from '../../types/command'
import type { DomainEvent, State } from '../../types/core'

export function mapToReducerFn<S extends State, E extends DomainEvent>(
  reducers: Reducer<S, E>
): ReducerFn<S, E> {
  return ({ ctx, state, event }) => {
    const reducer = reducers[event.type as keyof typeof reducers]
    if (!reducer) {
      throw new Error(`No reducer found for event type: ${String(event.type)}`)
    }

    // Holds the new typed state if returned by the reducer
    let updatedTypedState = null

    const updatedState = produce(state, draft => {
      // The reducer mutates the draft in place. If it returns a value, store it as the typed state.
      const res = reducer({
        ctx,
        state: draft,
        event: event as Extract<E, { type: typeof event.type }>
      })
      if (res !== undefined) {
        // Validate that the returned value is a proper state object
        if (res === null || typeof res !== 'object') {
          throw new Error(
            `Reducer for event type "${String(event.type)}" returned invalid value: ${typeof res}. ` +
              'Reducers must return either undefined (to use mutated draft) or a valid state object.'
          )
        }
        updatedTypedState = res
      }
    })

    // reducer mutates draft in place, so result is always the new state
    return updatedTypedState ?? updatedState
  }
}
