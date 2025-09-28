import { produce } from 'immer'
import type { Reducer, ReducerFn } from '../../types/command'
import type { DomainEvent, State } from '../../types/core'

export function mapToReducerFn<S extends State, E extends DomainEvent>(
  reducers: Reducer<S, E>
): ReducerFn<S, E> {
  return ({ ctx, state, event }) => {
    const reducerFn = reducers[event.type as keyof typeof reducers]
    if (!reducerFn) {
      throw new Error(`No reducer found for event type: "${String(event.type)}"`)
    }

    const producedState = produce(state, draft => {
      const params = {
        ctx,
        state: draft,
        event: event as Extract<E, { type: typeof event.type }>
      }

      const result = reducerFn(params)
      if (result === undefined) {
        // Reducer mutated the draft in-place → immer will return the new state automatically.
        return
      }

      if (result === null || typeof result !== 'object') {
        throw new Error(
          `Reducer for event "${String(event.type)}" returned an invalid value (${typeof result}). ` +
            'Expected either undefined (mutate draft) or a valid state object.'
        )
      }

      // biome-ignore lint/suspicious/noExplicitAny: 'result is used to store the result of the reducer function'
      return result as any
    })

    // If the reducer returned a new state object, use it; otherwise, use the produced draft result.
    return producedState
  }
}
