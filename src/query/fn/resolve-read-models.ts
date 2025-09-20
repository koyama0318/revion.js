import type { Query, QueryResultData } from '../../types/core'
import type { ResolverContext, ResolverFn } from '../../types/query/resolver-fn'
import type { AppError, AsyncResult } from '../../types/utils'
import { err, ok, toAsyncResult } from '../../utils/result'

type ResolveReadModelFn<Q extends Query, QR extends QueryResultData, _D> = (
  query: Q
) => AsyncResult<QR, AppError>

export function createResolveReadModelFnFactory<
  Q extends Query,
  QR extends QueryResultData,
  D extends Record<string, unknown> = Record<string, unknown>
>(resolver: ResolverFn<Q, QR, D>): (deps: D) => ResolveReadModelFn<Q, QR, D> {
  return (deps: D) => {
    return async (query: Q) => {
      const resolverCtx: ResolverContext = {
        timestamp: new Date()
      }
      const resolverRes = await toAsyncResult(() => resolver({ ctx: resolverCtx, query, deps }))
      if (!resolverRes.ok) {
        return err({
          code: 'RESOLVER_EXECUTION_FAILED',
          message: `Resolver execution failed: ${resolverRes.error.message}`,
          cause: resolverRes.error
        })
      }

      const readModel: QR = resolverRes.value

      return ok(readModel as QR)
    }
  }
}
