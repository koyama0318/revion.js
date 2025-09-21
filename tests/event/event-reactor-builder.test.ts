import { describe, expect, test } from 'bun:test'
import { zeroId } from '../../src/command/helpers/aggregate-id'
import { createEventReactor } from '../../src/event/event-reactor-builder'
import type { AggregateId, ReadModel } from '../../src/types/core'
import type { Policy, PolicyMap, Projection, ProjectionMap } from '../../src/types/event'

type TestCommand =
  | { type: 'notify'; id: AggregateId<'test'>; payload: { message: string } }
  | { type: 'alert'; id: AggregateId<'test'>; payload: { level: string } }

type TestEvent =
  | { type: 'created'; id: AggregateId<'test'>; payload: { name: string } }
  | { type: 'updated'; id: AggregateId<'test'>; payload: { name: string } }
  | { type: 'deleted'; id: AggregateId<'test'> }

type TestReadModel = ReadModel & {
  type: 'test'
  id: string
  name: string
  status: 'active' | 'inactive'
  createdAt: Date
  updatedAt: Date
}

const testPolicy: Policy<TestEvent, TestCommand> = {
  created: ({ event }) => ({
    type: 'notify',
    id: event.id,
    payload: { message: `Item ${event.payload.name} was created` }
  }),
  updated: ({ event }) => ({
    type: 'alert',
    id: event.id,
    payload: { level: 'info' }
  }),
  deleted: () => null
}

const testProjection = {
  created: {
    test: ({ ctx, event }: any) => {
      const typedEvent = event as Extract<TestEvent, { type: 'created' }>
      return {
        type: 'test' as const,
        id: typedEvent.id.value,
        name: typedEvent.payload.name,
        status: 'active' as const,
        createdAt: ctx.timestamp,
        updatedAt: ctx.timestamp
      }
    }
  },
  updated: {
    test: ({ ctx, readModel, event }: any) => {
      const typedEvent = event as Extract<TestEvent, { type: 'updated' }>
      readModel.name = typedEvent.payload.name
      readModel.updatedAt = ctx.timestamp
      return readModel
    }
  },
  deleted: {
    test: () => {
      // For delete operations, we don't return areadModel
      return undefined
    }
  }
} satisfies Projection<TestEvent, TestReadModel, ProjectionMap<TestEvent, TestReadModel>>

describe('[event] event reactor builder', () => {
  describe('createEventReactor', () => {
    test('creates event reactor builder instance', () => {
      // Arrange & Act
      const builder = createEventReactor<TestEvent, TestCommand, TestReadModel>()

      // Assert
      expect(builder).toBeDefined()
      expect(typeof builder.type).toBe('function')
    })
  })

  describe('event reactor building and functionality', () => {
    test('builds functioning event reactor with basic configuration', () => {
      // Arrange & Act
      const reactor = createEventReactor<TestEvent, TestCommand, TestReadModel>()
        .type('test')
        .policy(testPolicy)
        .projection(testProjection)
        .build()

      // Assert
      expect(reactor).toBeDefined()
      expect(reactor.type).toBe('test')
      expect(typeof reactor.policy).toBe('function')
      expect(typeof reactor.projection).toBe('function')
    })

    test('builds functioning event reactor with policy and projection maps', () => {
      // Arrange
      const policyMap: PolicyMap<TestEvent, TestCommand> = {
        created: ['notify'],
        updated: ['alert'],
        deleted: []
      }

      const projectionMap: ProjectionMap<TestEvent, TestReadModel> = {
        created: [{ readModel: 'test' }],
        updated: [{ readModel: 'test' }],
        deleted: [{ readModel: 'test' }]
      }

      // Act
      const reactor = createEventReactor<TestEvent, TestCommand, TestReadModel>()
        .type('test')
        .policyWithMap(testPolicy, policyMap)
        .projectionWithMap(testProjection, projectionMap)
        .build()

      // Assert
      expect(reactor.type).toBe('test')
      expect(typeof reactor.policy).toBe('function')
      expect(typeof reactor.projection).toBe('function')
    })

    test('builds functioning event reactor with policy map and projection', () => {
      // Arrange
      const policyMap: PolicyMap<TestEvent, TestCommand> = {
        created: ['notify'],
        updated: ['alert'],
        deleted: []
      }

      // Act
      const reactor = createEventReactor<TestEvent, TestCommand, TestReadModel>()
        .type('test')
        .policyWithMap(testPolicy, policyMap)
        .projection(testProjection)
        .build()

      // Assert
      expect(reactor.type).toBe('test')
      expect(typeof reactor.policy).toBe('function')
      expect(typeof reactor.projection).toBe('function')
    })

    test('builds functioning event reactor with policy and projection map', () => {
      // Arrange
      const projectionMap: ProjectionMap<TestEvent, TestReadModel> = {
        created: [{ readModel: 'test' }],
        updated: [{ readModel: 'test' }],
        deleted: [{ readModel: 'test' }]
      }

      // Act
      const reactor = createEventReactor<TestEvent, TestCommand, TestReadModel>()
        .type('test')
        .policy(testPolicy)
        .projectionWithMap(testProjection, projectionMap)
        .build()

      // Assert
      expect(reactor.type).toBe('test')
      expect(typeof reactor.policy).toBe('function')
      expect(typeof reactor.projection).toBe('function')
    })

    test('created reactor processes policy correctly', () => {
      // Arrange
      const reactor = createEventReactor<TestEvent, TestCommand, TestReadModel>()
        .type('test')
        .policy(testPolicy)
        .projection(testProjection)
        .build()

      const id = zeroId('test')
      const event: TestEvent = {
        type: 'created',
        id,
        payload: { name: 'Test Item' }
      }

      const policyParams = {
        ctx: { timestamp: new Date() },
        event: event
      }

      // Act
      const command = reactor.policy(policyParams)

      // Assert
      expect(command).toBeDefined()
      expect(command?.type).toBe('notify')
      if (command?.type === 'notify') {
        expect(command.payload.message).toBe('Item Test Item was created')
      }
    })

    test('created reactor handles events with no policy response', () => {
      // Arrange
      const reactor = createEventReactor<TestEvent, TestCommand, TestReadModel>()
        .type('test')
        .policy(testPolicy)
        .projection(testProjection)
        .build()

      const id = zeroId('test')
      const event: TestEvent = {
        type: 'deleted',
        id
      }

      const policyParams = {
        ctx: { timestamp: new Date() },
        event: event
      }

      // Act
      const command = reactor.policy(policyParams)

      // Assert
      expect(command).toBeNull()
    })

    test('created reactor has correct projection functionality', () => {
      // Arrange & Act
      const reactor = createEventReactor<TestEvent, TestCommand, TestReadModel>()
        .type('test')
        .policy(testPolicy)
        .projection(testProjection)
        .build()

      const id = zeroId('test')
      const event: TestEvent = {
        type: 'created',
        id,
        payload: { name: 'Test Item' }
      }

      const readModel: TestReadModel = {
        type: 'test',
        id: id.value,
        name: '',
        status: 'inactive',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const projectionParams = {
        ctx: { timestamp: new Date() },
        event: event,
        readModel: readModel
      }

      // Assert
      expect(reactor.projection).toBeDefined()
      expect(typeof reactor.projection).toBe('function')

      // Test that projection function works correctly
      const result = reactor.projection(projectionParams)
      expect(result).toBeDefined()
      expect(result.name).toBe('Test Item')
      expect(result.status).toBe('active')
    })
  })
})
