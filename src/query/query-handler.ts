import type { Query, QueryResult, QueryResultData } from '../types/core'
import type { QueryHandler, QueryHandlerDeps } from '../types/framework'
import type { AnyQuerySource, QuerySource } from '../types/query/query-source'
import { ok } from '../utils/result'
import { createResolveReadModelFnFactory } from './fn/resolve-read-models'

type QueryHandlerFactory<D extends QueryHandlerDeps> = (deps: D) => QueryHandler

function createQueryHandlerFactory<
  Q extends Query,
  QR extends QueryResultData,
  D extends QueryHandlerDeps & Record<string, unknown>
>(source: QuerySource<Q, QR, D>): QueryHandlerFactory<D> {
  return (deps: D) => {
    const resolve = createResolveReadModelFnFactory(source.queryResolver)(deps)

    // Handles aggregate creation or update based on the incoming query
    return async (query: Query): QueryResult => {
      const resolved = await resolve(query as Q)
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
