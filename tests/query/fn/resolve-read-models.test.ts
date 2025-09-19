import { describe, expect, test } from 'bun:test'
import { ReadModelStoreInMemory } from '../../../src/adapter/read-model-store-in-memory'
import { createResolveReadModelFnFactory } from '../../../src/query/fn/resolve-read-models'
import type { Query, QueryResultData } from '../../../src/types/core/query'
import type { ResolverFn } from '../../../src/types/query/resolver-fn'
import type {
  CounterQuery,
  CounterQueryResult
} from '../../fixtures/counter-app/features/counter2/types'
import type { CounterReadModel } from '../../fixtures/counter-app/shared/readmodel'

type GetCounterQuery = Extract<CounterQuery, { type: 'getCounter' }>
type GetCounterQueryResult = Extract<CounterQueryResult, { type: 'getCounter' }>

class TestReadModelStore extends ReadModelStoreInMemory<CounterReadModel> {}

describe('[query] resolve read models function', () => {
  describe('createResolveReadModelFnFactory', () => {
    test('should return a function when resolver is provided', () => {
      // Arrange
      const resolver: ResolverFn<GetCounterQuery, GetCounterQueryResult> = async () => {
        return {
          type: 'getCounter',
          item: { type: 'counter', id: '1', count: 0 }
        }
      }
      const deps = { readModelStore: new TestReadModelStore() }

      // Act
      const resolveReadModelFn = createResolveReadModelFnFactory(resolver, deps)()

      // Assert
      expect(resolveReadModelFn).toBeDefined()
      expect(typeof resolveReadModelFn).toBe('function')
    })

    test('should return successful result when resolver executes successfully', async () => {
      // Arrange
      const resolver: ResolverFn<GetCounterQuery, GetCounterQueryResult> = ({ query }) => {
        return Promise.resolve({
          type: 'getCounter',
          item: {
            type: 'counter',
            id: query.payload.id,
            count: 42
          }
        })
      }
      const deps = { readModelStore: new TestReadModelStore() }
      const resolveReadModelFn = createResolveReadModelFnFactory(resolver, deps)()

      const query: GetCounterQuery = {
        type: 'getCounter',
        payload: { id: 'test-id' }
      }

      // Act
      const res = await resolveReadModelFn(query)

      // Assert
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.value).toEqual({
          type: 'getCounter',
          item: {
            type: 'counter',
            id: 'test-id',
            count: 42
          }
        })
      }
    })

    test('should pass context to resolver function', async () => {
      // Arrange
      let receivedContext: unknown
      const resolver: ResolverFn<GetCounterQuery, GetCounterQueryResult> = ({ ctx, query }) => {
        receivedContext = ctx
        return Promise.resolve({
          type: 'getCounter',
          item: {
            type: 'counter',
            id: query.payload.id,
            count: 0
          }
        })
      }
      const deps = { readModelStore: new TestReadModelStore() }
      const resolveReadModelFn = createResolveReadModelFnFactory(resolver, deps)()

      const query: GetCounterQuery = {
        type: 'getCounter',
        payload: { id: 'test-id' }
      }

      // Act
      await resolveReadModelFn(query)

      // Assert
      expect(receivedContext).toBeDefined()
      expect(receivedContext).toHaveProperty('timestamp')
      expect((receivedContext as unknown).timestamp).toBeInstanceOf(Date)
    })

    test('should pass deps to resolver function', async () => {
      // Arrange
      const testStore = new TestReadModelStore()
      testStore.addTestData([
        {
          type: 'counter',
          id: 'test-id',
          count: 55
        }
      ])

      const resolver: ResolverFn<GetCounterQuery, GetCounterQueryResult> = ({ query, deps }) => {
        return deps.readModelStore.findById('counter', query.payload.id).then(readModel => {
          if (!readModel) {
            throw new Error('Not found')
          }
          return {
            type: 'getCounter',
            item: readModel as CounterReadModel
          }
        })
      }

      const deps = { readModelStore: testStore }
      const resolveReadModelFn = createResolveReadModelFnFactory(resolver)(deps)

      const query: GetCounterQuery = {
        type: 'getCounter',
        payload: { id: 'test-id' }
      }

      // Act
      const res = await resolveReadModelFn(query)

      // Assert
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.value).toEqual({
          type: 'getCounter',
          item: {
            type: 'counter',
            id: 'test-id',
            count: 55
          }
        })
      }
    })

    test('should handle resolver returning null', async () => {
      // Arrange
      const resolver: ResolverFn<GetCounterQuery, GetCounterQueryResult> = () => {
        return null as unknown
      }
      const deps = { readModelStore: new TestReadModelStore() }
      const resolveReadModelFn = createResolveReadModelFnFactory(resolver, deps)()

      const query: GetCounterQuery = {
        type: 'getCounter',
        payload: { id: 'test-id' }
      }

      // Act
      const res = await resolveReadModelFn(query)

      // Assert
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.value).toBe(null)
      }
    })

    test('should handle resolver returning complex data structure', async () => {
      // Arrange
      const resolver: ResolverFn<Query, QueryResultData> = () => {
        return Promise.resolve({
          users: [
            { id: '1', name: 'Alice' },
            { id: '2', name: 'Bob' }
          ],
          pagination: {
            total: 2,
            page: 1,
            limit: 10
          },
          metadata: {
            timestamp: new Date().toISOString(),
            version: '1.0'
          }
        })
      }
      const deps = { readModelStore: new TestReadModelStore() }
      const resolveReadModelFn = createResolveReadModelFnFactory(resolver, deps)()

      const query: Query = {
        type: 'list-users'
      }

      // Act
      const res = await resolveReadModelFn(query)

      // Assert
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.value).toHaveProperty('users')
        expect(res.value).toHaveProperty('pagination')
        expect(res.value).toHaveProperty('metadata')
        expect(Array.isArray((res.value as unknown).users)).toBe(true)
      }
    })
  })
})
