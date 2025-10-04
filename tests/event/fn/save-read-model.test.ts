import { describe, expect, test } from 'bun:test'
import { ReadModelStoreInMemory } from '../../../src/adapter/read-model-store-in-memory'
import { createSaveReadModel } from '../../../src/event/fn/save-read-model'
import type { CounterReadModel } from '../../fixtures/counter-app/shared/readmodel'

describe('[event] save read model', () => {
  describe('createSaveReadModel', () => {
    test('returns success when no read models provided', async () => {
      // Arrange
      const store = new ReadModelStoreInMemory()
      const saveReadModelFn = createSaveReadModel()(store)
      const emptyModels: Record<string, CounterReadModel> = {}

      // Act
      const result = await saveReadModelFn(emptyModels)

      // Assert
      expect(result.ok).toBe(true)
    })

    test('returns error when store is null', async () => {
      // Arrange
      const saveReadModelFn = createSaveReadModel()(null as any)
      const models = { counter: { type: 'counter', id: '123', count: 5 } }

      // Act
      const result = await saveReadModelFn(models)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('MODEL_SAVE_FAILED')
      }
    })

    test('returns error when readModels is null', async () => {
      // Arrange
      const store = new ReadModelStoreInMemory()
      const saveReadModelFn = createSaveReadModel()(store)

      // Act
      const result = await saveReadModelFn(null as any)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_READ_MODELS')
      }
    })

    test('returns error when read model is invalid', async () => {
      // Arrange
      const store = new ReadModelStoreInMemory()
      const saveReadModelFn = createSaveReadModel()(store)
      const models = { counter: { type: 'counter' } } // Missing id

      // Act
      const result = await saveReadModelFn(models as any)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_READ_MODEL')
      }
    })

    test('saves single read model successfully', async () => {
      // Arrange
      const store = new ReadModelStoreInMemory()
      const saveReadModelFn = createSaveReadModel()(store)
      const readModel: CounterReadModel = {
        type: 'counter',
        id: '123',
        count: 5
      }
      const models = { counter: readModel }

      // Act
      const result = await saveReadModelFn(models)

      // Assert
      expect(result.ok).toBe(true)
    })

    test('saves multiple read models successfully', async () => {
      // Arrange
      const store = new ReadModelStoreInMemory()
      const saveReadModelFn = createSaveReadModel()(store)
      const readModel1: CounterReadModel = {
        type: 'counter',
        id: '123',
        count: 5
      }
      const readModel2: CounterReadModel = {
        type: 'counter',
        id: '456',
        count: 10
      }
      const models = { counter1: readModel1, counter2: readModel2 }

      // Act
      const result = await saveReadModelFn(models)

      // Assert
      expect(result.ok).toBe(true)
    })

    test('handles save operation failure', async () => {
      // Arrange
      const store = new ReadModelStoreInMemory()
      store.save = async () => {
        throw new Error('Database save error')
      }
      const saveReadModelFn = createSaveReadModel()(store)
      const readModel: CounterReadModel = {
        type: 'counter',
        id: '123',
        count: 5
      }
      const models = { counter: readModel }

      // Act
      const result = await saveReadModelFn(models)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('MODEL_SAVE_FAILED')
        expect(result.error.message).toBe('Model save failed: counter 123')
      }
    })

    test('stops saving when first model fails', async () => {
      // Arrange
      const store = new ReadModelStoreInMemory()
      let saveCallCount = 0
      store.save = async () => {
        saveCallCount++
        throw new Error('Database save error')
      }
      const saveReadModelFn = createSaveReadModel()(store)
      const readModel1: CounterReadModel = {
        type: 'counter',
        id: '123',
        count: 5
      }
      const readModel2: CounterReadModel = {
        type: 'counter',
        id: '456',
        count: 10
      }
      const models = { counter1: readModel1, counter2: readModel2 }

      // Act
      const result = await saveReadModelFn(models)

      // Assert
      expect(result.ok).toBe(false)
      expect(saveCallCount).toBe(1) // Should stop after first failure
    })
  })
})
