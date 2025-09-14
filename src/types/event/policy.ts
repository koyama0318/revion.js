import type { Command, DomainEvent } from '../core'
import type { PolicyFn, PolicyMap } from './policy-fn'

export type Policy<E extends DomainEvent, C extends Command, PM extends PolicyMap<E, C> = never> = [
  PM
] extends [never]
  ? {
      [K in E['type']]: PolicyFn<Extract<E, { type: K }>, C>
    }
  : {
      [K in keyof PM]: PM[K][number] extends never
        ? PolicyFn<Extract<E, { type: K }>, never>
        : PolicyFn<Extract<E, { type: K }>, Extract<C, { type: PM[K][number] }>>
    }
