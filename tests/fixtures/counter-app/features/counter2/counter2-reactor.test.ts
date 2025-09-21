import { describe, expect, test } from 'bun:test'
import { counterReactor } from './counter2-reactor'
import type { CounterId } from './types'

describe('[counter-app] counter2 reactor', () => {
  const counterId: CounterId = { type: 'counter', value: '00000000-0000-0000-0000-000000000001' }

  test('created event should create counter read model', () => {
    // Arrange
    const event = {
      type: 'created' as const,
      id: counterId,
      payload: { count: 10 }
    }

    const timestamp = new Date()
    const projectionParams = {
      ctx: { timestamp },
      event: event,
      readModel: { type: 'counter', id: counterId.value, count: 0 }
    }

    // Act
    const result = counterReactor.projection(projectionParams)

    // Assert
    expect(result).toBeDefined()
    expect(result.type).toBe('counter')
    expect(result.id).toBe(counterId.value)
    expect(result.count).toBe(10)
  })

  test('incremented event should update counter read model', () => {
    // Arrange
    const event = {
      type: 'incremented' as const,
      id: counterId
    }

    const timestamp = new Date()
    const readModel = { type: 'counter', id: counterId.value, count: 10 }
    const projectionParams = {
      ctx: { timestamp },
      event: event,
      readModel: readModel
    }

    // Act
    const result = counterReactor.projection(projectionParams)

    // Assert
    expect(result).toBeDefined()
    expect(result.count).toBe(11)
  })

  test('decremented event should update counter read model', () => {
    // Arrange
    const event = {
      type: 'decremented' as const,
      id: counterId
    }

    const timestamp = new Date()
    const readModel = { type: 'counter', id: counterId.value, count: 10 }
    const projectionParams = {
      ctx: { timestamp },
      event: event,
      readModel: readModel
    }

    // Act
    const result = counterReactor.projection(projectionParams)

    // Assert
    expect(result).toBeDefined()
    expect(result.count).toBe(9)
  })
})
