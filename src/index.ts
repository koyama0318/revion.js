export { EventStoreInMemory } from './adapter/event-store-in-memory'
export { createAggregate } from './command/aggregate-builder'
export { id, zeroId } from './command/helpers/aggregate-id'
export { createEventReactor } from './event/event-reactor-builder'
export { aggregateFixture } from './fake/aggregate-fixture'
export { reactorFixture } from './fake/event-reactor-fixture'
export { FakeHandler } from './fake/fake-handler'
export { createQuerySource } from './query/query-source-builder'
export type { QueryOption } from './types/adapter/read-model-store'
export type { Aggregate } from './types/command/aggregate'
export type { EventDecider } from './types/command/event-decider'
export type {
  EventDeciderFn,
  EventDeciderMap,
  EventDeciderParams
} from './types/command/event-decider-fn'
export type { Reducer } from './types/command/reducer'
export type { ReducerMap } from './types/command/reducer-fn'
export type { AggregateId } from './types/core'
export type { Policy, Projection, ProjectionMap } from './types/event'
export type { QueryResolver } from './types/query'
export { err, ok, toAsyncResult, toResult } from './utils/result'
