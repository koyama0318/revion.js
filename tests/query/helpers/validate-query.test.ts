import { describe, expect, test } from 'bun:test'
import { validateQuery } from '../../../src/query/helpers/validate-query'
import type { Query } from '../../../src/types/core/query'

describe('validate-query', () => {
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

    test('returns error when query is null', () => {
      // Arrange
      const query = null

      // Act
      const res = validateQuery(query as unknown as Query)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('INVALID_QUERY')
        expect(res.error.message).toBe('Query is not valid')
      }
    })

    test('returns error when query is undefined', () => {
      // Arrange
      const query = undefined

      // Act
      const res = validateQuery(query as unknown as Query)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('INVALID_QUERY')
        expect(res.error.message).toBe('Query is not valid')
      }
    })

    test('returns error when query is primitive string', () => {
      // Arrange
      const query = 'not-an-object'

      // Act
      const res = validateQuery(query as unknown as Query)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('INVALID_QUERY')
        expect(res.error.message).toBe('Query is not valid')
      }
    })

    test('returns error when query is primitive number', () => {
      // Arrange
      const query = 42

      // Act
      const res = validateQuery(query as unknown as Query)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('INVALID_QUERY')
        expect(res.error.message).toBe('Query is not valid')
      }
    })

    test('returns error when query is boolean', () => {
      // Arrange
      const query = true

      // Act
      const res = validateQuery(query as unknown as Query)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('INVALID_QUERY')
        expect(res.error.message).toBe('Query is not valid')
      }
    })

    test('returns error when query is array', () => {
      // Arrange
      const query = [1, 2, 3]

      // Act
      const res = validateQuery(query as unknown as Query)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('INVALID_QUERY')
        expect(res.error.message).toBe('Query is not valid')
      }
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
  })
})
