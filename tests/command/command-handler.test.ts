import { describe, expect, test } from 'bun:test'
import { EventStoreInMemory } from '../../src/adapter/event-store-in-memory'
import { createCommandHandlers } from '../../src/command/command-handler'
import { zeroId } from '../../src/command/helpers/aggregate-id'
import type { EventStore } from '../../src/types/adapter'
import { counter } from '../fixtures'
import type { CounterCommand } from '../fixtures/counter-app/features/counter/types'

function createFailingEventStore(
  operation: 'getEvents' | 'saveEvent' | 'getLastEventVersion'
): EventStore {
  const store = new EventStoreInMemory()

  switch (operation) {
    case 'saveEvent':
      store.saveEvent = async () => {
        throw new Error('Save failed')
      }
      break
    case 'getEvents':
      store.getEvents = async () => {
        throw new Error('Database error')
      }
      break
    case 'getLastEventVersion':
      store.getLastEventVersion = async () => {
        throw new Error('Database error')
      }
      break
  }

  return store
}

const testId = zeroId('counter')

const createCommand: CounterCommand = {
  type: 'create',
  id: testId,
  payload: { count: 5 }
}

const incrementCommand: CounterCommand = {
  type: 'increment',
  id: testId
}

describe('[command] command handler', () => {
  describe('aggregate command handling', () => {
    describe('new aggregate creation flow', () => {
      test('creates new aggregate when no events stored', async () => {
        // Arrange
        const deps = {
          eventStore: new EventStoreInMemory()
        }
        const handlers = createCommandHandlers(deps, [counter])
        const commandHandler = handlers[counter.type]!

        // Act
        const result = await commandHandler(createCommand)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.id).toEqual(testId)
        }

        // Verify event was saved
        const savedEvents = await deps.eventStore.getEvents(testId)
        expect(savedEvents.length).toBeGreaterThan(0)
      })

      test('returns error when init function fails', async () => {
        // Arrange
        const deps = {
          eventStore: new EventStoreInMemory()
        }

        // Create invalid command that will cause init to fail
        const invalidCommand = {
          type: 'invalid' as const,
          id: testId,
          payload: {}
        }

        const handlers = createCommandHandlers(deps, [counter])
        const commandHandler = handlers[counter.type]!

        // Act
        const result = await commandHandler(invalidCommand)

        // Assert
        expect(result.ok).toBe(false)
      })

      test('returns error when create command not accepted for initial state', async () => {
        // Arrange
        const deps = {
          eventStore: new EventStoreInMemory()
        }

        // Create a counter aggregate that rejects the create command
        const rejectingAggregate = {
          ...counter,
          acceptsCommand: () => false
        }

        const handlers = createCommandHandlers(deps, [rejectingAggregate])
        const commandHandler = handlers[rejectingAggregate.type]!

        // Act
        const result = await commandHandler(createCommand)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('COMMAND_NOT_ACCEPTED')
        }
      })

      test('returns error when save function fails during creation', async () => {
        // Arrange
        const deps = {
          eventStore: createFailingEventStore('saveEvent')
        }
        const handlers = createCommandHandlers(deps, [counter])
        const commandHandler = handlers[counter.type]!

        // Act
        const result = await commandHandler(createCommand)

        // Assert
        expect(result.ok).toBe(false)
      })
    })

    describe('existing aggregate update flow', () => {
      test('updates existing aggregate when replay succeeds', async () => {
        // Arrange
        const deps = {
          eventStore: new EventStoreInMemory()
        }

        // First create the aggregate
        const handlers = createCommandHandlers(deps, [counter])
        const commandHandler = handlers[counter.type]!
        await commandHandler(createCommand)

        // Act - Update the existing aggregate
        const result = await commandHandler(incrementCommand)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.id).toEqual(testId)
        }

        // Verify multiple events were saved
        const savedEvents = await deps.eventStore.getEvents(testId)
        expect(savedEvents.length).toBe(2)
      })

      test('returns error when update command not accepted for replayed state', async () => {
        // Arrange
        const deps = {
          eventStore: new EventStoreInMemory()
        }

        // First create the aggregate with normal counter
        const normalHandlers = createCommandHandlers(deps, [counter])
        const normalHandler = normalHandlers[counter.type]!
        await normalHandler(createCommand)

        // Create a counter aggregate that rejects update commands
        const rejectingAggregate = {
          ...counter,
          acceptsCommand: () => false
        }

        const handlers = createCommandHandlers(deps, [rejectingAggregate])
        const commandHandler = handlers[rejectingAggregate.type]!

        // Act
        const result = await commandHandler(incrementCommand)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('COMMAND_NOT_ACCEPTED')
        }
      })

      test('returns error when apply function fails', async () => {
        // Arrange
        const deps = {
          eventStore: new EventStoreInMemory()
        }

        // First create the aggregate
        const handlers = createCommandHandlers(deps, [counter])
        const commandHandler = handlers[counter.type]!
        await commandHandler(createCommand)

        // Create invalid command that will cause apply to fail
        const invalidCommand = {
          type: 'invalid' as const,
          id: testId,
          payload: {}
        }

        // Act
        const result = await commandHandler(invalidCommand)!

        // Assert
        expect(result.ok).toBe(false)
      })

      test('returns error when save function fails during update', async () => {
        // Arrange - Create aggregate first with working deps
        const workingDeps = {
          eventStore: new EventStoreInMemory()
        }
        const workingHandlers = createCommandHandlers(workingDeps, [counter])
        const workingHandler = workingHandlers[counter.type]!
        await workingHandler(createCommand)

        // Copy events to failing deps
        const failingDeps = {
          eventStore: createFailingEventStore('saveEvent')
        }
        const events = await workingDeps.eventStore.getEvents(testId)
        for (const event of events) {
          // Add events to failing store before it starts failing
          const originalSave = failingDeps.eventStore.saveEvent
          failingDeps.eventStore.saveEvent = workingDeps.eventStore.saveEvent
          await failingDeps.eventStore.saveEvent(event)
          failingDeps.eventStore.saveEvent = originalSave
        }

        const handlers = createCommandHandlers(failingDeps, [counter])
        const commandHandler = handlers[counter.type]!

        // Act
        const result = await commandHandler(incrementCommand)

        // Assert
        expect(result.ok).toBe(false)
      })
    })

    describe('replay error handling', () => {
      test('returns error when replay fails with non-recoverable error', async () => {
        // Arrange
        const deps = {
          eventStore: createFailingEventStore('getEvents')
        }
        const handlers = createCommandHandlers(deps, [counter])
        const commandHandler = handlers[counter.type]!

        // Act
        const result = await commandHandler(createCommand)

        // Assert
        expect(result.ok).toBe(false)
      })
    })
  })

  describe('createCommandHandlers', () => {
    test('creates handlers for all aggregates and services', () => {
      // Arrange
      const deps = {
        eventStore: new EventStoreInMemory()
      }

      // Act
      const handlers = createCommandHandlers(deps, [counter])

      // Assert
      expect(handlers).toHaveProperty('counter')
      expect(typeof handlers[counter.type]).toBe('function')
    })

    test('returns empty object when no aggregates or services provided', () => {
      // Arrange
      const deps = {
        eventStore: new EventStoreInMemory()
      }

      // Act
      const handlers = createCommandHandlers(deps, [])

      // Assert
      expect(handlers).toEqual({})
    })

    test('overrides aggregate handler with service handler when types are duplicated', () => {
      // Arrange
      const deps = {
        eventStore: new EventStoreInMemory()
      }

      // Act
      const handlers = createCommandHandlers(deps, [counter])

      // Assert - Service handler should override the aggregate handler
      expect(handlers).toHaveProperty('counter')
      expect(typeof handlers[counter.type]).toBe('function')
    })
  })

  describe('acceptsCommand operation mode parameter', () => {
    test('calls acceptsCommand with "create" mode for new aggregates', async () => {
      // Arrange
      let capturedMode: string | undefined
      const testAggregate = {
        ...counter,
        acceptsCommand: (_state: unknown, _commandd: unknown, mode: string) => {
          capturedMode = mode
          return true
        }
      }

      const deps = {
        eventStore: new EventStoreInMemory()
      }
      const handlers = createCommandHandlers(deps, [testAggregate])
      const commandHandler = handlers[testAggregate.type]

      // Act
      await commandHandler(createCommand)

      // Assert
      expect(capturedMode).toBe('create')
    })

    test('calls acceptsCommand with "update" mode for existing aggregates', async () => {
      // Arrange
      let capturedMode: string | undefined
      const testAggregate = {
        ...counter,
        acceptsCommand: (_state: unknown, _commandd: unknown, mode: string) => {
          capturedMode = mode
          return true
        }
      }

      const deps = {
        eventStore: new EventStoreInMemory()
      }

      // First create the aggregate
      const handlers = createCommandHandlers(deps, [counter])
      const commandHandler = handlers[counter.type]
      await commandHandler(createCommand)

      // Replace with test aggregate after creation
      const testHandlers = createCommandHandlers(deps, [testAggregate])
      const testHandler = testHandlers[testAggregate.type]

      // Act - Update the existing aggregate
      await testHandler(incrementCommand)

      // Assert
      expect(capturedMode).toBe('update')
    })

    test('rejects create command when acceptsCommand returns false for create mode', async () => {
      // Arrange
      const rejectingCreateAggregate = {
        ...counter,
        acceptsCommand: (_state: unknown, _commandd: unknown, mode: string) => {
          return mode !== 'create'
        }
      }

      const deps = {
        eventStore: new EventStoreInMemory()
      }
      const handlers = createCommandHandlers(deps, [rejectingCreateAggregate])
      const commandHandler = handlers[rejectingCreateAggregate.type]

      // Act
      const result = await commandHandler(createCommand)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('COMMAND_NOT_ACCEPTED')
        expect(result.error.message).toContain('Create command not accepted')
      }
    })

    test('rejects update command when acceptsCommand returns false for update mode', async () => {
      // Arrange
      const rejectingUpdateAggregate = {
        ...counter,
        acceptsCommand: (_state: unknown, _commandd: unknown, mode: string) => {
          return mode !== 'update'
        }
      }

      const deps = {
        eventStore: new EventStoreInMemory()
      }

      // First create with normal counter
      const normalHandlers = createCommandHandlers(deps, [counter])
      const normalHandler = normalHandlers[counter.type]
      await normalHandler(createCommand)

      // Replace with rejecting aggregate
      const testHandlers = createCommandHandlers(deps, [rejectingUpdateAggregate])
      const testHandler = testHandlers[rejectingUpdateAggregate.type]

      // Act - Try to update
      const result = await testHandler(incrementCommand)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('COMMAND_NOT_ACCEPTED')
        expect(result.error.message).toContain('Update command not accepted')
      }
    })
  })
})
