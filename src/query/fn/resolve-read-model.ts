import type { ReadModelStore } from '../../types/adapter'
import type { Query, QueryResultData, ReadModel } from '../../types/core'
import type { ResolverContext, ResolverFn, ResolverParams } from '../../types/query/resolver-fn'
import type { AppError, AsyncResult } from '../../types/utils'
import { err, ok, toAsyncResult } from '../../utils/result'

type ResolveReadModelFn<Q extends Query, QR extends QueryResultData> = (
  query: Q
) => AsyncResult<QR, AppError>

export function createResolveReadModelFnFactory<
  Q extends Query,
  QR extends QueryResultData,
  RM extends ReadModel
>(resolver: ResolverFn<Q, QR, RM>): (store: ReadModelStore) => ResolveReadModelFn<Q, QR> {
  return (store: ReadModelStore) => {
    return async (query: Q) => {
      const resolverCtx: ResolverContext = {
        timestamp: new Date()
      }

      const params: ResolverParams<Q, RM> = {
        ctx: resolverCtx,
        query,
        store: store as unknown as ReadModelStore<RM>
      }
      const resolverRes = await toAsyncResult(() => resolver(params))
      if (!resolverRes.ok) {
        return err({
          code: 'RESOLVER_EXECUTION_FAILED',
          message: `Resolver execution failed: ${resolverRes.error.message}`,
          cause: resolverRes.error
        })
      }

      return ok(resolverRes.value as QR)
    }
  }
}
