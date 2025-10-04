import { createQuerySource } from '../../../../../src/query/query-source-builder'
import type { QueryResolver } from '../../../../../src/types/query/query-resolver'
import type { CounterReadModel } from '../../shared/readmodel'
import type { CounterQuery, CounterQueryResult } from './types'

const resolver: QueryResolver<CounterQuery, CounterQueryResult, CounterReadModel> = {
  listCounters: async ({ query, store }) => {
    const options = {
      range: query.payload.range
    }
    const counters = await store.findMany('counter', options)
    return {
      type: 'listCounters',
      items: counters,
      total: counters.length
    }
  },
  getCounter: async ({ query, store }) => {
    const counter = await store.findById('counter', query.payload.id)
    if (!counter) {
      throw new Error(`Counter with id ${query.payload.id} not found`)
    }
    return {
      type: 'getCounter',
      item: counter
    }
  }
}

export const counterQuerySource = createQuerySource<
  CounterQuery,
  CounterQueryResult,
  CounterReadModel
>()
  .type('counter')
  .resolver(resolver)
  .build()
