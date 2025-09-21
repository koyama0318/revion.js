import type { EventDecider, EventDeciderFn } from '../../types/command'
import type { Command, DomainEvent, State } from '../../types/core'

export function mapToEventDeciderFn<S extends State, C extends Command, E extends DomainEvent, D>(
  deciders: EventDecider<S, C, E, D>
): EventDeciderFn<S, C, E, D> {
  return ({ ctx, state, command, deps }) => {
    const deciderMap = deciders as Record<C['type'], EventDeciderFn<S, C, E, D>>
    const decider = deciderMap[command.type as C['type']]
    if (!decider) {
      throw new Error(`No decider found for type: ${String(command.type)}`)
    }

    return decider({
      ctx,
      state,
      command: command as Extract<C, { type: typeof command.type }>,
      deps
    })
  }
}
