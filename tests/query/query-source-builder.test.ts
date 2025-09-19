import { describe, expect, test } from 'bun:test'
import { createQuerySource, fromQueryResolver } from '../../src/query/query-source-builder'
import type { Query, QueryResultData } from '../../src/types/core'
import type { QueryResolver } from '../../src/types/query'

interface TestQuery extends Query {
  type: 'getTest'
  payload: {
    id: string
  }
}

interface TestQueryResult extends QueryResultData {
  type: 'getTest'
  item: {
    id: string
    name: string
  }
}

interface TestDeps {
  service: {
    getById: (id: string) => { id: string; name: string }
  }
}

describe('[query] query source builder', () => {
  describe('createQuerySource', () => {
    describe('builder pattern', () => {
      test('should build valid query source with all required methods', () => {
      // Arrange
      const resolver: QueryResolver<TestQuery, TestQueryResult, TestDeps> = {
        getTest: async ({ query, deps }) => {
          const item = deps.service.getById(query.payload.id)
          return {
            type: 'getTest',
            item
          }
        }
      }

      // Act
      const querySource = createQuerySource<TestQuery, TestQueryResult, TestDeps>()
        .type('getTest')
        .resolver(resolver)
        .build()

      // Assert
      expect(querySource.type).toBe('getTest')
      expect(typeof querySource.queryResolver).toBe('function')
    })

    test('should enforce correct method call order - type first', () => {
      const builder = createQuerySource<TestQuery, TestQueryResult, TestDeps>()

      // Should have type method
      expect(typeof builder.type).toBe('function')

      // After calling type, should have resolver method
      const builderWithType = builder.type('getTest')
      expect(typeof builderWithType.resolver).toBe('function')
    })

    test('should enforce correct method call order - resolver after type', () => {
      const resolver: QueryResolver<TestQuery, TestQueryResult, TestDeps> = {
        getTest: async ({ query, deps }) => {
          const item = deps.service.getById(query.payload.id)
          return {
            type: 'getTest',
            item
          }
        }
      }

      const builderWithType = createQuerySource<TestQuery, TestQueryResult, TestDeps>().type(
        'getTest'
      )

      const builderWithResolver = builderWithType.resolver(resolver)
      expect(typeof builderWithResolver.build).toBe('function')
    })

    test('should allow build only after all required properties are set', () => {
      const resolver: QueryResolver<TestQuery, TestQueryResult, TestDeps> = {
        getTest: async ({ query, deps }) => {
          const item = deps.service.getById(query.payload.id)
          return {
            type: 'getTest',
            item
          }
        }
      }

      const completeBuilder = createQuerySource<TestQuery, TestQueryResult, TestDeps>()
        .type('getTest')
        .resolver(resolver)

      expect(typeof completeBuilder.build).toBe('function')

      const _res = completeBuilder.build()
      expect(result.type).toBe('getTest')
      expect(typeof result.queryResolver).toBe('function')
    })
  })

  describe('multiple query types', () => {
    interface MultiQuery extends Query {
      type: 'getUser' | 'getPost'
      payload: {
        id: string
      }
    }

    interface MultiQueryResult extends QueryResultData {
      type: 'getUser' | 'getPost'
      item: {
        id: string
        name: string
      }
    }

    interface MultiDeps {
      userService: {
        getById: (id: string) => { id: string; name: string }
      }
      postService: {
        getById: (id: string) => { id: string; name: string }
      }
    }

    test('should handle multiple query types in resolver', () => {
      const resolver: QueryResolver<MultiQuery, MultiQueryResult, MultiDeps> = {
        getUser: async ({ query, deps }) => {
          const item = deps.userService.getById(query.payload.id)
          return {
            type: 'getUser',
            item
          }
        },
        getPost: async ({ query, deps }) => {
          const item = deps.postService.getById(query.payload.id)
          return {
            type: 'getPost',
            item
          }
        }
      }

      const querySource = createQuerySource<MultiQuery, MultiQueryResult, MultiDeps>()
        .type('getUser')
        .resolver(resolver)
        .build()

      expect(querySource.type).toBe('getUser')
      expect(typeof querySource.queryResolver).toBe('function')
    })
  })

  describe('fromQueryResolver', () => {
    test('should convert QueryResolver to ResolverFn', async () => {
    const resolver: QueryResolver<TestQuery, TestQueryResult, TestDeps> = {
      getTest: async ({ query, deps }) => {
        const item = deps.service.getById(query.payload.id)
        return {
          type: 'getTest',
          item
        }
      }
    }

    const mockDeps: TestDeps = {
      service: {
        getById: (id: string) => ({ id, name: `Test ${id}` })
      }
    }

    const resolverFn = fromQueryResolver(resolver)

    const res = await resolverFn({
      ctx: { timestamp: new Date() },
      query: {
        type: 'getTest',
        payload: { id: 'test-123' }
      },
      deps: mockDeps
    })

    expect(res).toEqual({
      type: 'getTest',
      item: {
        id: 'test-123',
        name: 'Test test-123'
      }
    })
  })

  test('should throw error for unknown query type', async () => {
    const resolver: QueryResolver<TestQuery, TestQueryResult, TestDeps> = {
      getTest: async ({ query, deps }) => {
        const item = deps.service.getById(query.payload.id)
        return {
          type: 'getTest',
          item
        }
      }
    }

    const mockDeps: TestDeps = {
      service: {
        getById: (id: string) => ({ id, name: `Test ${id}` })
      }
    }

    const resolverFn = fromQueryResolver(resolver)

    await expect(
      resolverFn({
        ctx: { timestamp: new Date() },
        query: {
          type: 'unknownQuery' as unknown as TestQuery['type'],
          payload: { id: 'test-123' }
        },
        deps: mockDeps
      })
    ).rejects.toThrow('No resolver found for type: unknownQuery')
  })

  test('should handle multiple query types in resolver function', async () => {
    interface MultiQuery extends Query {
      type: 'getUser' | 'getPost'
      payload: {
        id: string
      }
    }

    interface MultiQueryResult extends QueryResultData {
      type: 'getUser' | 'getPost'
      item: {
        id: string
        name: string
        category?: string
      }
    }

    interface MultiDeps {
      userService: {
        getById: (id: string) => { id: string; name: string }
      }
      postService: {
        getById: (id: string) => { id: string; name: string; category: string }
      }
    }

    const resolver: QueryResolver<MultiQuery, MultiQueryResult, MultiDeps> = {
      getUser: async ({ query, deps }) => {
        const item = deps.userService.getById(query.payload.id)
        return {
          type: 'getUser',
          item
        }
      },
      getPost: async ({ query, deps }) => {
        const item = deps.postService.getById(query.payload.id)
        return {
          type: 'getPost',
          item
        }
      }
    }

    const mockDeps: MultiDeps = {
      userService: {
        getById: (id: string) => ({ id, name: `User ${id}` })
      },
      postService: {
        getById: (id: string) => ({ id, name: `Post ${id}`, category: 'tech' })
      }
    }

    const resolverFn = fromQueryResolver(resolver)

    // Test getUser
    const userResult = await resolverFn({
      ctx: { timestamp: new Date() },
      query: {
        type: 'getUser',
        payload: { id: 'user-123' }
      },
      deps: mockDeps
    })

    expect(userResult).toEqual({
      type: 'getUser',
      item: {
        id: 'user-123',
        name: 'User user-123'
      }
    })

    // Test getPost
    const postResult = await resolverFn({
      ctx: { timestamp: new Date() },
      query: {
        type: 'getPost',
        payload: { id: 'post-456' }
      },
      deps: mockDeps
    })

    expect(postResult).toEqual({
      type: 'getPost',
      item: {
        id: 'post-456',
        name: 'Post post-456',
        category: 'tech'
      }
    })
  })

  test('should preserve resolver context and dependencies', async () => {
    const resolver: QueryResolver<TestQuery, TestQueryResult, TestDeps> = {
      getTest: async ({ query, deps, ctx }) => {
        const item = deps.service.getById(query.payload.id)
        return {
          type: 'getTest',
          item: {
            ...item,
            name: `${item.name} - ${ctx.timestamp.toISOString()}`
          }
        }
      }
    }

    const mockDeps: TestDeps = {
      service: {
        getById: (id: string) => ({ id, name: `Test ${id}` })
      }
    }

    const resolverFn = fromQueryResolver(resolver)
    const timestamp = new Date('2023-01-01T00:00:00Z')

    const res = await resolverFn({
      ctx: { timestamp },
      query: {
        type: 'getTest',
        payload: { id: 'test-123' }
      },
      deps: mockDeps
    })

    expect(res).toEqual({
      type: 'getTest',
      item: {
        id: 'test-123',
        name: 'Test test-123 - 2023-01-01T00:00:00.000Z'
      }
    })
  })
})
})
