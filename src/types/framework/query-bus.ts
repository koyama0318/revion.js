import type { ReadModelStore } from '../adapter/read-model-store'
import type { Query, QueryResult } from '../core/query'

export interface QueryHandlerDeps {
  readModelStore: ReadModelStore
}

export type QueryHandler = (query: Query) => QueryResult

export type QueryHandlerMiddleware = (query: Query, next: QueryHandler) => QueryResult

export type QueryBus = QueryHandler
