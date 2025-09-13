import { describe, expect, test } from 'bun:test'
import { id, zeroId } from '../../../src/command/helpers/aggregate-id'
import { validateCommand } from '../../../src/command/helpers/validate-command'
import type { AggregateId, Command } from '../../../src/types/core'

describe('[command] validate command function', () => {
  describe('validateCommand', () => {
    test('returns success for valid command with payload', () => {
      // Arrange
      const validId = zeroId('test')
      const command: Command = {
        type: 'create',
        id: validId,
        payload: { value: 42, name: 'test' }
      }

      // Act
      const result = validateCommand(command)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(undefined)
      }
    })

    test('returns success for valid command without payload', () => {
      // Arrange
      const validId = zeroId('test')
      const command: Command = {
        type: 'activate',
        id: validId
      }

      // Act
      const result = validateCommand(command)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(undefined)
      }
    })

    test('returns success for valid command with undefined payload', () => {
      // Arrange
      const validId = zeroId('test')
      const command: Command = {
        type: 'deactivate',
        id: validId,
        payload: undefined
      }

      // Act
      const result = validateCommand(command)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(undefined)
      }
    })

    test('returns error when aggregate ID type is empty', () => {
      // Arrange
      const invalidId: AggregateId = { type: '', value: '123e4567-e89b-12d3-a456-426614174000' }
      const command: Command = {
        type: 'create',
        id: invalidId,
        payload: { value: 42 }
      }

      // Act
      const result = validateCommand(command)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_AGGREGATE_ID')
      }
    })

    test('returns error when aggregate ID value is empty', () => {
      // Arrange
      const invalidId: AggregateId = { type: 'test', value: '' }
      const command: Command = {
        type: 'create',
        id: invalidId,
        payload: { value: 42 }
      }

      // Act
      const result = validateCommand(command)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_AGGREGATE_ID')
      }
    })

    test('returns error when aggregate ID value is not a valid UUID', () => {
      // Arrange
      const invalidId: AggregateId = { type: 'test', value: 'not-a-uuid' }
      const command: Command = {
        type: 'create',
        id: invalidId,
        payload: { value: 42 }
      }

      // Act
      const result = validateCommand(command)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_AGGREGATE_ID')
      }
    })

    test('returns error when command type is empty string', () => {
      // Arrange
      const validId = zeroId('test')
      const command: Command = {
        type: '',
        id: validId,
        payload: { value: 42 }
      }

      // Act
      const result = validateCommand(command)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_COMMAND_TYPE')
      }
    })

    test('returns error when payload is null', () => {
      // Arrange
      const validId = zeroId('test')
      const command = {
        type: 'create',
        id: validId,
        payload: null
      }

      // Act
      const result = validateCommand(command as Command)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_COMMAND_PAYLOAD')
      }
    })

    test('returns error when payload is empty object', () => {
      // Arrange
      const validId = zeroId('test')
      const command: Command = {
        type: 'create',
        id: validId,
        payload: {}
      }

      // Act
      const result = validateCommand(command)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_COMMAND_PAYLOAD')
      }
    })

    test('returns error when payload is primitive string', () => {
      // Arrange
      const validId = zeroId('test')
      const command = {
        type: 'create',
        id: validId,
        payload: 'string-payload'
      }

      // Act
      const result = validateCommand(command as Command)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_COMMAND_PAYLOAD')
      }
    })

    test('returns error when payload is primitive number', () => {
      // Arrange
      const validId = zeroId('test')
      const command = {
        type: 'create',
        id: validId,
        payload: 42
      }

      // Act
      const result = validateCommand(command as Command)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_COMMAND_PAYLOAD')
      }
    })

    test('returns error when payload is boolean', () => {
      // Arrange
      const validId = zeroId('test')
      const command = {
        type: 'create',
        id: validId,
        payload: true
      }

      // Act
      const result = validateCommand(command as Command)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_COMMAND_PAYLOAD')
      }
    })

    test('returns error when payload is array', () => {
      // Arrange
      const validId = zeroId('test')
      const command = {
        type: 'create',
        id: validId,
        payload: [1, 2, 3]
      }

      // Act
      const result = validateCommand(command as Command)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_COMMAND_PAYLOAD')
      }
    })

    test('returns success for valid complex nested payload object', () => {
      // Arrange
      const validId = zeroId('test')
      const command: Command = {
        type: 'create',
        id: validId,
        payload: {
          name: 'test item',
          metadata: {
            created: new Date().toISOString(),
            version: 1
          },
          tags: ['important', 'urgent']
        }
      }

      // Act
      const result = validateCommand(command)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(undefined)
      }
    })

    test('handles UUID validation correctly for valid v4 UUID', () => {
      // Arrange
      const validUuid = '123e4567-e89b-12d3-a456-426614174000'
      const validId = id('test', validUuid)
      const command: Command = {
        type: 'create',
        id: validId,
        payload: { value: 42 }
      }

      // Act
      const result = validateCommand(command)

      // Assert
      expect(result.ok).toBe(true)
    })

    test('handles UUID validation correctly for invalid UUID format', () => {
      // Arrange
      const invalidUuid = '123e4567-e89b-12d3-a456-42661417400G' // contains 'G' which is invalid
      const invalidId = id('test', invalidUuid)
      const command: Command = {
        type: 'create',
        id: invalidId,
        payload: { value: 42 }
      }

      // Act
      const result = validateCommand(command)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_AGGREGATE_ID')
      }
    })

    test('validates multiple error conditions with aggregate ID taking precedence', () => {
      // Arrange - Both aggregate ID and command type are invalid
      const invalidId: AggregateId = { type: '', value: '' }
      const command = {
        type: '',
        id: invalidId,
        payload: null
      }

      // Act
      const result = validateCommand(command as Command)

      // Assert - Should return aggregate ID error first
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_COMMAND_TYPE')
      }
    })

    test('validates command type after valid aggregate ID', () => {
      // Arrange - Valid aggregate ID but invalid command type
      const validId = zeroId('test')
      const command = {
        type: '',
        id: validId,
        payload: null
      }

      // Act
      const result = validateCommand(command as Command)

      // Assert - Should return command type error
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_COMMAND_TYPE')
      }
    })

    test('validates payload after valid aggregate ID and command type', () => {
      // Arrange - Valid aggregate ID and command type but invalid payload
      const validId = zeroId('test')
      const command = {
        type: 'create',
        id: validId,
        payload: null
      }

      // Act
      const result = validateCommand(command as Command)

      // Assert - Should return payload error
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_COMMAND_PAYLOAD')
      }
    })
  })
})
