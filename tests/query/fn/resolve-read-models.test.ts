import { describe, expect, test } from 'bun:test'
import { ReadModelStoreInMemory } from '../../../src/adapter/read-model-store-in-memory'
import { createResolveReadModelFnFactory } from '../../../src/query/fn/resolve-read-models'
import type { ResolverContext, ResolverFn } from '../../../src/types/query/resolver-fn'
import type { CounterQuery, CounterQueryResult } from '../../fixtures/counter-app/features/counter'
import type { CounterReadModel } from '../../fixtures/counter-app/shared/readmodel'

type Deps = {
  readModelStore: ReadModelStoreInMemory
}

describe('[query] resolve read models function', () => {
  describe('createResolveReadModelFnFactory', () => {
    test('should return a function when resolver is provided', () => {
      // Arrange
      const resolver: ResolverFn<CounterQuery, CounterQueryResult, Deps> = async () => {
        return {
          type: 'getCounter',
          item: { type: 'counter', id: '1', count: 0 }
        }
      }
      const deps = { readModelStore: new ReadModelStoreInMemory() }

      // Act
      const resolveReadModelFn = createResolveReadModelFnFactory(resolver)(deps)

      // Assert
      expect(resolveReadModelFn).toBeDefined()
      expect(typeof resolveReadModelFn).toBe('function')
    })

    test('should return successful result when resolver executes successfully', async () => {
      // Arrange
      type CounterQuery = { type: 'getCounter'; payload: { id: string } }
      type CounterQueryResult = { type: 'getCounter'; item: CounterReadModel }

      const resolver: ResolverFn<CounterQuery, CounterQueryResult, Deps> = ({ query }) => {
        return Promise.resolve({
          type: 'getCounter',
          item: {
            type: 'counter',
            id: query.payload.id,
            count: 42
          }
        })
      }
      const deps = { readModelStore: new ReadModelStoreInMemory() }
      const resolveReadModelFn = createResolveReadModelFnFactory(resolver)(deps)

      const query: CounterQuery = {
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
      type CounterQuery = { type: 'getCounter'; payload: { id: string } }
      type CounterQueryResult = { type: 'getCounter'; item: CounterReadModel }

      let receivedContext: unknown
      const resolver: ResolverFn<CounterQuery, CounterQueryResult, Deps> = ({ ctx, query }) => {
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
      const deps = { readModelStore: new ReadModelStoreInMemory() }
      const resolveReadModelFn = createResolveReadModelFnFactory(resolver)(deps)

      const query: CounterQuery = {
        type: 'getCounter',
        payload: { id: 'test-id' }
      }

      // Act
      await resolveReadModelFn(query)

      // Assert
      expect(receivedContext).toBeDefined()
      expect(receivedContext).toHaveProperty('timestamp')
      expect((receivedContext as ResolverContext).timestamp).toBeInstanceOf(Date)
    })

    test('should pass deps to resolver function', async () => {
      // Arrange
      type CounterQuery = { type: 'getCounter'; payload: { id: string } }
      type CounterQueryResult = { type: 'getCounter'; item: CounterReadModel }

      const testStore = new ReadModelStoreInMemory()
      await testStore.save({
        type: 'counter',
        id: 'test-id',
        count: 55
      })
      const resolver: ResolverFn<CounterQuery, CounterQueryResult, Deps> = ({ query, deps }) => {
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

      const query: CounterQuery = {
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
      type CounterQuery = { type: 'getCounter'; payload: { id: string } }
      type CounterQueryResult = { type: 'getCounter'; item: CounterReadModel }

      const resolver: ResolverFn<CounterQuery, CounterQueryResult, Deps> = () => {
        return null as unknown as Promise<CounterQueryResult>
      }
      const deps = { readModelStore: new ReadModelStoreInMemory() }
      const resolveReadModelFn = createResolveReadModelFnFactory(resolver)(deps)

      const query: CounterQuery = {
        type: 'getCounter',
        payload: { id: 'test-id' }
      }

      // Act
      const res = await resolveReadModelFn(query)

      // Assert
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.value).toBeNull()
      }
    })
  })
})
