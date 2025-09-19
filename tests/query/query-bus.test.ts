import { describe, expect, test } from 'bun:test'
import { ReadModelStoreInMemory } from '../../src/adapter/read-model-store-in-memory'
import { createQueryBus } from '../../src/query/query-bus'
import { createQuerySource } from '../../src/query/query-source-builder'
import type { Query } from '../../src/types/core/query'
import type { QueryHandlerMiddleware } from '../../src/types/framework/query-bus'
import { querySources } from '../fixtures/counter-app/features/counter2/counter2-query'
import type { CounterQuery } from '../fixtures/counter-app/features/counter2/types'
import type { CounterReadModel } from '../fixtures/counter-app/shared/readmodel'

type GetCounterQuery = Extract<CounterQuery, { type: 'getCounter' }>
type ListCountersQuery = Extract<CounterQuery, { type: 'listCounters' }>

class TestReadModelStore extends ReadModelStoreInMemory<CounterReadModel> {}

describe('[query] query bus', () => {
  describe('createQueryBus', () => {
    test('should return a function when created with minimal configuration', () => {
      // Arrange
      const deps = { readModelStore: new TestReadModelStore() }

      // Act
      const queryBus = createQueryBus({ deps })

      // Assert
      expect(queryBus).toBeDefined()
      expect(typeof queryBus).toBe('function')
    })

    test('should return error when query type is invalid', async () => {
      // Arrange
      const deps = { readModelStore: new TestReadModelStore() }
      const queryBus = createQueryBus({ deps })

      const invalidQuery: Query = {
        type: ''
      }

      // Act
      const res = await queryBus(invalidQuery)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('INVALID_QUERY_TYPE')
        expect(res.error.message).toBe('query type is not valid')
      }
    })

    test('should return error when no resolver is found for query type', async () => {
      // Arrange
      const deps = { readModelStore: new TestReadModelStore() }
      const queryBus = createQueryBus({ deps })

      const query: Query = {
        type: 'unknown-query'
      }

      // Act
      const res = await queryBus(query)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('QUERY_RESOLVER_NOT_FOUND')
        expect(res.error.message).toBe('Handler for type unknown-query not found')
      }
    })

    test('should execute query successfully when resolver is found', async () => {
      // Arrange
      const testStore = new TestReadModelStore()
      testStore.addTestData([
        {
          type: 'counter',
          id: 'counter-1',
          count: 10
        }
      ])

      const deps = { readModelStore: testStore }
      const queryBus = createQueryBus({
        deps,
        querySources: querySources
      })

      const query: GetCounterQuery = {
        type: 'getCounter',
        payload: { id: 'counter-1' }
      }

      // Act
      const res = await queryBus(query)

      // Assert
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.value.data).toEqual({
          type: 'getCounter',
          item: {
            type: 'counter',
            id: 'counter-1',
            count: 10
          }
        })
      }
    })

    test('should handle list query with multiple items', async () => {
      // Arrange
      const testStore = new TestReadModelStore()
      testStore.addTestData([
        {
          type: 'counter',
          id: 'counter-1',
          count: 10
        },
        {
          type: 'counter',
          id: 'counter-2',
          count: 20
        },
        {
          type: 'counter',
          id: 'counter-3',
          count: 30
        }
      ])

      const deps = { readModelStore: testStore }
      const queryBus = createQueryBus({
        deps,
        querySources: querySources
      })

      const query: ListCountersQuery = {
        type: 'listCounters',
        payload: {
          range: {
            limit: 5,
            offset: 0
          }
        }
      }

      // Act
      const res = await queryBus(query)

      // Assert
      expect(res.ok).toBe(true)
      if (res.ok) {
        const data = res.value.data as unknown
        expect(data.type).toBe('listCounters')
        expect(data.items).toHaveLength(3)
        expect(data.total).toBe(3)
        expect(data.items[0]).toEqual({
          type: 'counter',
          id: 'counter-1',
          count: 10
        })
      }
    })

    test('should apply middleware in correct order', async () => {
      // Arrange
      const executionOrder: string[] = []

      const middleware1: QueryHandlerMiddleware = async (query, next) => {
        executionOrder.push('middleware1-start')
        const res = await next(query)
        executionOrder.push('middleware1-end')
        return res
      }

      const middleware2: QueryHandlerMiddleware = async (query, next) => {
        executionOrder.push('middleware2-start')
        const res = await next(query)
        executionOrder.push('middleware2-end')
        return res
      }

      const testStore = new TestReadModelStore()
      testStore.addTestData([
        {
          type: 'counter',
          id: 'counter-1',
          count: 10
        }
      ])

      const deps = { readModelStore: testStore }
      const queryBus = createQueryBus({
        deps,
        querySources: querySources,
        middleware: [middleware1, middleware2]
      })

      const query: GetCounterQuery = {
        type: 'getCounter',
        payload: { id: 'counter-1' }
      }

      // Act
      await queryBus(query)

      // Assert
      expect(executionOrder).toEqual([
        'middleware1-start',
        'middleware2-start',
        'middleware2-end',
        'middleware1-end'
      ])
    })

    test('should handle middleware that modifies result', async () => {
      // Arrange
      const loggingMiddleware: QueryHandlerMiddleware = async (query, next) => {
        const res = await next(query)
        if (res.ok) {
          return {
            ok: true,
            value: {
              type: `${res.value.type}-logged`,
              data: {
                ...res.value.data,
                logged: true
              }
            }
          }
        }
        return res
      }

      const testStore = new TestReadModelStore()
      testStore.addTestData([
        {
          type: 'counter',
          id: 'counter-1',
          count: 10
        }
      ])

      const deps = { readModelStore: testStore }
      const queryBus = createQueryBus({
        deps,
        querySources: querySources,
        middleware: [loggingMiddleware]
      })

      const query: GetCounterQuery = {
        type: 'getCounter',
        payload: { id: 'counter-1' }
      }

      // Act
      const res = await queryBus(query)

      // Assert
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.value.type).toBe('getCounter-logged')
        expect((res.value.data as unknown).logged).toBe(true)
      }
    })

    test('should handle missing data gracefully', async () => {
      // Arrange
      const testStore = new TestReadModelStore()
      // No data added - but the resolver handles it gracefully

      const safeResolver = {
        'safe-query': async ({ deps }: any) => {
          const items = await deps.readModelStore.findMany('counter', {})
          return {
            type: 'safe-query',
            items: items,
            total: items.length
          }
        }
      }

      const safeQuerySource = createQuerySource().type('safe-query').resolver(safeResolver).build()

      const deps = { readModelStore: testStore }
      const queryBus = createQueryBus({
        deps,
        querySources: [safeQuerySource]
      })

      const query = {
        type: 'safe-query'
      }

      // Act
      const res = await queryBus(query)

      // Assert
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect((res.value.data as unknown).total).toBe(0)
        expect((res.value.data as unknown).items).toEqual([])
      }
    })

    test('should handle empty query resolvers', async () => {
      // Arrange
      const deps = { readModelStore: new TestReadModelStore() }
      const queryBus = createQueryBus({
        deps
        // No queryResolvers provided
      })

      const query: Query = {
        type: 'any-query'
      }

      // Act
      const res = await queryBus(query)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('QUERY_RESOLVER_NOT_FOUND')
      }
    })
  })
})
