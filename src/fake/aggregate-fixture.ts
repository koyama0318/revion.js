import { createReplayEventFnFactory } from '../command/fn/replay-event'
import { zeroId } from '../command/helpers/aggregate-id'
import type { ReadModelMap } from '../types/adapter/read-model-store'
import type { Aggregate } from '../types/command'
import type {
  AggregateId,
  Command,
  DomainEvent,
  ExtendedDomainEvent,
  ExtendedState,
  State
} from '../types/core'
import type { EventReactor } from '../types/event'
import type { CommandHandlerDeps } from '../types/framework'
import type { AppError } from '../types/utils/app-error'
import type { AsyncResult } from '../types/utils/result'
import { ok } from '../utils/result'
import { FakeHandler } from './fake-handler'

type AggregateTestContext<S extends State, E extends DomainEvent> = {
  id: AggregateId
  state: {
    before: ExtendedState<S>
    after: ExtendedState<S>
  }
  events: {
    before: ExtendedDomainEvent<E>[]
    after: ExtendedDomainEvent<E>[]
    latest: ExtendedDomainEvent<E> | null
    all: ExtendedDomainEvent<E>[]
  }
  version: {
    diff: number
    latest: number
  }
  error: AppError | null
}

class AggregateTestFixture<
  S extends State,
  C extends Command,
  E extends DomainEvent,
  D extends CommandHandlerDeps,
  VM extends ReadModelMap = ReadModelMap
> {
  private readonly aggregate: Aggregate<S, C, E, D>
  private readonly handler: FakeHandler
  private context: AggregateTestContext<S, E>

  constructor(aggregate: Aggregate<S, C, E, D>, reactor?: EventReactor<C, E, VM[keyof VM]>) {
    this.aggregate = aggregate
    this.handler = new FakeHandler({
      aggregates: [aggregate],
      reactors: reactor ? [reactor] : [],
      config: {
        enableLogging: false,
        skipReadModelProjectionErrors: true
      }
    })

    const id = zeroId(aggregate.type)
    this.context = {
      id,
      state: {
        before: { id: id as AggregateId, version: 0 } as ExtendedState<S>,
        after: { id: id as AggregateId, version: 0 } as ExtendedState<S>
      },
      events: { before: [], after: [], latest: null, all: [] },
      version: { diff: 0, latest: 0 },
      error: null
    }
  }

  given(event: E) {
    const aggregateId = this.context.id as AggregateId<S['id']['type']>
    this.context.id = aggregateId

    const e = {
      ...event,
      aggregateId: this.context.id,
      version: this.context.version.latest + 1,
      timestamp: new Date()
    }

    this.context.events.before.push(e)
    this.context.events.all.push(e)
    this.handler.setEventStore(this.context.events.all)

    this.context.version.latest = e.version

    return this
  }

  givenMany(events: E[]) {
    for (const event of events) {
      this.given(event)
    }
    return this
  }

  async when(command: C) {
    // If the current state's ID does not match the command's ID (i.e., the state is not initialized), create the first state
    if (this.context.state.before.id !== command.id) {
      const firstState = await this.createFirstState(command.id as AggregateId<S['id']['type']>)
      if (!firstState.ok) {
        this.context.error = firstState.error
        return this
      }
      this.context.state.before = firstState.value
    }

    // Execute the command and handle the result
    const res = await this.handler.command(command)
    if (!res.ok) {
      this.context.error = res.error
      return this
    }

    // Update the context with the issued command's aggregate ID
    this.context.id = res.value.id
    this.context.state.before = { ...this.context.state.before, id: res.value.id }

    // Update event and version information after command execution
    this.context.events.all = this.handler.eventStore.events as ExtendedDomainEvent<E>[]
    this.context.events.after = this.context.events.all.slice(this.context.events.before.length)
    this.context.version.latest = this.context.events.all.length
    this.context.version.diff = this.context.version.latest - this.context.events.before.length

    // Replay events to obtain the latest state after command execution
    const afterState = await this.replayEvents(this.context.id as AggregateId<S['id']['type']>)
    if (!afterState.ok) {
      this.context.error = afterState.error
      return this
    }
    this.context.state.after = afterState.value

    return this
  }

  async whenMany(commands: C[]) {
    for (const command of commands) {
      await this.when(command)
    }

    return this
  }

  assert(assert: (context: AggregateTestContext<S, E>) => void) {
    assert(this.context as AggregateTestContext<S, E>)
    return this
  }

  private async createFirstState(
    id: AggregateId<S['id']['type']>
  ): AsyncResult<ExtendedState<S>, AppError> {
    const state = await this.replayEvents(id)
    if (!state.ok && state.error.code !== 'NO_EVENTS_STORED') return state

    if (!state.ok) {
      // create first state for create command
      const provisionalState: ExtendedState<S> = {
        ...({ id: id as AggregateId } as S),
        version: 0
      }
      return ok(provisionalState)
    }

    // replay state for update command
    return await this.replayEvents(id)
  }

  private async replayEvents(
    id: AggregateId<S['id']['type']>
  ): AsyncResult<ExtendedState<S>, AppError> {
    const replayFn = createReplayEventFnFactory<S, E>(this.aggregate.reducer)(
      this.handler.eventStore
    )

    return await replayFn(id)
  }
}

/**
 * Creates a test fixture for aggregate testing with given/when/then pattern.
 *
 * This fixture provides a fluent API for testing aggregates in isolation.
 * It supports setting up initial state through events, executing commands,
 * and asserting on the resulting state and events.
 *
 * @template T - The aggregate type identifier
 * @template S - The aggregate state type
 * @template C - The command types
 * @template E - The domain event types
 * @template VM - ThereadModel map types
 *
 * @param aggregate - The aggregate instance to test
 * @param reactor - Optional event reactor to test alongside the aggregate
 *
 * @returns A test fixture instance with fluent API for testing
 *
 * @example
 * ```ts
 * const todoId = { type: 'todo', id: '00000000-0000-0000-0000-000000000001' }
 *
 * await aggregateFixture(todoAggregate)
 *   .given({ type: 'todoCreated', title: 'Buy milk' })
 *   .when({ id: todoId, type: 'complete' })
 *   .then(fixture => {
 *     fixture.assert(ctx => {
 *       expect(ctx.error).toBeNull()
 *       expect(ctx.version.diff).toBe(1)
 *       expect(ctx.version.latest).toBe(1)
 *       expect(ctx.state.before.title).toBe('Buy milk')
 *       expect(ctx.state.after.status).toBe('completed')
 *     }
 *   })
 * ```
 */
export function aggregateFixture<
  S extends State,
  C extends Command,
  E extends DomainEvent,
  _D,
  VM extends ReadModelMap = ReadModelMap
>(aggregate: Aggregate<S, C, E, any>, reactor?: EventReactor<C, E, VM[keyof VM]>) {
  return new AggregateTestFixture(aggregate, reactor)
}
