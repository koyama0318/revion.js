import type { Query, QueryResult, QueryResultData, ReadModel } from '../types/core'
import type { QueryHandler, QueryHandlerDeps } from '../types/framework'
import type { AnyQuerySource, QuerySource } from '../types/query/query-source'
import { ok } from '../utils/result'
import { createResolveReadModelFnFactory } from './fn/resolve-read-model'

type QueryHandlerFactory<D extends QueryHandlerDeps = QueryHandlerDeps> = (deps: D) => QueryHandler

function createQueryHandlerFactory<
  Q extends Query,
  QR extends QueryResultData,
  RM extends ReadModel,
  D extends QueryHandlerDeps
>(source: QuerySource<Q, QR, RM>): QueryHandlerFactory<D> {
  return (deps: D) => {
    const resolveFn = createResolveReadModelFnFactory<Q, QR, RM>(source.queryResolver)(
      deps.readModelStore
    )

    // Handles aggregate creation or update based on the incoming query
    return async (query: Query): QueryResult => {
      const resolved = await resolveFn(query as Q)
      if (!resolved.ok) return resolved

      return ok({
        type: query.type,
        data: resolved.value as QR
      })
    }
  }
}

export function createQueryHandlers(
  deps: QueryHandlerDeps,
  querySources: AnyQuerySource[]
): Record<string, QueryHandler> {
  const handlers: Record<string, QueryHandler> = {}

  for (const source of querySources) {
    handlers[source.type] = createQueryHandlerFactory(source)(deps)
  }

  return handlers
}
