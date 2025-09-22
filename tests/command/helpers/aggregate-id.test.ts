import { describe, expect, test } from 'bun:test'
import {
  id,
  isEqualId,
  validateAggregateId,
  zeroId
} from '../../../src/command/helpers/aggregate-id'
import type { AggregateId } from '../../../src/types/core'

describe('aggregate-id', () => {
  describe('id', () => {
    test('creates aggregate ID with specified type and value', () => {
      // Arrange
      const type = 'todo'
      const value = '123e4567-e89b-12d3-a456-426614174000'

      // Act
      const res = id(type, value)

      // Assert
      expect(res.type).toBe(type)
      expect(res.value).toBe(value)
    })

    test('preserves exact type parameter in return type', () => {
      // Arrange
      const type = 'product'
      const value = '123e4567-e89b-12d3-a456-426614174000'

      // Act
      const res = id(type, value)

      // Assert
      expect(res.type).toBe('product')
      expect(res.value).toBe(value)
    })

    test('handles empty string type', () => {
      // Arrange
      const type = ''
      const value = '123e4567-e89b-12d3-a456-426614174000'

      // Act
      const res = id(type, value)

      // Assert
      expect(res.type).toBe('')
      expect(res.value).toBe(value)
    })

    test('handles empty string value', () => {
      // Arrange
      const type = 'todo'
      const value = ''

      // Act
      const res = id(type, value)

      // Assert
      expect(res.type).toBe(type)
      expect(res.value).toBe('')
    })
  })

  describe('zeroId', () => {
    test('creates aggregate ID with specified type and generated UUID', () => {
      // Arrange
      const type = 'todo'

      // Act
      const res = zeroId(type)

      // Assert
      expect(res.type).toBe(type)
      expect(res.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    })

    test('generates unique UUIDs for multiple calls', () => {
      // Arrange & Act
      const id1 = zeroId('todo')
      const id2 = zeroId('todo')

      // Assert
      expect(id1.value).not.toBe(id2.value)
      expect(id1.type).toBe(id2.type)
    })

    test('preserves exact type parameter in return type', () => {
      // Arrange
      const type = 'product'

      // Act
      const res = zeroId(type)

      // Assert
      expect(res.type).toBe('product')
      expect(res.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    })

    test('handles empty string type', () => {
      // Arrange
      const type = ''

      // Act
      const res = zeroId(type)

      // Assert
      expect(res.type).toBe('')
      expect(res.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    })
  })

  describe('validateAggregateId', () => {
    test('returns success for valid aggregate ID', () => {
      // Arrange
      const aggregateId = id('todo', '123e4567-e89b-12d3-a456-426614174000')

      // Act
      const res = validateAggregateId(aggregateId)

      // Assert
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.value).toBe(undefined)
      }
    })

    test('returns success for valid aggregate ID from zeroId', () => {
      // Arrange
      const aggregateId = zeroId('product')

      // Act
      const res = validateAggregateId(aggregateId)

      // Assert
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.value).toBe(undefined)
      }
    })

    test('returns error when aggregate ID is null', () => {
      // Arrange
      const aggregateId = null

      // Act
      const res = validateAggregateId(aggregateId as unknown as AggregateId)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('INVALID_AGGREGATE_ID')
        expect(res.error.message).toBe('Aggregate ID is not valid')
      }
    })

    test('returns error when aggregate ID is undefined', () => {
      // Arrange
      const aggregateId = undefined

      // Act
      const res = validateAggregateId(aggregateId as unknown as AggregateId)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('INVALID_AGGREGATE_ID')
        expect(res.error.message).toBe('Aggregate ID is not valid')
      }
    })

    test('returns error when aggregate ID is not an object', () => {
      // Arrange
      const aggregateId = 'string-instead-of-object'

      // Act
      const res = validateAggregateId(aggregateId as unknown as AggregateId)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('INVALID_AGGREGATE_ID')
        expect(res.error.message).toBe('Aggregate ID is not valid')
      }
    })

    test('returns error when aggregate ID type is empty string', () => {
      // Arrange
      const aggregateId: AggregateId = { type: '', value: '123e4567-e89b-12d3-a456-426614174000' }

      // Act
      const res = validateAggregateId(aggregateId)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('INVALID_AGGREGATE_ID')
        expect(res.error.message).toBe('Aggregate ID is not valid')
      }
    })

    test('returns error when aggregate ID value is empty string', () => {
      // Arrange
      const aggregateId: AggregateId = { type: 'todo', value: '' }

      // Act
      const res = validateAggregateId(aggregateId)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('INVALID_AGGREGATE_ID')
        expect(res.error.message).toBe('Aggregate ID is not valid')
      }
    })

    test('returns error when both type and value are empty strings', () => {
      // Arrange
      const aggregateId: AggregateId = { type: '', value: '' }

      // Act
      const res = validateAggregateId(aggregateId)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('INVALID_AGGREGATE_ID')
        expect(res.error.message).toBe('Aggregate ID is not valid')
      }
    })

    test('returns error when value is not a valid UUID', () => {
      // Arrange
      const aggregateId = id('todo', 'not-a-uuid')

      // Act
      const res = validateAggregateId(aggregateId)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('INVALID_AGGREGATE_ID')
        expect(res.error.message).toBe('Aggregate ID is not valid uuid')
      }
    })

    test('returns error when value has invalid UUID format with wrong length', () => {
      // Arrange
      const aggregateId = id('todo', '123e4567-e89b-12d3-a456-42661417400') // missing one character

      // Act
      const res = validateAggregateId(aggregateId)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('INVALID_AGGREGATE_ID')
        expect(res.error.message).toBe('Aggregate ID is not valid uuid')
      }
    })

    test('returns error when value has invalid UUID format with extra characters', () => {
      // Arrange
      const aggregateId = id('todo', '123e4567-e89b-12d3-a456-4266141740000') // extra character

      // Act
      const res = validateAggregateId(aggregateId)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('INVALID_AGGREGATE_ID')
        expect(res.error.message).toBe('Aggregate ID is not valid uuid')
      }
    })

    test('returns error when value has invalid UUID format with missing hyphens', () => {
      // Arrange
      const aggregateId = id('todo', '123e4567e89b12d3a456426614174000')

      // Act
      const res = validateAggregateId(aggregateId)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('INVALID_AGGREGATE_ID')
        expect(res.error.message).toBe('Aggregate ID is not valid uuid')
      }
    })

    test('accepts valid UUID with uppercase characters', () => {
      // Arrange
      const aggregateId = id('todo', '123E4567-E89B-12D3-A456-426614174000')

      // Act
      const res = validateAggregateId(aggregateId)

      // Assert
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.value).toBe(undefined)
      }
    })

    test('accepts valid UUID with lowercase characters', () => {
      // Arrange
      const aggregateId = id('todo', '123e4567-e89b-12d3-a456-426614174000')

      // Act
      const res = validateAggregateId(aggregateId)

      // Assert
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.value).toBe(undefined)
      }
    })

    test('accepts valid UUID with mixed case characters', () => {
      // Arrange
      const aggregateId = id('todo', '123E4567-e89B-12d3-A456-426614174000')

      // Act
      const res = validateAggregateId(aggregateId)

      // Assert
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.value).toBe(undefined)
      }
    })
  })

  describe('isEqualId', () => {
    test('returns true for identical aggregate IDs', () => {
      // Arrange
      const id1 = id('todo', '123e4567-e89b-12d3-a456-426614174000')
      const id2 = id('todo', '123e4567-e89b-12d3-a456-426614174000')

      // Act
      const res = isEqualId(id1, id2)

      // Assert
      expect(res).toBe(true)
    })

    test('returns false for different types with same value', () => {
      // Arrange
      const id1 = id('todo', '123e4567-e89b-12d3-a456-426614174000')
      const id2 = id('product', '123e4567-e89b-12d3-a456-426614174000')

      // Act
      const res = isEqualId(id1, id2)

      // Assert
      expect(res).toBe(false)
    })

    test('returns false for same type with different values', () => {
      // Arrange
      const id1 = id('todo', '123e4567-e89b-12d3-a456-426614174000')
      const id2 = id('todo', '987f6543-a21b-34e5-b678-537425285111')

      // Act
      const res = isEqualId(id1, id2)

      // Assert
      expect(res).toBe(false)
    })

    test('returns false for completely different aggregate IDs', () => {
      // Arrange
      const id1 = id('todo', '123e4567-e89b-12d3-a456-426614174000')
      const id2 = id('product', '987f6543-a21b-34e5-b678-537425285111')

      // Act
      const res = isEqualId(id1, id2)

      // Assert
      expect(res).toBe(false)
    })

    test('returns true for IDs created with zeroId and id with same values', () => {
      // Arrange
      const zeroIdInstance = zeroId('todo')
      const idInstance = id('todo', zeroIdInstance.value)

      // Act
      const res = isEqualId(zeroIdInstance, idInstance)

      // Assert
      expect(res).toBe(true)
    })

    test('returns false for different zeroId instances', () => {
      // Arrange
      const id1 = zeroId('todo')
      const id2 = zeroId('todo')

      // Act
      const res = isEqualId(id1, id2)

      // Assert
      expect(res).toBe(false)
    })

    test('handles empty string type comparison', () => {
      // Arrange
      const id1 = id('', '123e4567-e89b-12d3-a456-426614174000')
      const id2 = id('', '123e4567-e89b-12d3-a456-426614174000')

      // Act
      const res = isEqualId(id1, id2)

      // Assert
      expect(res).toBe(true)
    })

    test('handles empty string value comparison', () => {
      // Arrange
      const id1 = id('todo', '')
      const id2 = id('todo', '')

      // Act
      const res = isEqualId(id1, id2)

      // Assert
      expect(res).toBe(true)
    })

    test('handles case sensitivity in UUID values', () => {
      // Arrange
      const id1 = id('todo', '123e4567-e89b-12d3-a456-426614174000')
      const id2 = id('todo', '123E4567-E89B-12D3-A456-426614174000')

      // Act
      const res = isEqualId(id1, id2)

      // Assert
      expect(res).toBe(false)
    })
  })
})
