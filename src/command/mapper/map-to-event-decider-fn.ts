import type { EventDecider, EventDeciderFn } from '../../types/command'
import type { Command, DomainEvent, State } from '../../types/core'

export function mapToEventDeciderFn<S extends State, C extends Command, E extends DomainEvent, _D>(
  deciders: EventDecider<S, C, E>
): EventDeciderFn<S, C, E> {
  return ({ ctx, state, command }) => {
    const deciderMap = deciders as Record<C['type'], EventDeciderFn<S, C, E>>
    const decider = deciderMap[command.type as C['type']]
    if (!decider) {
      throw new Error(`No decider found for type: ${String(command.type)}`)
    }

    return decider({
      ctx,
      state,
      command: command as Extract<C, { type: typeof command.type }>
    })
  }
}
