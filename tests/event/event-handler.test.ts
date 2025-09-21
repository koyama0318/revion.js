import { describe, expect, test } from 'bun:test'
import { zeroId } from '../../src'
import { CommandDispatcherMock } from '../../src/adapter/command-dispatcher-mock'
import { ReadModelStoreInMemory } from '../../src/adapter/read-model-store-in-memory'
import { createEventHandlers } from '../../src/event/event-handler'
import type { AggregateId, ReadModel } from '../../src/types/core'
import type { EventReactor } from '../../src/types/event'

// Test types
type TestCommand = { type: 'notify'; id: AggregateId<'test'>; payload: { message: string } }
type TestEvent = { type: 'created'; id: AggregateId<'test'>; payload: { name: string } }
type TestReadModel = ReadModel & { type: 'test'; id: string; name: string }

describe('[event] event handler', () => {
  describe('createEventHandlers', () => {
    describe('successful event handling', () => {
      test('processes event with policy that returns command', async () => {
        // Arrange
        const commandDispatcher = new CommandDispatcherMock()
        const readModelStore = new ReadModelStoreInMemory()

        const reactor: EventReactor<TestCommand, TestEvent, TestReadModel> = {
          type: 'test',
          policy: () => ({
            type: 'notify',
            id: zeroId('test'),
            payload: { message: 'test notification' }
          }),
          projection: {
            created: {
              test: () => ({
                type: 'test',
                id: '123',
                name: 'test'
              })
            }
          },
          projectionMap: {
            created: []
          }
        }

        const deps = { commandDispatcher, readModelStore }
        const handlers = createEventHandlers(deps, [reactor])

        const event = {
          type: 'created',
          id: zeroId('test'),
          payload: { name: 'test' },
          version: 1,
          timestamp: new Date()
        }

        // Act
        const res = await handlers['test'](event)

        // Assert
        expect(res.ok).toBe(true)
      })

      test('processes event with policy that returns null', async () => {
        // Arrange
        const commandDispatcher = new CommandDispatcherMock()
        const readModelStore = new ReadModelStoreInMemory()

        const reactor: EventReactor<TestCommand, TestEvent, TestReadModel> = {
          type: 'test',
          policy: () => null,
          projection: {
            created: {
              test: () => ({
                type: 'test',
                id: '123',
                name: 'test'
              })
            }
          },
          projectionMap: {
            created: []
          }
        }

        const deps = { commandDispatcher, readModelStore }
        const handlers = createEventHandlers(deps, [reactor])

        const event = {
          type: 'created',
          id: zeroId('test'),
          payload: { name: 'test' },
          version: 1,
          timestamp: new Date()
        }

        // Act
        const res = await handlers['test'](event)

        // Assert
        expect(res.ok).toBe(true)
      })
    })

    describe('error handling in dispatch operations', () => {
      test('handles dispatch errors from policy execution', async () => {
        // Arrange
        const commandDispatcher = new CommandDispatcherMock()
        const readModelStore = new ReadModelStoreInMemory()

        // Make commandDispatcher throw error
        commandDispatcher.dispatch = async () => {
          throw new Error('Network timeout')
        }

        const reactor: EventReactor<TestCommand, TestEvent, TestReadModel> = {
          type: 'test',
          policy: () => ({
            type: 'notify',
            id: zeroId('test'),
            payload: { message: 'test' }
          }),
          projection: {
            created: {
              test: () => ({
                type: 'test',
                id: '123',
                name: 'test'
              })
            }
          },
          projectionMap: {
            created: []
          }
        }

        const deps = { commandDispatcher, readModelStore }
        const handlers = createEventHandlers(deps, [reactor])

        const event = {
          type: 'created',
          id: zeroId('test'),
          payload: { name: 'test' },
          version: 1,
          timestamp: new Date()
        }

        // Act
        const res = await handlers['test'](event)

        // Assert
        expect(res.ok).toBe(false)
        if (!res.ok) {
          expect(res.error.code).toBe('COMMAND_DISPATCH_FAILED')
        }
      })
    })

    describe('error handling in projection operations', () => {
      test('handles projection errors when database operations fail', async () => {
        // Arrange
        const commandDispatcher = new CommandDispatcherMock()
        const readModelStore = new ReadModelStoreInMemory()

        // Make readModelStore.save throw error
        readModelStore.save = async () => {
          throw new Error('Database connection lost')
        }

        const reactor: EventReactor<TestCommand, TestEvent, TestReadModel> = {
          type: 'test',
          policy: () => null,
          projection: {
            created: {
              test: () => ({
                type: 'test',
                id: '123',
                name: 'test'
              })
            }
          },
          projectionMap: {
            created: [{ readModel: 'test' }]
          }
        }

        const deps = { commandDispatcher, readModelStore }
        const handlers = createEventHandlers(deps, [reactor])

        const event = {
          type: 'created',
          id: zeroId('test'),
          payload: { name: 'test' },
          version: 1,
          timestamp: new Date()
        }

        // Act
        const res = await handlers['test'](event)

        // Assert
        expect(res.ok).toBe(false)
        if (!res.ok) {
          expect(res.error.code).toBe('SAVE_VIEW_FAILED')
        }
      })

      test('handles non-Error exceptions gracefully', async () => {
        // Arrange
        const commandDispatcher = new CommandDispatcherMock()
        const readModelStore = new ReadModelStoreInMemory()

        // Make readModelStore.save throw non-Error exception
        readModelStore.save = async () => {
          throw 'String error'
        }

        const reactor: EventReactor<TestCommand, TestEvent, TestReadModel> = {
          type: 'test',
          policy: () => null,
          projection: {
            created: {
              test: ({ event }) => ({
                type: 'test',
                id: event.id.value,
                name: 'test'
              })
            }
          },
          projectionMap: {
            created: [{ readModel: 'test' }]
          }
        }

        const deps = { commandDispatcher, readModelStore }
        const handlers = createEventHandlers(deps, [reactor])

        const event = {
          type: 'created',
          id: zeroId('test'),
          payload: { name: 'test' },
          version: 1,
          timestamp: new Date()
        }

        // Act
        const res = await handlers['test'](event)

        // Assert
        expect(res.ok).toBe(false)
        if (!res.ok) {
          expect(res.error.code).toBe('SAVE_VIEW_FAILED')
        }
      })
    })
  })
})
