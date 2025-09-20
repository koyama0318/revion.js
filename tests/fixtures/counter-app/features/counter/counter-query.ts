import { createQuerySource } from '../../../../../src/query/query-source-builder'
import type { QueryResolver } from '../../../../../src/types/query/query-resolver'
import type { CounterQueryDeps } from './counter-dependency'
import type { CounterQuery, CounterQueryResult } from './types'

const resolver: QueryResolver<CounterQuery, CounterQueryResult, CounterQueryDeps> = {
  listCounters: async ({ query, deps }) => {
    const options = {
      range: query.payload.range
    }
    const counters = await deps.readModelStore.findMany('counter', options)
    return {
      type: 'listCounters',
      items: counters,
      total: counters.length
    }
  },
  getCounter: async ({ query, deps }) => {
    const counter = await deps.readModelStore.findById('counter', query.payload.id)
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
  CounterQueryDeps
>()
  .type('counter')
  .resolver(resolver)
  .build()
