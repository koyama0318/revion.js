import type { Command, DomainEvent } from '../core'

export type PolicyContext = {
  readonly timestamp: Date
}

export type PolicyMap<E extends DomainEvent, C extends Command> = {
  [K in E['type']]: C['type'][]
}

export type PolicyParams<E extends DomainEvent> = {
  ctx: PolicyContext
  event: E
}

export type PolicyFn<E extends DomainEvent, C extends Command> = (
  params: PolicyParams<E>
) => C | null
