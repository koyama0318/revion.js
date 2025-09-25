import type { Query, QueryResult } from '../types/core'
import type { QueryHandler, QueryHandlerDeps, QueryHandlerMiddleware } from '../types/framework'
import type { AnyQuerySource } from '../types/query/query-source'
import { err } from '../utils/result'
import { validateQuery } from './helpers/validate-query'
import { createQueryHandlers } from './query-handler'

export function createQueryBus({
  deps,
  querySources = [],
  middleware = []
}: {
  deps: QueryHandlerDeps
  querySources?: AnyQuerySource[]
  middleware?: QueryHandlerMiddleware[]
}): QueryHandler {
  const handlers = createQueryHandlers(deps, querySources)

  const applyMiddleware = (handler: QueryHandler): QueryHandler => {
    return middleware.reduceRight<QueryHandler>((next, m) => {
      return (query: Query) => m(query, next)
    }, handler)
  }

  return async (query: Query): QueryResult => {
    const validated = validateQuery(query)
    if (!validated.ok) return validated

    const handler = handlers[query.sourceType]
    if (!handler) {
      return err({
        code: 'QUERY_RESOLVER_NOT_FOUND',
        message: `Handler for type ${query.sourceType} not found`
      })
    }

    return applyMiddleware(handler)(query)
  }
}
