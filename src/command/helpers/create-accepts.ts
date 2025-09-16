import type {
  AcceptsCommandFn,
  AcceptsEventFn,
  ApplyEventType,
  EventDeciderMap,
  ReducerMap
} from '../../types/command'
import type { Command, DomainEvent, State } from '../../types/core'

// Checks if a value's type exists in the array associated with the key's type in the map.
const isMapMatch = <T extends { type: string }, U extends { type: string }>(
  map: Record<string, string[]>,
  key: T,
  val: U
) => {
  return (map[key.type] ?? []).includes(val.type)
}

// Checks if the array associated with the key's type in the map exists but is empty.
const isMapVoid = <T extends { type: string }>(map: Record<string, string[]>, key: T) => {
  return map[key.type] !== undefined && map[key.type] !== null && map[key.type]?.length === 0
}

export const createAcceptsCommand = <S extends State, C extends Command>(
  map: EventDeciderMap<S, C>
): AcceptsCommandFn<S, C> => {
  return (state: S, command: C, eventType: ApplyEventType) => {
    // If no map is provided, accept any command for any state.
    if (Object.keys(map).length === 0) return true

    return eventType === 'create' ? isMapVoid(map, command) : isMapMatch(map, command, state)
  }
}

export const createAcceptsEvent = <S extends State, E extends DomainEvent>(
  map: ReducerMap<S, E>
): AcceptsEventFn<S, E> => {
  return (state: S, event: E, eventType: ApplyEventType) => {
    // If no map is provided, accept any event for any state.
    if (Object.keys(map).length === 0) return true

    return eventType === 'create' ? isMapVoid(map, event) : isMapMatch(map, event, state)
  }
}
