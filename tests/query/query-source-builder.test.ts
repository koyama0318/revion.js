import { describe, expect, test } from 'bun:test'
import { createQuerySource } from '../../src/query/query-source-builder'
import type { QueryResolver } from '../../src/types/query'
import type { CounterReadModel } from '../fixtures/counter-app/shared/readmodel'

type CounterQuery = {
  type: 'getCounter'
  sourceType: 'counter'
  payload: { id: string }
}

type CounterMultiQuery =
  | CounterQuery
  | {
      type: 'listCounters'
      sourceType: 'counter'
      payload: { range: { limit: number; offset: number } }
    }

type CounterQueryResult = {
  type: 'getCounter'
  item: { id: string; count: number }
}

type CounterMultiQueryResult =
  | CounterQueryResult
  | {
      type: 'listCounters'
      items: { id: string; count: number }[]
      total: number
    }

describe('[query] query source builder', () => {
  describe('createQuerySource', () => {
    test('should build valid query source with all required methods', async () => {
      // Arrange
      const resolver: QueryResolver<CounterQuery, CounterQueryResult> = {
        getCounter: async ({ query, store }) => {
          const item = (await store.findById(
            'counter',
            query.payload.id
          )) as CounterReadModel | null
          if (!item) {
            throw new Error(`Counter with id ${query.payload.id} not found`)
          }

          return { type: 'getCounter', item: { id: item.id, count: item.count } }
        }
      }

      // Act
      const querySource = createQuerySource<CounterQuery, CounterQueryResult>()
        .type('getCounter')
        .resolver(resolver)
        .build()

      // Assert
      expect(querySource.type).toBe('getCounter')
      expect(typeof querySource.queryResolver).toBe('function')
    })

    test('should enforce correct method call order - type first', () => {
      // Arrange & Act
      const builder = createQuerySource<CounterQuery, CounterQueryResult>()

      // Assert - Should have type method
      expect(typeof builder.type).toBe('function')

      // After calling type, should have resolver method
      const builderWithType = builder.type('getCounter')
      expect(typeof builderWithType.resolver).toBe('function')
    })

    test('should enforce correct method call order - resolver after type', () => {
      // Arrange
      const resolver: QueryResolver<CounterQuery, CounterQueryResult> = {
        getCounter: async ({ query, store }) => {
          const item = (await store.findById(
            'counter',
            query.payload.id
          )) as CounterReadModel | null
          if (!item) {
            throw new Error(`Counter with id ${query.payload.id} not found`)
          }

          return { type: 'getCounter', item: { id: item.id, count: item.count } }
        }
      }

      const builderWithType = createQuerySource<CounterQuery, CounterQueryResult>().type(
        'getCounter'
      )

      // Act
      const builderWithResolver = builderWithType.resolver(resolver)

      // Assert
      expect(typeof builderWithResolver.build).toBe('function')
    })

    test('should allow build only after all required properties are set', () => {
      // Arrange
      const resolver: QueryResolver<CounterQuery, CounterQueryResult> = {
        getCounter: async ({ query, store }) => {
          const item = (await store.findById(
            'counter',
            query.payload.id
          )) as CounterReadModel | null
          if (!item) {
            throw new Error(`Counter with id ${query.payload.id} not found`)
          }

          return { type: 'getCounter', item: { id: item.id, count: item.count } }
        }
      }

      const completeBuilder = createQuerySource<CounterQuery, CounterQueryResult>()
        .type('getCounter')
        .resolver(resolver)

      // Act
      expect(typeof completeBuilder.build).toBe('function')
      const result = completeBuilder.build()

      // Assert
      expect(result.type).toBe('getCounter')
      expect(typeof result.queryResolver).toBe('function')
    })

    test('should handle multiple query types in resolver', () => {
      // Arrange
      const resolver: QueryResolver<CounterMultiQuery, CounterMultiQueryResult> = {
        getCounter: async ({ query, store }) => {
          const item = (await store.findById(
            'counter',
            query.payload.id
          )) as CounterReadModel | null
          if (!item) {
            throw new Error(`Counter with id ${query.payload.id} not found`)
          }

          return { type: 'getCounter', item: { id: item.id, count: item.count } }
        },
        listCounters: async ({ query, store }) => {
          const items = (await store.findMany('counter', {
            range: query.payload.range
          })) as CounterReadModel[]

          return { type: 'listCounters', items: items, total: items.length }
        }
      }

      // Act
      const querySource = createQuerySource<CounterMultiQuery, CounterMultiQueryResult>()
        .type('getCounter')
        .resolver(resolver)
        .build()

      // Assert
      expect(querySource.type).toBe('getCounter')
      expect(typeof querySource.queryResolver).toBe('function')
    })
  })
})
