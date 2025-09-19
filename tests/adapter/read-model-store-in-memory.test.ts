import { beforeEach, describe, expect, test } from 'bun:test'
import { ReadModelStoreInMemory } from '../../src/adapter/read-model-store-in-memory'
import type { ReadModel } from '../../src/types/core'

interface TestUser extends ReadModel {
  type: 'user'
  id: string
  name: string
  age: number
  email: string
}

interface TestProduct extends ReadModel {
  type: 'product'
  id: string
  name: string
  price: number
  category: string
}

type TestModel = TestUser | TestProduct

describe('[adapter] read model store in memory', () => {
  describe('ReadModelStoreInMemory', () => {
    let store: ReadModelStoreInMemory<TestModel>
    let testUsers: TestUser[]
    let testProducts: TestProduct[]

    beforeEach(() => {
      store = new ReadModelStoreInMemory<TestModel>()

      testUsers = [
        { type: 'user', id: '1', name: 'Alice', age: 25, email: 'alice@example.com' },
        { type: 'user', id: '2', name: 'Bob', age: 30, email: 'bob@example.com' },
        { type: 'user', id: '3', name: 'Charlie', age: 35, email: 'charlie@example.com' }
      ]

      testProducts = [
        { type: 'product', id: '1', name: 'Laptop', price: 1000, category: 'electronics' },
        { type: 'product', id: '2', name: 'Book', price: 20, category: 'books' },
        { type: 'product', id: '3', name: 'Phone', price: 500, category: 'electronics' }
      ]
    })

    describe('save and findById', () => {
      test('should save and retrieve a model by id', async () => {
        const user = testUsers[0]
        await store.save(user)

        const retrieved = await store.findById('user', '1')
        expect(retrieved).toEqual(user)
      })

      test('should return null for non-existent id', async () => {
        const retrieved = await store.findById('user', 'non-existent')
        expect(retrieved).toBeNull()
      })

      test('should return null for non-existent type', async () => {
        const retrieved = await store.findById('user', '1')
        expect(retrieved).toBeNull()
      })
    })

    describe('findMany', () => {
      beforeEach(async () => {
        for (const user of testUsers) {
          await store.save(user)
        }
        for (const product of testProducts) {
          await store.save(product)
        }
      })

      test('should return all models of a type with no options', async () => {
        const users = await store.findMany('user', {})
        expect(users).toHaveLength(3)
        expect(users.map(u => u.id).sort()).toEqual(['1', '2', '3'])
      })

      test('should return empty array for non-existent type', async () => {
        const res = await store.findMany('non-existent' as unknown as TestModel['type'], {})
        expect(res).toEqual([])
      })

      describe('filtering', () => {
        test('should filter by eq operator', async () => {
          const users = await store.findMany('user', {
            filter: [{ by: 'name', operator: 'eq', value: 'Alice' }]
          })
          expect(users).toHaveLength(1)
          expect(users[0].name).toBe('Alice')
        })

        test('should filter by ne operator', async () => {
          const users = await store.findMany('user', {
            filter: [{ by: 'name', operator: 'ne', value: 'Alice' }]
          })
          expect(users).toHaveLength(2)
          expect(users.map(u => u.name).sort()).toEqual(['Bob', 'Charlie'])
        })

        test('should filter by gt operator', async () => {
          const users = await store.findMany('user', {
            filter: [{ by: 'age', operator: 'gt', value: 25 }]
          })
          expect(users).toHaveLength(2)
          expect(users.map(u => u.name).sort()).toEqual(['Bob', 'Charlie'])
        })

        test('should filter by gte operator', async () => {
          const users = await store.findMany('user', {
            filter: [{ by: 'age', operator: 'gte', value: 30 }]
          })
          expect(users).toHaveLength(2)
          expect(users.map(u => u.name).sort()).toEqual(['Bob', 'Charlie'])
        })

        test('should filter by lt operator', async () => {
          const users = await store.findMany('user', {
            filter: [{ by: 'age', operator: 'lt', value: 30 }]
          })
          expect(users).toHaveLength(1)
          expect(users[0].name).toBe('Alice')
        })

        test('should filter by lte operator', async () => {
          const users = await store.findMany('user', {
            filter: [{ by: 'age', operator: 'lte', value: 30 }]
          })
          expect(users).toHaveLength(2)
          expect(users.map(u => u.name).sort()).toEqual(['Alice', 'Bob'])
        })

        test('should filter by in operator', async () => {
          const users = await store.findMany('user', {
            filter: [{ by: 'name', operator: 'in', value: ['Alice', 'Charlie'] }]
          })
          expect(users).toHaveLength(2)
          expect(users.map(u => u.name).sort()).toEqual(['Alice', 'Charlie'])
        })

        test('should filter by nin operator', async () => {
          const users = await store.findMany('user', {
            filter: [{ by: 'name', operator: 'nin', value: ['Alice', 'Charlie'] }]
          })
          expect(users).toHaveLength(1)
          expect(users[0].name).toBe('Bob')
        })

        test('should filter by contains operator', async () => {
          const users = await store.findMany('user', {
            filter: [{ by: 'email', operator: 'contains', value: 'alice' }]
          })
          expect(users).toHaveLength(1)
          expect(users[0].name).toBe('Alice')
        })

        test('should filter by startsWith operator', async () => {
          const users = await store.findMany('user', {
            filter: [{ by: 'name', operator: 'startsWith', value: 'A' }]
          })
          expect(users).toHaveLength(1)
          expect(users[0].name).toBe('Alice')
        })

        test('should filter by endsWith operator', async () => {
          const users = await store.findMany('user', {
            filter: [{ by: 'name', operator: 'endsWith', value: 'e' }]
          })
          expect(users).toHaveLength(2)
          expect(users.map(u => u.name).sort()).toEqual(['Alice', 'Charlie'])
        })

        test('should apply multiple filters', async () => {
          const users = await store.findMany('user', {
            filter: [
              { by: 'age', operator: 'gt', value: 25 },
              { by: 'name', operator: 'startsWith', value: 'B' }
            ]
          })
          expect(users).toHaveLength(1)
          expect(users[0].name).toBe('Bob')
        })
      })

      describe('sorting', () => {
        test('should sort by name ascending', async () => {
          const users = await store.findMany('user', {
            sort: { by: 'name', order: 'asc' }
          })
          expect(users.map(u => u.name)).toEqual(['Alice', 'Bob', 'Charlie'])
        })

        test('should sort by name descending', async () => {
          const users = await store.findMany('user', {
            sort: { by: 'name', order: 'desc' }
          })
          expect(users.map(u => u.name)).toEqual(['Charlie', 'Bob', 'Alice'])
        })

        test('should sort by age ascending', async () => {
          const users = await store.findMany('user', {
            sort: { by: 'age', order: 'asc' }
          })
          expect(users.map(u => u.age)).toEqual([25, 30, 35])
        })

        test('should sort by age descending', async () => {
          const users = await store.findMany('user', {
            sort: { by: 'age', order: 'desc' }
          })
          expect(users.map(u => u.age)).toEqual([35, 30, 25])
        })
      })

      describe('pagination', () => {
        test('should apply limit', async () => {
          const users = await store.findMany('user', {
            range: { limit: 2, offset: 0 }
          })
          expect(users).toHaveLength(2)
        })

        test('should apply offset', async () => {
          const users = await store.findMany('user', {
            range: { limit: 2, offset: 1 },
            sort: { by: 'name', order: 'asc' }
          })
          expect(users).toHaveLength(2)
          expect(users.map(u => u.name)).toEqual(['Bob', 'Charlie'])
        })

        test('should handle offset beyond available items', async () => {
          const users = await store.findMany('user', {
            range: { limit: 2, offset: 10 }
          })
          expect(users).toHaveLength(0)
        })
      })

      test('should combine filter, sort, and pagination', async () => {
        const users = await store.findMany('user', {
          filter: [{ by: 'age', operator: 'gte', value: 25 }],
          sort: { by: 'age', order: 'desc' },
          range: { limit: 2, offset: 0 }
        })
        expect(users).toHaveLength(2)
        expect(users.map(u => u.age)).toEqual([35, 30])
      })
    })

    describe('delete', () => {
      test('should delete a model', async () => {
        const user = testUsers[0]
        await store.save(user)

        let retrieved = await store.findById('user', '1')
        expect(retrieved).toEqual(user)

        await store.delete(user)

        retrieved = await store.findById('user', '1')
        expect(retrieved).toBeNull()
      })

      test('should not error when deleting non-existent model', async () => {
        const user = testUsers[0]
        await expect(store.delete(user)).resolves.toBeUndefined()
      })
    })

    describe('test helper methods', () => {
      test('addTestData should add multiple models', () => {
        store.addTestData(testUsers)

        expect(store.storage.user).toBeDefined()
        expect(Object.keys(store.storage.user)).toHaveLength(3)
      })

      test('clear should remove all data', async () => {
        store.addTestData(testUsers)
        store.addTestData(testProducts)

        expect(Object.keys(store.storage)).toHaveLength(2)

        store.clear()

        expect(store.storage).toEqual({})
      })
    })
  })
})
