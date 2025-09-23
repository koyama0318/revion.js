import { describe, expect, test } from 'bun:test'
import { ReadModelStoreInMemory } from '../../src/adapter/read-model-store-in-memory'
import { createQueryBus } from '../../src/query/query-bus'
import type { Query } from '../../src/types/core'
import type { QueryHandlerMiddleware } from '../../src/types/framework'
import { counterQuerySource } from '../fixtures/counter-app/features/counter/counter-query'
import type {
  CounterQuery,
  CounterQueryResult
} from '../fixtures/counter-app/features/counter2/types'

describe('query-bus', () => {
  describe('createQueryBus', () => {
    test('should return a function when created with minimal configuration', () => {
      // Arrange
      const deps = { readModelStore: new ReadModelStoreInMemory() }

      // Act
      const queryBus = createQueryBus({ deps })

      // Assert
      expect(queryBus).toBeDefined()
      expect(typeof queryBus).toBe('function')
    })

    test('should execute query successfully when resolver is found', async () => {
      // Arrange
      const testStore = new ReadModelStoreInMemory()
      await testStore.save({
        type: 'counter',
        id: 'counter-1',
        count: 10
      })

      const deps = { readModelStore: testStore }
      const queryBus = createQueryBus({
        deps,
        querySources: [counterQuerySource]
      })

      const query: CounterQuery = {
        type: 'getCounter',
        sourceType: 'counter',
        payload: { id: 'counter-1' }
      }

      // Act
      const res = await queryBus(query)

      // Assert
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.value.data).toEqual({
          type: 'getCounter',
          item: { type: 'counter', id: 'counter-1', count: 10 }
        })
      }
    })

    test('should handle list query with multiple items', async () => {
      // Arrange
      const testStore = new ReadModelStoreInMemory()
      await testStore.save({
        type: 'counter',
        id: 'counter-1',
        count: 10
      })
      await testStore.save({
        type: 'counter',
        id: 'counter-2',
        count: 20
      })
      await testStore.save({
        type: 'counter',
        id: 'counter-3',
        count: 30
      })

      const deps = { readModelStore: testStore }
      const queryBus = createQueryBus({
        deps,
        querySources: [counterQuerySource]
      })

      const query: CounterQuery = {
        type: 'listCounters',
        sourceType: 'counter',
        payload: {
          range: { limit: 5, offset: 0 }
        }
      }

      // Act
      const res = await queryBus(query)

      // Assert
      expect(res.ok).toBe(true)
      if (res.ok) {
        const data = res.value.data as CounterQueryResult
        expect(data.type).toBe('listCounters')
        if (data.type === 'listCounters') {
          expect(data.items).toHaveLength(3)
          expect(data.items[0]).toEqual({
            type: 'counter',
            id: 'counter-1',
            count: 10
          })
          expect(data.items[1]).toEqual({
            type: 'counter',
            id: 'counter-2',
            count: 20
          })
          expect(data.items[2]).toEqual({
            type: 'counter',
            id: 'counter-3',
            count: 30
          })
          expect(data.total).toBe(3)
        }
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

      const testStore = new ReadModelStoreInMemory()
      await testStore.save({
        type: 'counter',
        id: 'counter-1',
        count: 10
      })

      const deps = { readModelStore: testStore }
      const queryBus = createQueryBus({
        deps,
        querySources: [counterQuerySource],
        middleware: [middleware1, middleware2]
      })

      const query: CounterQuery = {
        type: 'getCounter',
        sourceType: 'counter',
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

      const testStore = new ReadModelStoreInMemory()
      await testStore.save({
        type: 'counter',
        id: 'counter-1',
        count: 10
      })

      const deps = { readModelStore: testStore }
      const queryBus = createQueryBus({
        deps,
        querySources: [counterQuerySource],
        middleware: [loggingMiddleware]
      })

      const query: CounterQuery = {
        type: 'getCounter',
        sourceType: 'counter',
        payload: { id: 'counter-1' }
      }

      // Act
      const res = await queryBus(query)

      // Assert
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.value.type).toBe('getCounter-logged')
        expect(res.value.data.logged).toBe(true)
      }
    })

    test('should return error when query type is invalid', async () => {
      // Arrange
      const deps = { readModelStore: new ReadModelStoreInMemory() }
      const queryBus = createQueryBus({ deps })

      const invalidQuery: Query = {
        type: '',
        sourceType: 'any-query'
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
      const deps = { readModelStore: new ReadModelStoreInMemory() }
      const queryBus = createQueryBus({ deps })

      const query: Query = {
        type: 'any-query',
        sourceType: 'unknown-query'
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

    test('should handle empty query resolvers', async () => {
      // Arrange
      const deps = { readModelStore: new ReadModelStoreInMemory() }
      const queryBus = createQueryBus({
        deps
      })

      const query: Query = {
        type: 'any-query',
        sourceType: 'any-query'
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
