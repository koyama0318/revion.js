import { describe, expect, test } from 'bun:test'
import { validateQuery } from '../../../src/query/helpers/validate-query'
import type { Query } from '../../../src/types/core/query'

describe('[query] validate query helper', () => {
  describe('validateQuery', () => {
    test('returns success when query has valid type', () => {
      // Arrange
      const query: Query = {
        type: 'get-user',
        sourceType: 'user'
      }

      // Act
      const res = validateQuery(query)

      // Assert
      expect(res.ok).toBe(true)
    })

    test('returns success when query has valid type with payload', () => {
      // Arrange
      const query = {
        type: 'get-user',
        sourceType: 'user',
        payload: { id: '123' }
      } as Query

      // Act
      const res = validateQuery(query)

      // Assert
      expect(res.ok).toBe(true)
    })

    test('returns error when query type is empty string', () => {
      // Arrange
      const query: Query = {
        type: '',
        sourceType: 'user'
      }

      // Act
      const res = validateQuery(query)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('INVALID_QUERY_TYPE')
        expect(res.error.message).toBe('query type is not valid')
      }
    })

    test('returns error when query type is undefined', () => {
      // Arrange
      const query = {
        type: undefined,
        sourceType: 'user'
      } as unknown as Query

      // Act
      const res = validateQuery(query)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('INVALID_QUERY_TYPE')
        expect(res.error.message).toBe('query type is not valid')
      }
    })

    test('returns error when query source type is empty string', () => {
      // Arrange
      const query = {
        type: 'get-user',
        sourceType: ''
      } as unknown as Query

      // Act
      const res = validateQuery(query)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('INVALID_QUERY_SOURCE_TYPE')
        expect(res.error.message).toBe('query source type is not valid')
      }
    })

    test('returns error when query type is null', () => {
      // Arrange
      const query = {
        type: null,
        sourceType: 'user'
      } as unknown as Query

      // Act
      const res = validateQuery(query)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('INVALID_QUERY_TYPE')
        expect(res.error.message).toBe('query type is not valid')
      }
    })

    test('returns success when query type contains spaces', () => {
      // Arrange
      const query: Query = {
        type: 'get user by id',
        sourceType: 'user'
      }

      // Act
      const res = validateQuery(query)

      // Assert
      expect(res.ok).toBe(true)
    })

    test('returns success when query type contains special characters', () => {
      // Arrange
      const query: Query = {
        type: 'get-user_by-id.v2',
        sourceType: 'user'
      }

      // Act
      const res = validateQuery(query)

      // Assert
      expect(res.ok).toBe(true)
    })

    test('returns error when query source type is null', () => {
      // Arrange
      const query = {
        type: 'get-user',
        sourceType: null
      } as unknown as Query

      // Act
      const res = validateQuery(query)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('INVALID_QUERY_SOURCE_TYPE')
        expect(res.error.message).toBe('query source type is not valid')
      }
    })

    test('returns error when query source type is undefined', () => {
      // Arrange
      const query = {
        type: 'get-user',
        sourceType: undefined
      } as unknown as Query

      // Act
      const res = validateQuery(query)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('INVALID_QUERY_SOURCE_TYPE')
        expect(res.error.message).toBe('query source type is not valid')
      }
    })

    test('returns success when query has numeric type', () => {
      // Arrange
      const query: Query = {
        type: '123',
        sourceType: 'user'
      }

      // Act
      const res = validateQuery(query)

      // Assert
      expect(res.ok).toBe(true)
    })

    test('returns success when query source type contains special characters', () => {
      // Arrange
      const query: Query = {
        type: 'get-user',
        sourceType: 'user-profile_v2'
      }

      // Act
      const res = validateQuery(query)

      // Assert
      expect(res.ok).toBe(true)
    })

    test('returns success when query object has additional properties', () => {
      // Arrange
      const query = {
        type: 'get-user',
        sourceType: 'user',
        extraProp: 'should be ignored'
      } as Query

      // Act
      const res = validateQuery(query)

      // Assert
      expect(res.ok).toBe(true)
    })
  })
})
