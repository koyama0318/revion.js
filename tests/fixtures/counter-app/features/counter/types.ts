import type { AggregateId } from '../../../../../src/types/core'
import type { AchievementReadModel, CounterReadModel } from '../../shared/readmodel'

export type CounterId = AggregateId<'counter'>

export type CounterState = {
  type: 'active'
  id: CounterId
  count: number
}

export type CounterCommand =
  | { type: 'create'; id: CounterId; payload: { count: number } }
  | { type: 'increment'; id: CounterId }
  | { type: 'decrement'; id: CounterId }

export type CounterEvent =
  | { type: 'created'; id: CounterId; payload: { count: number } }
  | { type: 'incremented'; id: CounterId }
  | { type: 'decremented'; id: CounterId }

export type CounterReadModels = CounterReadModel | AchievementReadModel

export type CounterQuery =
  | {
      type: 'listCounters'
      sourceType: 'counter'
      payload: {
        range: {
          limit: number
          offset: number
        }
      }
    }
  | {
      type: 'getCounter'
      sourceType: 'counter'
      payload: {
        id: string
      }
    }

export type CounterQueryResult =
  | {
      type: 'listCounters'
      items: CounterReadModel[]
      total: number
    }
  | {
      type: 'getCounter'
      item: CounterReadModel
    }
