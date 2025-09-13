import { describe, expect, test } from 'bun:test'
import type { Ok } from '../../src'
import { err, ok, toAsyncResult, toResult } from '../../src'

describe('[utils] result utility functions', () => {
  describe('ok', () => {
    test('creates successful result with string value', () => {
      // Arrange
      const value = 'success'

      // Act
      const res = ok(value)

      // Assert
      expect(res.ok).toBe(true)
      expect(res.value).toBe('success')
    })

    test('creates successful result with number value', () => {
      // Arrange
      const value = 42

      // Act
      const res = ok(value)

      // Assert
      expect(res.ok).toBe(true)
      expect(res.value).toBe(42)
    })

    test('creates successful result with object value', () => {
      // Arrange
      const value = { name: 'test', count: 1 }

      // Act
      const res = ok(value)

      // Assert
      expect(res.ok).toBe(true)
      expect(res.value).toEqual({ name: 'test', count: 1 })
    })

    test('creates successful result with null value', () => {
      // Arrange
      const value = null

      // Act
      const res = ok(value)

      // Assert
      expect(res.ok).toBe(true)
      expect(res.value).toBe(null)
    })

    test('creates successful result with undefined value', () => {
      // Arrange
      const value = undefined

      // Act
      const res = ok(value)

      // Assert
      expect(res.ok).toBe(true)
      expect(res.value).toBe(undefined)
    })
  })

  describe('err', () => {
    test('creates error result with Error object', () => {
      // Arrange
      const error = new Error('Something went wrong')

      // Act
      const res = err(error)

      // Assert
      expect(res.ok).toBe(false)
      expect(res.error).toBe(error)
      expect(res.error.message).toBe('Something went wrong')
    })

    test('creates error result with string error', () => {
      // Arrange
      const error = 'String error'

      // Act
      const res = err(error)

      // Assert
      expect(res.ok).toBe(false)
      expect(res.error).toBe('String error')
    })

    test('creates error result with custom error object', () => {
      // Arrange
      const error = { code: 'CUSTOM_ERROR', message: 'Custom error message' }

      // Act
      const res = err(error)

      // Assert
      expect(res.ok).toBe(false)
      expect(res.error).toEqual({ code: 'CUSTOM_ERROR', message: 'Custom error message' })
    })

    test('creates error result with null error', () => {
      // Arrange
      const error = null

      // Act
      const res = err(error)

      // Assert
      expect(res.ok).toBe(false)
      expect(res.error).toBe(null)
    })
  })

  describe('toResult', () => {
    test('returns success when function executes successfully', () => {
      // Arrange
      const fn = () => 'success value'

      // Act
      const res = toResult(fn)

      // Assert
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.value).toBe('success value')
      }
    })

    test('returns success when function returns object', () => {
      // Arrange
      const fn = () => ({ result: 'data', count: 5 })

      // Act
      const res = toResult(fn)

      // Assert
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.value).toEqual({ result: 'data', count: 5 })
      }
    })

    test('returns error when function throws Error', () => {
      // Arrange
      const fn = () => {
        throw new Error('Function failed')
      }

      // Act
      const res = toResult(fn)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).toBeInstanceOf(Error)
        expect(res.error.message).toBe('Function failed')
      }
    })

    test('returns error when function throws string', () => {
      // Arrange
      const fn = () => {
        throw 'String error'
      }

      // Act
      const res = toResult(fn)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).toBeInstanceOf(Error)
        expect(res.error.message).toBe('String error')
      }
    })

    test('returns error when function throws number', () => {
      // Arrange
      const fn = () => {
        throw 404
      }

      // Act
      const res = toResult(fn)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).toBeInstanceOf(Error)
        expect(res.error.message).toBe('404')
      }
    })

    test('returns error when function throws null', () => {
      // Arrange
      const fn = () => {
        throw null
      }

      // Act
      const res = toResult(fn)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).toBeInstanceOf(Error)
        expect(res.error.message).toBe('null')
      }
    })
  })

  describe('toAsyncResult', () => {
    test('returns success when async function resolves', async () => {
      // Arrange
      const fn = async () => 'async success'

      // Act
      const res = await toAsyncResult(fn)

      // Assert
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.value).toBe('async success')
      }
    })

    test('returns success when async function resolves with object', async () => {
      // Arrange
      const fn = async () => ({ data: 'test', id: 1 })

      // Act
      const res = await toAsyncResult(fn)

      // Assert
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.value).toEqual({ data: 'test', id: 1 })
      }
    })

    test('returns existing result when function returns result object', async () => {
      // Arrange
      const fn = async () => ok('already wrapped')

      // Act
      const res = await toAsyncResult(fn)

      // Assert
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.value).toBe('already wrapped' as unknown as Ok<string>)
      }
    })

    test('returns error when async function rejects with Error', async () => {
      // Arrange
      const fn = async () => {
        throw new Error('Async error')
      }

      // Act
      const res = await toAsyncResult(fn)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).toBeInstanceOf(Error)
        expect(res.error.message).toBe('Async error')
      }
    })

    test('returns error when async function rejects with string', async () => {
      // Arrange
      const fn = async () => {
        throw 'Async string error'
      }

      // Act
      const res = await toAsyncResult(fn)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).toBeInstanceOf(Error)
        expect(res.error.message).toBe('Async string error')
      }
    })

    test('returns error when async function rejects with custom object', async () => {
      // Arrange
      const fn = async () => {
        throw { code: 500, message: 'Server error' }
      }

      // Act
      const res = await toAsyncResult(fn)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).toBeInstanceOf(Error)
        expect(res.error.message).toBe('[object Object]')
      }
    })

    test('handles Promise rejection with null', async () => {
      // Arrange
      const fn = async () => {
        throw null
      }

      // Act
      const res = await toAsyncResult(fn)

      // Assert
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).toBeInstanceOf(Error)
        expect(res.error.message).toBe('null')
      }
    })
  })
})
