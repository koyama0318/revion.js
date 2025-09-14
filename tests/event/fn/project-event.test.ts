import { describe, expect, test } from 'bun:test'
import { createProjectEventFnFactory } from '../../../src/event/fn/project-event'
import type { QueryOption, ReadModelStore } from '../../../src/types/adapter'
import type { AggregateId, ExtendedDomainEvent, ReadModel } from '../../../src/types/core'
import type { Projection, ProjectionMap } from '../../../src/types/event'

// Test types
type TestEvent =
  | { type: 'created'; id: AggregateId<'test'>; payload: { name: string } }
  | { type: 'updated'; id: AggregateId<'test'>; payload: { name: string } }
  | { type: 'deleted'; id: AggregateId<'test'> }

type TestReadModel = ReadModel & {
  type: 'test'
  id: string
  name: string
}

const testId = (id: string): AggregateId<'test'> => ({ type: 'test', value: id })

const createTestEvent = (
  type: TestEvent['type'],
  id: string,
  payload?: any
): ExtendedDomainEvent<TestEvent> =>
  ({
    type,
    id: testId(id),
    payload,
    aggregateId: testId(id),
    version: 1,
    timestamp: new Date()
  }) as ExtendedDomainEvent<TestEvent>

// Mock database classes for testing error scenarios
class MockReadModelStore implements ReadModelStore {
  async findMany<T extends ReadModel>(_type: T['type'], _optionss: QueryOption<T>): Promise<T[]> {
    return []
  }

  async findById<T extends ReadModel>(_type: T['type'], _idd: string): Promise<T | null> {
    return {
      type: 'test',
      id: '123',
      name: 'existing'
    } as unknown as T
  }

  async save<T extends ReadModel>(_model: T): Promise<void> {
    // Success - do nothing
  }

  async delete<T extends ReadModel>(_model: T): Promise<void> {
    // Success - do nothing
  }
}

class MockReadModelStoreWithErrors implements ReadModelStore {
  constructor(
    private shouldFailOnGet = false,
    private shouldFailOnSave = false,
    private shouldFailOnDelete = false
  ) {}

  async findMany<T extends ReadModel>(_type: T['type'], _optionss: QueryOption<T>): Promise<T[]> {
    return []
  }

  async findById<T extends ReadModel>(_type: T['type'], _idd: string): Promise<T | null> {
    if (this.shouldFailOnGet) {
      throw new Error('Get by ID failed')
    }
    return {
      type: 'test',
      id: '123',
      name: 'existing'
    } as unknown as T
  }

  async save<T extends ReadModel>(_model: T): Promise<void> {
    if (this.shouldFailOnSave) {
      throw new Error('Save operation failed')
    }
  }

  async delete<T extends ReadModel>(_model: T): Promise<void> {
    if (this.shouldFailOnDelete) {
      throw new Error('Delete operation failed')
    }
  }
}

