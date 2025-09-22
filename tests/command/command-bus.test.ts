import { describe, expect, test } from 'bun:test'
import { EventStoreInMemory } from '../../src/adapter/event-store-in-memory'
import { createCommandBus } from '../../src/command/command-bus'
import { zeroId } from '../../src/command/helpers/aggregate-id'
import type { AggregateId, Command } from '../../src/types/core'
import type { CommandHandler, CommandHandlerMiddleware } from '../../src/types/framework'
import { counter } from '../fixtures/counter-app/features/counter/counter-aggregate'

describe('command-bus', () => {
  describe('createCommandBus', () => {
    test('creates command bus with minimal configuration', () => {
      // Arrange
      const deps = { eventStore: new EventStoreInMemory() }

      // Act
      const commandBus = createCommandBus({
        deps,
        aggregates: [],
        middleware: []
      })

      // Assert
      expect(typeof commandBus).toBe('function')
    })

    test('creates command bus with full configuration including middleware and services', () => {
      // Arrange
      const deps = { eventStore: new EventStoreInMemory() }
      const testMiddleware: CommandHandlerMiddleware = async (command, next) => next(command)

      // Act
      const commandBus = createCommandBus({
        deps,
        aggregates: [counter],
        middleware: [testMiddleware]
      })

      // Assert
      expect(typeof commandBus).toBe('function')
    })

    test('returns function that can execute commands', () => {
      // Arrange
      const deps = { eventStore: new EventStoreInMemory() }

      // Act
      const commandBus = createCommandBus({ deps })

      // Assert
      expect(typeof commandBus).toBe('function')
      expect(commandBus.length).toBe(1) // function should accept one parameter (command)
    })
  })

  describe('CommandHandler', () => {
    describe('command validation', () => {
      test('executes valid command successfully', async () => {
        // Arrange
        const deps = { eventStore: new EventStoreInMemory() }
        const commandBus = createCommandBus({
          deps,
          aggregates: [counter]
        })

        const validCommand: Command = {
          type: 'create',
          id: zeroId('counter'),
          payload: { count: 0 }
        }

        // Act
        const result = await commandBus(validCommand)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.id).toEqual(validCommand.id)
        }
      })

      test('returns error for invalid command structure', async () => {
        // Arrange
        const deps = { eventStore: new EventStoreInMemory() }
        const commandBus = createCommandBus({ deps })

        // missing required fields like 'type'
        const invalidCommand = {
          id: zeroId('counter')
        }

        // Act
        const result = await commandBus(invalidCommand as Command)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('INVALID_COMMAND_TYPE')
        }
      })

      test('returns error for command with invalid aggregate ID structure', async () => {
        // Arrange
        const deps = { eventStore: new EventStoreInMemory() }
        const commandBus = createCommandBus({ deps })

        const invalidCommand: Command = {
          type: 'create',
          id: { invalid: 'structure' } as unknown as AggregateId, // intentionally invalid structure for testing
          payload: { value: 42 }
        }

        // Act
        const result = await commandBus(invalidCommand)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('INVALID_AGGREGATE_ID')
        }
      })

      test('returns error for command with array payload', async () => {
        // Arrange
        const deps = { eventStore: new EventStoreInMemory() }
        const commandBus = createCommandBus({ deps })

        const invalidCommand: Command = {
          type: 'create',
          id: zeroId('counter'),
          payload: [1, 2, 3] // arrays are not valid payloads
        }

        // Act
        const result = await commandBus(invalidCommand)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('INVALID_COMMAND_PAYLOAD')
        }
      })

      test('returns error for command with empty object payload', async () => {
        // Arrange
        const deps = { eventStore: new EventStoreInMemory() }
        const commandBus = createCommandBus({ deps })

        const invalidCommand: Command = {
          type: 'create',
          id: zeroId('counter'),
          payload: {} // empty objects are not valid payloads
        }

        // Act
        const result = await commandBus(invalidCommand)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('INVALID_COMMAND_PAYLOAD')
        }
      })

      test('returns error for command with null payload', async () => {
        // Arrange
        const deps = { eventStore: new EventStoreInMemory() }
        const commandBus = createCommandBus({ deps })

        const invalidCommand = {
          type: 'create',
          id: zeroId('counter'),
          payload: null // null is not a valid payload
        }

        // Act
        const result = await commandBus(invalidCommand as Command)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('INVALID_COMMAND_PAYLOAD')
        }
      })

      test('accepts command without payload', async () => {
        // Arrange
        const deps = { eventStore: new EventStoreInMemory() }
        const commandBus = createCommandBus({
          deps,
          aggregates: [counter]
        })

        const validCommand: Command = {
          type: 'increment',
          id: zeroId('counter')
          // no payload is valid
        }

        // Act
        const result = await commandBus(validCommand)

        // Assert
        expect(result.ok).toBe(true)
      })

      test('returns error for invalid command type', async () => {
        // Arrange
        const deps = { eventStore: new EventStoreInMemory() }
        const commandBus = createCommandBus({ deps })

        const invalidCommand: Command = {
          type: '', // invalid empty type
          id: zeroId('counter')
        }

        // Act
        const result = await commandBus(invalidCommand)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('INVALID_COMMAND_TYPE')
        }
      })
    })

    describe('command handler resolution', () => {
      test('executes command when matching handler exists', async () => {
        // Arrange
        const deps = { eventStore: new EventStoreInMemory() }
        const commandBus = createCommandBus({
          deps,
          aggregates: [counter]
        })

        const command: Command = {
          type: 'create',
          id: zeroId('counter'),
          payload: { count: 5 }
        }

        // Act
        const result = await commandBus(command)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.id).toEqual(command.id)
        }
      })

      test('returns error when no handler found for command type', async () => {
        // Arrange
        const deps = { eventStore: new EventStoreInMemory() }
        const commandBus = createCommandBus({
          deps,
          aggregates: [] // no aggregates registered
        })

        const command: Command = {
          type: 'create',
          id: zeroId('nonexistent'),
          payload: { data: 'test' }
        }

        // Act
        const result = await commandBus(command)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('COMMAND_HANDLER_NOT_FOUND')
        }
      })
    })

    describe('middleware application', () => {
      test('executes command without middleware successfully', async () => {
        // Arrange
        const deps = { eventStore: new EventStoreInMemory() }
        const commandBus = createCommandBus({
          deps,
          aggregates: [counter],
          middleware: [] // no middleware
        })

        const command: Command = {
          type: 'create',
          id: zeroId('counter'),
          payload: { count: 0 }
        }

        // Act
        const result = await commandBus(command)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.id).toEqual(command.id)
        }
      })

      test('applies single middleware to command execution', async () => {
        // Arrange
        const deps = { eventStore: new EventStoreInMemory() }
        let middlewareExecuted = false

        const testMiddleware: CommandHandlerMiddleware = async (
          command: Command,
          next: CommandHandler
        ) => {
          middlewareExecuted = true
          return next(command)
        }

        const commandBus = createCommandBus({
          deps,
          aggregates: [counter],
          middleware: [testMiddleware]
        })

        const command: Command = {
          type: 'create',
          id: zeroId('counter'),
          payload: { count: 0 }
        }

        // Act
        const result = await commandBus(command)

        // Assert
        expect(result.ok).toBe(true)
        expect(middlewareExecuted).toBe(true)
      })

      test('applies multiple middleware in correct order', async () => {
        // Arrange
        const deps = { eventStore: new EventStoreInMemory() }
        const executionOrder: string[] = []

        const middleware1: CommandHandlerMiddleware = async (
          command: Command,
          next: CommandHandler
        ) => {
          executionOrder.push('middleware1-before')
          const result = await next(command)
          executionOrder.push('middleware1-after')
          return result
        }

        const middleware2: CommandHandlerMiddleware = async (
          command: Command,
          next: CommandHandler
        ) => {
          executionOrder.push('middleware2-before')
          const result = await next(command)
          executionOrder.push('middleware2-after')
          return result
        }

        const commandBus = createCommandBus({
          deps,
          aggregates: [counter],
          middleware: [middleware1, middleware2]
        })

        const command: Command = {
          type: 'create',
          id: zeroId('counter'),
          payload: { count: 0 }
        }

        // Act
        await commandBus(command)

        // Assert
        expect(executionOrder).toEqual([
          'middleware1-before',
          'middleware2-before',
          'middleware2-after',
          'middleware1-after'
        ])
      })

      test('handles middleware that modifies command', async () => {
        // Arrange
        const deps = { eventStore: new EventStoreInMemory() }

        const modifyingMiddleware: CommandHandlerMiddleware = async (
          command: Command,
          next: CommandHandler
        ) => {
          const modifiedCommand = {
            ...command,
            payload: { count: 999 } // modify payload
          }
          return next(modifiedCommand)
        }

        const commandBus = createCommandBus({
          deps,
          aggregates: [counter],
          middleware: [modifyingMiddleware]
        })

        const originalCommand: Command = {
          type: 'create',
          id: zeroId('counter'),
          payload: { count: 0 }
        }

        // Act
        const result = await commandBus(originalCommand)

        // Assert
        expect(result.ok).toBe(true)
        // The command should be processed with modified payload
        if (result.ok) {
          expect(result.value.id).toEqual(originalCommand.id)
        }
      })

      test('handles middleware that returns early with error', async () => {
        // Arrange
        const deps = { eventStore: new EventStoreInMemory() }

        const errorMiddleware: CommandHandlerMiddleware = async _ => {
          return {
            ok: false,
            error: {
              code: 'MIDDLEWARE_ERROR',
              message: 'Middleware rejected command'
            }
          }
        }

        const commandBus = createCommandBus({
          deps,
          aggregates: [counter],
          middleware: [errorMiddleware]
        })

        const command: Command = {
          type: 'create',
          id: zeroId('counter'),
          payload: { count: 0 }
        }

        // Act
        const result = await commandBus(command)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('MIDDLEWARE_ERROR')
        }
      })

      test('handles middleware that throws error', async () => {
        // Arrange
        const deps = { eventStore: new EventStoreInMemory() }

        const throwingMiddleware: CommandHandlerMiddleware = async _ => {
          throw new Error('Middleware threw an error')
        }

        const commandBus = createCommandBus({
          deps,
          aggregates: [counter],
          middleware: [throwingMiddleware]
        })

        const command: Command = {
          type: 'create',
          id: zeroId('counter'),
          payload: { count: 0 }
        }

        // Act & Assert
        await expect(async () => {
          await commandBus(command)
        }).toThrow('Middleware threw an error')
      })

      test('passes next handler correctly through middleware chain', async () => {
        // Arrange
        const deps = { eventStore: new EventStoreInMemory() }
        let nextHandlerReceived = false

        const verifyingMiddleware: CommandHandlerMiddleware = async (
          command: Command,
          next: CommandHandler
        ) => {
          nextHandlerReceived = typeof next === 'function'
          return next(command)
        }

        const commandBus = createCommandBus({
          deps,
          aggregates: [counter],
          middleware: [verifyingMiddleware]
        })

        const command: Command = {
          type: 'create',
          id: zeroId('counter'),
          payload: { count: 0 }
        }

        // Act
        await commandBus(command)

        // Assert
        expect(nextHandlerReceived).toBe(true)
      })
    })

    describe('error handling and result types', () => {
      test('returns success result for successful command execution', async () => {
        // Arrange
        const deps = { eventStore: new EventStoreInMemory() }
        const commandBus = createCommandBus({
          deps,
          aggregates: [counter]
        })

        const command: Command = {
          type: 'create',
          id: zeroId('counter'),
          payload: { count: 0 }
        }

        // Act
        const result = await commandBus(command)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toHaveProperty('id')
          expect(result.value.id).toEqual(command.id)
        }
      })

      test('returns error result with correct structure for failures', async () => {
        // Arrange
        const deps = { eventStore: new EventStoreInMemory() }
        const commandBus = createCommandBus({ deps })

        const invalidCommand = {}

        // Act
        const result = await commandBus(invalidCommand as Command)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('INVALID_COMMAND_TYPE')
        }
      })

      test('preserves error details from command validation', async () => {
        // Arrange
        const deps = { eventStore: new EventStoreInMemory() }
        const commandBus = createCommandBus({ deps })

        const invalidCommand: Command = {
          type: '',
          id: zeroId('counter')
        }

        // Act
        const result = await commandBus(invalidCommand)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('INVALID_COMMAND_TYPE')
        }
      })

      test('preserves error details from aggregate ID validation', async () => {
        // Arrange
        const deps = { eventStore: new EventStoreInMemory() }
        const commandBus = createCommandBus({ deps })

        const invalidCommand: Command = {
          type: 'create',
          id: { type: 'counter', value: '' } // invalid empty value
        }

        // Act
        const result = await commandBus(invalidCommand)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('INVALID_AGGREGATE_ID')
        }
      })

      test('preserves error details from handler execution', async () => {
        // Arrange
        const deps = { eventStore: new EventStoreInMemory() }
        const commandBus = createCommandBus({
          deps,
          aggregates: [] // no handlers available
        })

        const command: Command = {
          type: 'create',
          id: zeroId('nonexistent')
        }

        // Act
        const result = await commandBus(command)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('COMMAND_HANDLER_NOT_FOUND')
        }
      })
    })
  })
})
