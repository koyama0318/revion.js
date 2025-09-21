import { describe, expect, test } from 'bun:test'
import { ReadModelStoreInMemory } from '../../src/adapter/read-model-store-in-memory'
import { createQueryHandlers } from '../../src/query/query-handler'
import { counterQuerySource } from '../fixtures/counter-app/features/counter/counter-query'
import type { CounterQuery } from '../fixtures/counter-app/features/counter2/types'

describe('[query] query handler', () => {
  describe('createQueryHandlers', () => {
    describe('successful query handling', () => {
      test('should handle single item query', async () => {
        // Arrange
        const store = new ReadModelStoreInMemory()
        await store.save({
          type: 'counter',
          id: 'counter-1',
          count: 10
        })
        const deps = { readModelStore: store }
        const handlers = createQueryHandlers(deps, [counterQuerySource])

        // Act
        const query: CounterQuery = {
          type: 'getCounter',
          sourceType: 'counter',
          payload: { id: 'counter-1' }
        }
        const res = await handlers['counter'](query)

        // Assert
        expect(res.ok).toBe(true)
        if (res.ok) {
          expect(res.value.type).toBe('getCounter')
          expect(res.value.data.item).toEqual({ type: 'counter', id: 'counter-1', count: 10 })
        }
      })

      test('should handle list query', async () => {
        // Arrange
        const store = new ReadModelStoreInMemory()
        await store.save({
          type: 'counter',
          id: 'counter-1',
          count: 10
        })
        const deps = { readModelStore: store }
        const handlers = createQueryHandlers(deps, [counterQuerySource])

        const query: CounterQuery = {
          type: 'listCounters',
          sourceType: 'counter',
          payload: { range: { limit: 10, offset: 0 } }
        }

        // Act
        const res = await handlers['counter'](query)

        // Assert
        expect(res.ok).toBe(true)
        if (res.ok) {
          expect(res.value.type).toBe('listCounters')
          expect(res.value.data.items).toHaveLength(1)
          expect(res.value.data.items).toEqual([{ type: 'counter', id: 'counter-1', count: 10 }])
        }
      })

      test('should handle non-existent items gracefully', async () => {
        // Arrange
        const store = new ReadModelStoreInMemory()
        const deps = { readModelStore: store }
        const handlers = createQueryHandlers(deps, [counterQuerySource])

        const query: CounterQuery = {
          type: 'listCounters',
          sourceType: 'counter',
          payload: { range: { limit: 10, offset: 0 } }
        }

        // Act
        const res = await handlers['counter'](query)

        // Assert
        expect(res.ok).toBe(true)
        if (res.ok) {
          expect(res.value.type).toBe('listCounters')
          expect(res.value.data.items).toHaveLength(0)
          expect(res.value.data.total).toBe(0)
        }
      })
    })

    describe('error handling', () => {
      test('should handle resolver function errors when item not found', async () => {
        // Arrange
        const store = new ReadModelStoreInMemory()
        const deps = { readModelStore: store }
        const handlers = createQueryHandlers(deps, [counterQuerySource])

        const query: CounterQuery = {
          type: 'getCounter',
          sourceType: 'counter',
          payload: { id: 'nonexistent-id' }
        }

        // Act
        const res = await handlers['counter'](query)

        // Assert
        expect(res.ok).toBe(false)
        if (!res.ok) {
          expect(res.error.code).toBe('RESOLVER_EXECUTION_FAILED')
        }
      })

      test('should handle store errors during findById operation', async () => {
        // Arrange
        const store = new ReadModelStoreInMemory()
        // Make findById throw error
        store.findById = async () => {
          throw new Error('Database connection lost')
        }

        const deps = { readModelStore: store }
        const handlers = createQueryHandlers(deps, [counterQuerySource])

        const query: CounterQuery = {
          type: 'getCounter',
          sourceType: 'counter',
          payload: { id: 'test-1' }
        }

        // Act
        const res = await handlers['counter'](query)

        // Assert
        expect(res.ok).toBe(false)
        if (!res.ok) {
          expect(res.error.code).toBe('RESOLVER_EXECUTION_FAILED')
          expect(res.error.message).toContain('Database connection lost')
        }
      })

      test('should handle store errors during findMany operation', async () => {
        // Arrange
        const store = new ReadModelStoreInMemory()
        // Make findMany throw error
        store.findMany = async () => {
          throw new Error('Query timeout')
        }

        const deps = { readModelStore: store }
        const handlers = createQueryHandlers(deps, [counterQuerySource])

        const query: CounterQuery = {
          type: 'listCounters',
          sourceType: 'counter',
          payload: { range: { limit: 10, offset: 0 } }
        }

        // Act
        const res = await handlers['counter'](query)

        // Assert
        expect(res.ok).toBe(false)
        if (!res.ok) {
          expect(res.error.code).toBe('RESOLVER_EXECUTION_FAILED')
          expect(res.error.message).toContain('Query timeout')
        }
      })

      test('should handle invalid query types', async () => {
        // Arrange
        const store = new ReadModelStoreInMemory()
        const deps = { readModelStore: store }
        const handlers = createQueryHandlers(deps, [counterQuerySource])

        const query = {
          type: 'invalidQuery',
          sourceType: 'counter',
          payload: { id: 'test-1' }
        } as unknown as CounterQuery

        // Act
        const res = await handlers['counter'](query)

        // Assert
        expect(res.ok).toBe(false)
        if (!res.ok) {
          expect(res.error.code).toBe('RESOLVER_EXECUTION_FAILED')
        }
      })
    })
  })
})