describe('[event] project event function', () => {
  describe('createProjectEventFnFactory', () => {
    test('handles invalid event type (non-string)', async () => {
      // Arrange
      const projection = {
        created: {
          test: (_params: any) => ({ type: 'mutate' })
        }
      }

      const db = new MockReadModelStoreWithErrors()
      const projectFn = createProjectEventFnFactory(projection as any)(db)

      const invalidEvent = {
        ...createTestEvent('created', '123'),
        type: 123 // Invalid type
      } as any

      // Act
      const result = await projectFn(invalidEvent)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_EVENT_TYPE')
        expect(result.error.message).toContain('Event type must be string')
      }
    })

    test('handles event type not found in projection', async () => {
      // Arrange
      const projection = {
        created: {
          test: (_params: any) => ({ type: 'mutate' })
        }
      }

      const db = new MockReadModelStoreWithErrors()
      const projectFn = createProjectEventFnFactory(projection as any)(db)

      const event = createTestEvent('updated', '123', { name: 'test' })

      // Act
      const result = await projectFn(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('EVENT_TYPE_NOT_FOUND')
        expect(result.error.message).toBe('Event type updated not found')
      }
    })

    test('skips invalid projection definitions', async () => {
      // Arrange
      const projection = {
        created: {
          test: null, // Invalid definition
          validReadModel: (_params: unknown) => ({
            type: 'upsert',
            readModel: { type: 'test', id: '123', name: 'test' }
          })
        }
      } as any

      const db = new MockReadModelStoreWithErrors()
      const projectFn = createProjectEventFnFactory(projection as any)(db)

      const event = createTestEvent('created', '123', { name: 'test' })

      // Act
      const result = await projectFn(event)

      // Assert
      expect(result.ok).toBe(true)
    })

    test('handles upsert operation save failure', async () => {
      // Arrange
      const projection = {
        created: {
          test: () => ({
            type: 'upsert',
            readModel: {
              type: 'test',
              id: '123',
              name: 'test'
            }
          })
        }
      }

      const db = new MockReadModelStoreWithErrors(false, true) // Fail on save
      const projectFn = createProjectEventFnFactory(projection as any)(db)

      const event = createTestEvent('created', '123', { name: 'test' })

      // Act
      const result = await projectFn(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('SAVE_VIEW_FAILED')
        expect(result.error.message).toContain('SavereadModel failed')
      }
    })

    test('handles projection function execution successfully', async () => {
      // Arrange
      const projection: Projection<
        TestEvent,
        TestReadModel,
        ProjectionMap<TestEvent, TestReadModel>
      > = {
        created: {
          test: ({ event }) => ({ type: 'test', id: event.id.value, name: event.payload.name })
        },
        deleted: {
          test: () => undefined
        },
        updated: {
          test: ({ readModel }) => {
            readModel.name = 'updated'
            return readModel
          }
        }
      }

      const db = new MockReadModelStore()
      const projectFn = createProjectEventFnFactory(projection as any)(db)

      const event = createTestEvent('updated', '123', { name: 'test' })

      // Act
      const result = await projectFn(event)

      // Assert
      expect(result.ok).toBe(true)
    })

    test('handles save failure when projection returnsreadModel', async () => {
      // Arrange
      const projection: Projection<
        TestEvent,
        TestReadModel,
        ProjectionMap<TestEvent, TestReadModel>
      > = {
        created: {
          test: ({ event }) => ({ type: 'test', id: event.id.value, name: event.payload.name })
        },
        deleted: {
          test: () => undefined
        },
        updated: {
          test: ({ readModel }) => {
            readModel.name = 'updated'
            return readModel
          }
        }
      }

      const db = new MockReadModelStoreWithErrors(false, true) // Success on get, fail on save
      const projectFn = createProjectEventFnFactory(projection as any)(db)

      const event = createTestEvent('updated', '123', { name: 'test' })

      // Act
      const result = await projectFn(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('SAVE_VIEW_FAILED')
        expect(result.error.message).toContain('SavereadModel failed')
      }
    })

    test('handles projection returning undefined (no-op)', async () => {
      // Arrange
      const projection: Projection<
        TestEvent,
        TestReadModel,
        ProjectionMap<TestEvent, TestReadModel>
      > = {
        created: {
          test: ({ event }) => ({ type: 'test', id: event.id.value, name: event.payload.name })
        },
        deleted: {
          test: () => undefined // Returns undefined, so no save operation
        },
        updated: {
          test: ({ readModel }) => {
            readModel.name = 'updated'
            return readModel
          }
        }
      }

      const db = new MockReadModelStore()
      const projectFn = createProjectEventFnFactory(projection as any)(db)

      const event = createTestEvent('deleted', '123')

      // Act
      const result = await projectFn(event)

      // Assert
      expect(result.ok).toBe(true) // Should succeed as nothing is saved
    })

    test('handles projection function throwing error', async () => {
      // Arrange
      const projection: Projection<
        TestEvent,
        TestReadModel,
        ProjectionMap<TestEvent, TestReadModel>
      > = {
        created: {
          test: () => {
            throw new Error('Projection function error')
          }
        },
        deleted: {
          test: () => undefined
        },
        updated: {
          test: ({ readModel }) => {
            readModel.name = 'updated'
            return readModel
          }
        }
      }

      const db = new MockReadModelStore()
      const projectFn = createProjectEventFnFactory(projection as any)(db)

      const event = createTestEvent('created', '123', { name: 'test' })

      // Act
      const result = await projectFn(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('PROJECTION_EXECUTION_FAILED')
        expect(result.error.message).toContain('Projection execution failed')
      }
    })

    test('processes noop operation successfully', async () => {
      // Arrange
      const projection = {
        created: {
          test: (_params: any) => ({ type: 'mutate' })
        }
      }

      const db = new MockReadModelStoreWithErrors()
      const projectFn = createProjectEventFnFactory(projection as any)(db)

      const event = createTestEvent('created', '123', { name: 'test' })

      // Act
      const result = await projectFn(event)

      // Assert
      expect(result.ok).toBe(true)
    })

    test('handles upsert operation withoutreadModel property', async () => {
      // Arrange
      const projection = {
        created: {
          test: () => ({ type: 'upsert' }) as any // MissingreadModel property
        }
      }

      const db = new MockReadModelStoreWithErrors()
      const projectFn = createProjectEventFnFactory(projection as any)(db)

      const event = createTestEvent('created', '123', { name: 'test' })

      // Act
      const result = await projectFn(event)

      // Assert
      expect(result.ok).toBe(true) // Should succeed silently
    })

    test('handles delete operation without ids property', async () => {
      // Arrange
      const projection = {
        created: {
          test: () => ({ type: 'mutate' })
        },
        updated: {
          test: () => ({ type: 'mutate' })
        },
        deleted: {
          test: () => ({ type: 'delete' }) as any // Missing ids property
        }
      }

      const db = new MockReadModelStoreWithErrors()
      const projectFn = createProjectEventFnFactory(projection as any)(db)

      const event = createTestEvent('deleted', '123')

      // Act
      const result = await projectFn(event)

      // Assert
      expect(result.ok).toBe(true) // Should succeed silently
    })
  })
})
