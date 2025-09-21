import { describe, expect, test } from 'bun:test'
import { FakeHandler } from '../../../../../src/fake/fake-handler'
import { counterQuerySource } from './counter-query'
import type { CounterQuery } from './types'

describe('[counter-app] counter query', () => {
  test('listCounters should return list of counters', async () => {
    // Arrange
    const handler = new FakeHandler({
      resolvers: [counterQuerySource]
    })

    handler.setReadDatabase({
      counter: {
        '1': { type: 'counter', id: '1', count: 5 },
        '2': { type: 'counter', id: '2', count: 10 }
      }
    })

    const query: CounterQuery = {
      type: 'listCounters',
      sourceType: 'counter',
      payload: {
        range: {
          limit: 10,
          offset: 0
        }
      }
    }

    // Act
    const res = await handler.query(query)

    // Assert
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.value.type).toBe('listCounters')
      expect(res.value.data.items).toHaveLength(2)
      expect(res.value.data.total).toBe(2)
      expect(res.value.data.items[0]).toEqual({
        type: 'counter',
        id: '1',
        count: 5
      })
    }
  })

  test('getCounter should return specific counter', async () => {
    // Arrange
    const handler = new FakeHandler({
      resolvers: [counterQuerySource]
    })

    handler.setReadDatabase({
      counter: {
        '1': { type: 'counter', id: '1', count: 5 }
      }
    })

    const query: CounterQuery = {
      type: 'getCounter',
      sourceType: 'counter',
      payload: {
        id: '1'
      }
    }

    // Act
    const res = await handler.query(query)

    // Assert
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.value.type).toBe('getCounter')
      expect(res.value.data.item).toEqual({
        type: 'counter',
        id: '1',
        count: 5
      })
    }
  })

  test('getCounter should fail when counter not found', async () => {
    // Arrange
    const handler = new FakeHandler({
      resolvers: [counterQuerySource]
    })

    const query: CounterQuery = {
      type: 'getCounter',
      sourceType: 'counter',
      payload: {
        id: 'nonexistent'
      }
    }

    // Act
    const res = await handler.query(query)

    // Assert
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.message).toContain('Counter with id nonexistent not found')
    }
  })
})
