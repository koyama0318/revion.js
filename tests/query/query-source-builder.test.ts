import { describe, expect, test } from 'bun:test'
import { createQuerySource, fromQueryResolver } from '../../src/query/query-source-builder'
import type { QueryResolver } from '../../src/types/query'

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
  item: { id: string; name: string }
}

type CounterMultiQueryResult =
  | CounterQueryResult
  | {
      type: 'listCounters'
      items: { id: string; name: string }[]
      total: number
    }

type CounterQueryDeps = {
  service: {
    getById: (id: string) => { id: string; name: string }
    getAll: (range: { limit: number; offset: number }) => { id: string; name: string }[]
  }
}

describe('query-source-builder', () => {
  describe('createQuerySource', () => {
    test('should build valid query source with all required methods', () => {
      // Arrange
      const resolver: QueryResolver<CounterQuery, CounterQueryResult, CounterQueryDeps> = {
        getCounter: async ({ query, deps }) => {
          const item = deps.service.getById(query.payload.id)
          return {
            type: 'getCounter',
            item
          }
        }
      }

      // Act
      const querySource = createQuerySource<CounterQuery, CounterQueryResult, CounterQueryDeps>()
        .type('getCounter')
        .resolver(resolver)
        .build()

      // Assert
      expect(querySource.type).toBe('getCounter')
      expect(typeof querySource.queryResolver).toBe('function')
    })

    test('should enforce correct method call order - type first', () => {
      // Arrange & Act
      const builder = createQuerySource<CounterQuery, CounterQueryResult, CounterQueryDeps>()

      // Assert - Should have type method
      expect(typeof builder.type).toBe('function')

      // After calling type, should have resolver method
      const builderWithType = builder.type('getCounter')
      expect(typeof builderWithType.resolver).toBe('function')
    })

    test('should enforce correct method call order - resolver after type', () => {
      // Arrange
      const resolver: QueryResolver<CounterQuery, CounterQueryResult, CounterQueryDeps> = {
        getCounter: async ({ query, deps }) => {
          const item = deps.service.getById(query.payload.id)
          return {
            type: 'getCounter',
            item
          }
        }
      }

      const builderWithType = createQuerySource<
        CounterQuery,
        CounterQueryResult,
        CounterQueryDeps
      >().type('getCounter')

      // Act
      const builderWithResolver = builderWithType.resolver(resolver)

      // Assert
      expect(typeof builderWithResolver.build).toBe('function')
    })

    test('should allow build only after all required properties are set', () => {
      // Arrange
      const resolver: QueryResolver<CounterQuery, CounterQueryResult, CounterQueryDeps> = {
        getCounter: async ({ query, deps }) => {
          const item = deps.service.getById(query.payload.id)
          return {
            type: 'getCounter',
            item
          }
        }
      }

      const completeBuilder = createQuerySource<
        CounterQuery,
        CounterQueryResult,
        CounterQueryDeps
      >()
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
      const resolver: QueryResolver<
        CounterMultiQuery,
        CounterMultiQueryResult,
        CounterQueryDeps
      > = {
        getCounter: async ({ query, deps }) => {
          const item = deps.service.getById(query.payload.id)
          return { type: 'getCounter', item }
        },
        listCounters: async ({ query, deps }) => {
          const items = deps.service.getAll(query.payload.range)
          return { type: 'listCounters', items, total: items.length }
        }
      }

      // Act
      const querySource = createQuerySource<
        CounterMultiQuery,
        CounterMultiQueryResult,
        CounterQueryDeps
      >()
        .type('getCounter')
        .resolver(resolver)
        .build()

      // Assert
      expect(querySource.type).toBe('getCounter')
      expect(typeof querySource.queryResolver).toBe('function')
    })

  })

  describe('fromQueryResolver', () => {
    test('should convert QueryResolver to ResolverFn', async () => {
      // Arrange
      const resolver: QueryResolver<CounterQuery, CounterQueryResult, CounterQueryDeps> = {
        getCounter: async ({ query, deps }) => {
          const item = deps.service.getById(query.payload.id)
          return {
            type: 'getCounter',
            item
          }
        }
      }

      const mockDeps: CounterQueryDeps = {
        service: {
          getById: (id: string) => ({ id, name: `Test ${id}` }),
          getAll: (_range: { limit: number; offset: number }) => [
            { id: 'test-123', name: 'Test test-123' }
          ]
        }
      }

      const resolverFn = fromQueryResolver(resolver)

      // Act
      const res = await resolverFn({
        ctx: { timestamp: new Date() },
        query: {
          type: 'getCounter',
          sourceType: 'counter',
          payload: { id: 'test-123' }
        },
        deps: mockDeps
      })

      // Assert
      expect(res).toEqual({
        type: 'getCounter',
        item: {
          id: 'test-123',
          name: 'Test test-123'
        }
      })
    })

    test('should throw error for unknown query type', async () => {
      // Arrange
      const resolver: QueryResolver<CounterQuery, CounterQueryResult, CounterQueryDeps> = {
        getCounter: async ({ query, deps }) => {
          const item = deps.service.getById(query.payload.id)
          return {
            type: 'getCounter',
            item
          }
        }
      }

      const mockDeps: CounterQueryDeps = {
        service: {
          getById: (id: string) => ({ id, name: `Test ${id}` }),
          getAll: (_range: { limit: number; offset: number }) => [
            { id: 'test-123', name: 'Test test-123' }
          ]
        }
      }

      const resolverFn = fromQueryResolver(resolver)

      // Act & Assert
      await expect(
        resolverFn({
          ctx: { timestamp: new Date() },
          query: {
            type: 'unknownQuery' as unknown as CounterQuery['type'],
            sourceType: 'counter',
            payload: { id: 'test-123' }
          },
          deps: mockDeps
        })
      ).rejects.toThrow('No resolver found for type: unknownQuery')
    })

    test('should handle multiple query types in resolver function', async () => {
      // Arrange
      const resolver: QueryResolver<
        CounterMultiQuery,
        CounterMultiQueryResult,
        CounterQueryDeps
      > = {
        getCounter: async ({ query, deps }) => {
          const item = deps.service.getById(query.payload.id)
          return {
            type: 'getCounter',
            item
          }
        },
        listCounters: async ({ query, deps }) => {
          const items = deps.service.getAll(query.payload.range)
          return {
            type: 'listCounters',
            items,
            total: items.length
          }
        }
      }

      const mockDeps: CounterQueryDeps = {
        service: {
          getById: (id: string) => ({ id, name: `Test ${id}` }),
          getAll: (_range: { limit: number; offset: number }) => [
            { id: 'test-123', name: 'Test test-123' }
          ]
        }
      }

      const resolverFn = fromQueryResolver(resolver)

      // Act
      const counterResult = await resolverFn({
        ctx: { timestamp: new Date() },
        query: {
          type: 'getCounter',
          sourceType: 'counter',
          payload: { id: 'test-123' }
        },
        deps: mockDeps
      })

      const listResult = await resolverFn({
        ctx: { timestamp: new Date() },
        query: {
          type: 'listCounters',
          sourceType: 'counter',
          payload: { range: { limit: 10, offset: 0 } }
        },
        deps: mockDeps
      })

      // Assert
      expect(counterResult).toEqual({
        type: 'getCounter',
        item: {
          id: 'test-123',
          name: 'Test test-123'
        }
      })

      expect(listResult).toEqual({
        type: 'listCounters',
        items: [
          {
            id: 'test-123',
            name: 'Test test-123'
          }
        ],
        total: 1
      })
    })

    test('should preserve resolver context and dependencies', async () => {
      // Arrange
      const resolver: QueryResolver<CounterQuery, CounterQueryResult, CounterQueryDeps> = {
        getCounter: async ({ query, deps, ctx }) => {
          const item = deps.service.getById(query.payload.id)
          return {
            type: 'getCounter',
            item: {
              ...item,
              name: `${item.name} - ${ctx.timestamp.toISOString()}`
            }
          }
        }
      }

      const mockDeps: CounterQueryDeps = {
        service: {
          getById: (id: string) => ({ id, name: `Test ${id}` }),
          getAll: (_range: { limit: number; offset: number }) => [
            { id: 'test-123', name: 'Test test-123' }
          ]
        }
      }

      const resolverFn = fromQueryResolver(resolver)
      const timestamp = new Date('2023-01-01T00:00:00Z')

      // Act
      const res = await resolverFn({
        ctx: { timestamp },
        query: {
          type: 'getCounter',
          sourceType: 'counter',
          payload: { id: 'test-123' }
        },
        deps: mockDeps
      })

      // Assert
      expect(res).toEqual({
        type: 'getCounter',
        item: {
          id: 'test-123',
          name: 'Test test-123 - 2023-01-01T00:00:00.000Z'
        }
      })
    })
    })
  })
})
