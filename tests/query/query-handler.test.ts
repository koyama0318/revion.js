import { beforeEach, describe, expect, test } from 'bun:test'
import { ReadModelStoreInMemory } from '../../src/adapter/read-model-store-in-memory'
import { createQueryHandlers } from '../../src/query/query-handler'
import { createQuerySource } from '../../src/query/query-source-builder'
import type { Query, QueryResultData, ReadModel } from '../../src/types/core'
import type { QueryHandlerDeps } from '../../src/types/framework'
import type { QueryResolver } from '../../src/types/query'

interface TestQuery extends Query {
  type: 'getTest' | 'listTests'
  payload: {
    id?: string
    filter?: string
  }
}

interface TestQueryResult extends QueryResultData {
  type: 'getTest' | 'listTests'
  item?: TestReadModel
  items?: TestReadModel[]
}

interface TestReadModel extends ReadModel {
  type: 'test'
  id: string
  name: string
  status: string
}

interface TestDeps extends QueryHandlerDeps {
  readModelStore: ReadModelStoreInMemory<TestReadModel>
  externalService: {
    validateId: (id: string) => boolean
  }
}

describe('[query] query handler', () => {
  describe('createQueryHandlers', () => {
    let deps: TestDeps
    let testData: TestReadModel[]

    beforeEach(() => {
      const store = new ReadModelStoreInMemory<TestReadModel>()

      testData = [
        { type: 'test', id: 'test-1', name: 'Test 1', status: 'active' },
        { type: 'test', id: 'test-2', name: 'Test 2', status: 'inactive' },
        { type: 'test', id: 'test-3', name: 'Test 3', status: 'active' }
      ]

      store.addTestData(testData)

      deps = {
        readModelStore: store,
        externalService: {
          validateId: (id: string) => id.startsWith('test-')
        }
      }
    })

    describe('successful query handling', () => {
      test('should handle single item query', async () => {
        const queryResolver: QueryResolver<TestQuery, TestQueryResult, TestDeps> = {
          getTest: async ({ query, deps }) => {
            const item = await deps.readModelStore.findById('test', query.payload.id!)
            return {
              type: 'getTest',
              item: item || undefined
            }
          },
          listTests: async ({ deps }) => {
            const items = await deps.readModelStore.findMany('test', {})
            return {
              type: 'listTests',
              items
            }
          }
        }

        const querySource = createQuerySource<TestQuery, TestQueryResult, TestDeps>()
          .type('getTest')
          .resolver(queryResolver)
          .build()

        const handlers = createQueryHandlers(deps, [querySource])

        const res = await handlers.getTest({
          type: 'getTest',
          payload: { id: 'test-1' }
        })

        expect(res.ok).toBe(true)
        if (res.ok) {
          expect(res.value.type).toBe('getTest')
          expect(res.value.data.item).toEqual(testData[0])
        }
      })

      test('should handle list query', async () => {
        const queryResolver: QueryResolver<TestQuery, TestQueryResult, TestDeps> = {
          getTest: async ({ query, deps }) => {
            const item = await deps.readModelStore.findById('test', query.payload.id!)
            return {
              type: 'getTest',
              item: item || undefined
            }
          },
          listTests: async ({ deps }) => {
            const items = await deps.readModelStore.findMany('test', {})
            return {
              type: 'listTests',
              items
            }
          }
        }

        const querySource = createQuerySource<TestQuery, TestQueryResult, TestDeps>()
          .type('listTests')
          .resolver(queryResolver)
          .build()

        const handlers = createQueryHandlers(deps, [querySource])

        const res = await handlers.listTests({
          type: 'listTests',
          payload: {}
        })

        expect(res.ok).toBe(true)
        if (res.ok) {
          expect(res.value.type).toBe('listTests')
          expect(res.value.data.items).toHaveLength(3)
          expect(res.value.data.items).toEqual(testData)
        }
      })

      test('should handle query with filtering', async () => {
        const queryResolver: QueryResolver<TestQuery, TestQueryResult, TestDeps> = {
          getTest: async ({ query, deps }) => {
            const item = await deps.readModelStore.findById('test', query.payload.id!)
            return {
              type: 'getTest',
              item: item || undefined
            }
          },
          listTests: async ({ query, deps }) => {
            const filter = query.payload.filter
            const options = filter
              ? {
                  filter: [
                    { by: 'status' as keyof TestReadModel, operator: 'eq' as const, value: filter }
                  ]
                }
              : {}
            const items = await deps.readModelStore.findMany('test', options)
            return {
              type: 'listTests',
              items
            }
          }
        }

        const querySource = createQuerySource<TestQuery, TestQueryResult, TestDeps>()
          .type('listTests')
          .resolver(queryResolver)
          .build()

        const handlers = createQueryHandlers(deps, [querySource])

        const res = await handlers.listTests({
          type: 'listTests',
          payload: { filter: 'active' }
        })

        expect(res.ok).toBe(true)
        if (res.ok) {
          expect(res.value.type).toBe('listTests')
          expect(res.value.data.items).toHaveLength(2)
          expect(res.value.data.items?.every(item => item.status === 'active')).toBe(true)
        }
      })

      test('should use external dependencies in resolver', async () => {
        const queryResolver: QueryResolver<TestQuery, TestQueryResult, TestDeps> = {
          getTest: async ({ query, deps }) => {
            if (!deps.externalService.validateId(query.payload.id!)) {
              return {
                type: 'getTest',
                item: undefined
              }
            }
            const item = await deps.readModelStore.findById('test', query.payload.id!)
            return {
              type: 'getTest',
              item: item || undefined
            }
          },
          listTests: async ({ deps }) => {
            const items = await deps.readModelStore.findMany('test', {})
            return {
              type: 'listTests',
              items
            }
          }
        }

        const querySource = createQuerySource<TestQuery, TestQueryResult, TestDeps>()
          .type('getTest')
          .resolver(queryResolver)
          .build()

        const handlers = createQueryHandlers(deps, [querySource])

        // Valid ID
        const validResult = await handlers.getTest({
          type: 'getTest',
          payload: { id: 'test-1' }
        })

        expect(validResult.ok).toBe(true)
        if (validResult.ok) {
          expect(validResult.value.data.item).toEqual(testData[0])
        }

        // Invalid ID
        const invalidResult = await handlers.getTest({
          type: 'getTest',
          payload: { id: 'invalid-id' }
        })

        expect(invalidResult.ok).toBe(true)
        if (invalidResult.ok) {
          expect(invalidResult.value.data.item).toBeUndefined()
        }
      })

      test('should handle non-existent items gracefully', async () => {
        const queryResolver: QueryResolver<TestQuery, TestQueryResult, TestDeps> = {
          getTest: async ({ query, deps }) => {
            const item = await deps.readModelStore.findById('test', query.payload.id!)
            return {
              type: 'getTest',
              item: item || undefined
            }
          },
          listTests: async ({ deps }) => {
            const items = await deps.readModelStore.findMany('test', {})
            return {
              type: 'listTests',
              items
            }
          }
        }

        const querySource = createQuerySource<TestQuery, TestQueryResult, TestDeps>()
          .type('getTest')
          .resolver(queryResolver)
          .build()

        const handlers = createQueryHandlers(deps, [querySource])

        const res = await handlers.getTest({
          type: 'getTest',
          payload: { id: 'non-existent' }
        })

        expect(res.ok).toBe(true)
        if (res.ok) {
          expect(res.value.type).toBe('getTest')
          expect(res.value.data.item).toBeUndefined()
        }
      })
    })

    describe('error handling', () => {
      test('should handle resolver function errors', async () => {
        const queryResolver: QueryResolver<TestQuery, TestQueryResult, TestDeps> = {
          getTest: async () => {
            throw new Error('Resolver error')
          },
          listTests: async ({ deps }) => {
            const items = await deps.readModelStore.findMany('test', {})
            return {
              type: 'listTests',
              items
            }
          }
        }

        const querySource = createQuerySource<TestQuery, TestQueryResult, TestDeps>()
          .type('getTest')
          .resolver(queryResolver)
          .build()

        const handlers = createQueryHandlers(deps, [querySource])

        const res = await handlers.getTest({
          type: 'getTest',
          payload: { id: 'test-1' }
        })

        expect(res.ok).toBe(false)
        if (!res.ok) {
          expect(res.error.code).toBe('RESOLVER_EXECUTION_FAILED')
          expect(res.error.message).toContain('Resolver error')
        }
      })

      test('should handle store errors', async () => {
        const failingStore = {
          findById: async () => {
            throw new Error('Database error')
          },
          findMany: async () => {
            throw new Error('Database error')
          },
          save: async () => {},
          delete: async () => {}
        }

        const failingDeps = {
          ...deps,
          readModelStore: failingStore
        }

        const queryResolver: QueryResolver<TestQuery, TestQueryResult, TestDeps> = {
          getTest: async ({ query, deps }) => {
            const item = await deps.readModelStore.findById('test', query.payload.id!)
            return {
              type: 'getTest',
              item: item || undefined
            }
          },
          listTests: async ({ deps }) => {
            const items = await deps.readModelStore.findMany('test', {})
            return {
              type: 'listTests',
              items
            }
          }
        }

        const querySource = createQuerySource<TestQuery, TestQueryResult, TestDeps>()
          .type('getTest')
          .resolver(queryResolver)
          .build()

        const handlers = createQueryHandlers(failingDeps as unknown as TestDeps, [querySource])

        const res = await handlers.getTest({
          type: 'getTest',
          payload: { id: 'test-1' }
        })

        expect(res.ok).toBe(false)
        if (!res.ok) {
          expect(res.error.code).toBe('RESOLVER_EXECUTION_FAILED')
          expect(res.error.message).toContain('Database error')
        }
      })
    })

    describe('multiple query types', () => {
      test('should create handlers for all query types in resolver', () => {
        const queryResolver: QueryResolver<TestQuery, TestQueryResult, TestDeps> = {
          getTest: async ({ query, deps }) => {
            const item = await deps.readModelStore.findById('test', query.payload.id!)
            return {
              type: 'getTest',
              item: item || undefined
            }
          },
          listTests: async ({ deps }) => {
            const items = await deps.readModelStore.findMany('test', {})
            return {
              type: 'listTests',
              items
            }
          }
        }

        const getTestSource = createQuerySource<TestQuery, TestQueryResult, TestDeps>()
          .type('getTest')
          .resolver(queryResolver)
          .build()

        const listTestsSource = createQuerySource<TestQuery, TestQueryResult, TestDeps>()
          .type('listTests')
          .resolver(queryResolver)
          .build()

        const handlers = createQueryHandlers(deps, [getTestSource, listTestsSource])

        expect(Object.keys(handlers)).toEqual(['getTest', 'listTests'])
        expect(typeof handlers.getTest).toBe('function')
        expect(typeof handlers.listTests).toBe('function')
      })

      test('should handle each query type independently', async () => {
        const queryResolver: QueryResolver<TestQuery, TestQueryResult, TestDeps> = {
          getTest: async ({ query, deps }) => {
            const item = await deps.readModelStore.findById('test', query.payload.id!)
            return {
              type: 'getTest',
              item: item || undefined
            }
          },
          listTests: async ({ deps }) => {
            const items = await deps.readModelStore.findMany('test', {})
            return {
              type: 'listTests',
              items
            }
          }
        }

        const getTestSource = createQuerySource<TestQuery, TestQueryResult, TestDeps>()
          .type('getTest')
          .resolver(queryResolver)
          .build()

        const listTestsSource = createQuerySource<TestQuery, TestQueryResult, TestDeps>()
          .type('listTests')
          .resolver(queryResolver)
          .build()

        const handlers = createQueryHandlers(deps, [getTestSource, listTestsSource])

        // Test getTest handler
        const getResult = await handlers.getTest({
          type: 'getTest',
          payload: { id: 'test-1' }
        })

        expect(getResult.ok).toBe(true)
        if (getResult.ok) {
          expect(getResult.value.type).toBe('getTest')
          expect(getResult.value.data.item).toEqual(testData[0])
        }

        // Test listTests handler
        const listResult = await handlers.listTests({
          type: 'listTests',
          payload: {}
        })

        expect(listResult.ok).toBe(true)
        if (listResult.ok) {
          expect(listResult.value.type).toBe('listTests')
          expect(listResult.value.data.items).toHaveLength(3)
        }
      })
    })
  })
})
