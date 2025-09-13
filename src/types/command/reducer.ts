import type { Draft } from 'immer'
import type { DomainEvent } from '../core/domain-event'
import type { State } from '../core/state'
import type { MutateOrReplace, ReducerMap, ReducerParams } from './reducer-fn'

export type Reducer<S extends State, E extends DomainEvent, RM extends ReducerMap<S, E> = never> = [
  RM
] extends [never]
  ? {
      [K in E['type']]: (
        params: ReducerParams<Draft<S>, Extract<E, { type: K }>>
      ) => MutateOrReplace<S>
    }
  : {
      [K in keyof RM]: (
        params: ReducerParams<Draft<Extract<S, { type: RM[K][number] }>>, Extract<E, { type: K }>>
      ) => MutateOrReplace<S>
    }
