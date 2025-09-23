import { describe, expect, test } from 'bun:test'
import { id, zeroId } from '../../../src/command/helpers/aggregate-id'
import { validateEvent } from '../../../src/event/helpers/validate-domain-event'
import type { AggregateId, DomainEvent } from '../../../src/types/core'

describe('[event] validate-domain-event', () => {
  describe('validateEvent', () => {
    test('returns success for valid event with payload', () => {
      // Arrange
      const validId = zeroId('test')
      const event: DomainEvent = {
        type: 'created',
        id: validId,
        payload: { value: 42, name: 'test' }
      }

      // Act
      const result = validateEvent(event)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(undefined)
      }
    })

    test('returns error when event is null', () => {
      // Arrange
      const event = null

      // Act
      const result = validateEvent(event as unknown as DomainEvent)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_EVENT')
        expect(result.error.message).toBe('Event is not valid')
      }
    })

    test('returns error when event is undefined', () => {
      // Arrange
      const event = undefined

      // Act
      const result = validateEvent(event as unknown as DomainEvent)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_EVENT')
        expect(result.error.message).toBe('Event is not valid')
      }
    })

    test('returns error when event is primitive string', () => {
      // Arrange
      const event = 'not-an-object'

      // Act
      const result = validateEvent(event as unknown as DomainEvent)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_EVENT')
        expect(result.error.message).toBe('Event is not valid')
      }
    })

    test('returns error when event is primitive number', () => {
      // Arrange
      const event = 42

      // Act
      const result = validateEvent(event as unknown as DomainEvent)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_EVENT')
        expect(result.error.message).toBe('Event is not valid')
      }
    })

    test('returns error when event is boolean', () => {
      // Arrange
      const event = true

      // Act
      const result = validateEvent(event as unknown as DomainEvent)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_EVENT')
        expect(result.error.message).toBe('Event is not valid')
      }
    })

    test('returns error when event is array', () => {
      // Arrange
      const event = [1, 2, 3]

      // Act
      const result = validateEvent(event as unknown as DomainEvent)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_EVENT')
        expect(result.error.message).toBe('Event is not valid')
      }
    })

    test('returns success for valid event without payload', () => {
      // Arrange
      const validId = zeroId('test')
      const event: DomainEvent = {
        type: 'activated',
        id: validId
      }

      // Act
      const result = validateEvent(event)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(undefined)
      }
    })

    test('returns success for valid event with undefined payload', () => {
      // Arrange
      const validId = zeroId('test')
      const event: DomainEvent = {
        type: 'deactivated',
        id: validId,
        payload: undefined
      }

      // Act
      const result = validateEvent(event)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(undefined)
      }
    })

    test('returns error when aggregate ID type is empty', () => {
      // Arrange
      const invalidId: AggregateId = { type: '', value: '123e4567-e89b-12d3-a456-426614174000' }
      const event: DomainEvent = {
        type: 'created',
        id: invalidId,
        payload: { value: 42 }
      }

      // Act
      const result = validateEvent(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_AGGREGATE_ID')
      }
    })

    test('returns error when aggregate ID value is empty', () => {
      // Arrange
      const invalidId: AggregateId = { type: 'test', value: '' }
      const event: DomainEvent = {
        type: 'created',
        id: invalidId,
        payload: { value: 42 }
      }

      // Act
      const result = validateEvent(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_AGGREGATE_ID')
      }
    })

    test('returns error when aggregate ID value is not a valid UUID', () => {
      // Arrange
      const invalidId: AggregateId = { type: 'test', value: 'not-a-uuid' }
      const event: DomainEvent = {
        type: 'created',
        id: invalidId,
        payload: { value: 42 }
      }

      // Act
      const result = validateEvent(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_AGGREGATE_ID')
      }
    })

    test('returns error when event type is empty string', () => {
      // Arrange
      const validId = zeroId('test')
      const event: DomainEvent = {
        type: '',
        id: validId,
        payload: { value: 42 }
      }

      // Act
      const result = validateEvent(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_EVENT_TYPE')
      }
    })

    test('returns error when payload is null', () => {
      // Arrange
      const validId = zeroId('test')
      const event = {
        type: 'created',
        id: validId,
        payload: null
      }

      // Act
      const result = validateEvent(event as DomainEvent)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_EVENT_PAYLOAD')
      }
    })

    test('returns error when payload is empty object', () => {
      // Arrange
      const validId = zeroId('test')
      const event: DomainEvent = {
        type: 'created',
        id: validId,
        payload: {}
      }

      // Act
      const result = validateEvent(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_EVENT_PAYLOAD')
      }
    })

    test('returns error when payload is primitive string', () => {
      // Arrange
      const validId = zeroId('test')
      const event = {
        type: 'created',
        id: validId,
        payload: 'string-payload'
      }

      // Act
      const result = validateEvent(event as DomainEvent)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_EVENT_PAYLOAD')
      }
    })

    test('returns error when payload is primitive number', () => {
      // Arrange
      const validId = zeroId('test')
      const event = {
        type: 'created',
        id: validId,
        payload: 42
      }

      // Act
      const result = validateEvent(event as DomainEvent)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_EVENT_PAYLOAD')
      }
    })

    test('returns error when payload is boolean', () => {
      // Arrange
      const validId = zeroId('test')
      const event = {
        type: 'created',
        id: validId,
        payload: true
      }

      // Act
      const result = validateEvent(event as DomainEvent)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_EVENT_PAYLOAD')
      }
    })

    test('returns error when payload is array', () => {
      // Arrange
      const validId = zeroId('test')
      const event = {
        type: 'created',
        id: validId,
        payload: [1, 2, 3]
      }

      // Act
      const result = validateEvent(event as DomainEvent)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_EVENT_PAYLOAD')
      }
    })

    test('returns success for valid complex nested payload object', () => {
      // Arrange
      const validId = zeroId('test')
      const event: DomainEvent = {
        type: 'created',
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
      const result = validateEvent(event)

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
      const event: DomainEvent = {
        type: 'created',
        id: validId,
        payload: { value: 42 }
      }

      // Act
      const result = validateEvent(event)

      // Assert
      expect(result.ok).toBe(true)
    })

    test('handles UUID validation correctly for invalid UUID format', () => {
      // Arrange
      const invalidUuid = '123e4567-e89b-12d3-a456-42661417400G' // contains 'G' which is invalid
      const invalidId = id('test', invalidUuid)
      const event: DomainEvent = {
        type: 'created',
        id: invalidId,
        payload: { value: 42 }
      }

      // Act
      const result = validateEvent(event)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_AGGREGATE_ID')
      }
    })

    test('validates multiple error conditions with event type taking precedence', () => {
      // Arrange - Both aggregate ID and event type are invalid
      const invalidId: AggregateId = { type: '', value: '' }
      const event = {
        type: '',
        id: invalidId,
        payload: null
      }

      // Act
      const result = validateEvent(event as DomainEvent)

      // Assert - Should return event type error first
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_EVENT_TYPE')
      }
    })

    test('validates event type after valid aggregate ID', () => {
      // Arrange - Valid aggregate ID but invalid event type
      const validId = zeroId('test')
      const event = {
        type: '',
        id: validId,
        payload: null
      }

      // Act
      const result = validateEvent(event as DomainEvent)

      // Assert - Should return event type error
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_EVENT_TYPE')
      }
    })

    test('validates payload after valid aggregate ID and event type', () => {
      // Arrange - Valid aggregate ID and event type but invalid payload
      const validId = zeroId('test')
      const event = {
        type: 'created',
        id: validId,
        payload: null
      }

      // Act
      const result = validateEvent(event as DomainEvent)

      // Assert - Should return payload error
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_EVENT_PAYLOAD')
      }
    })
  })
})
