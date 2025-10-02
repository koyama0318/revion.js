import type { ReadModelStore } from '../adapter'
import type { Query, QueryResultData, ReadModel } from '../core'

export type ResolverContext = {
  readonly timestamp: Date
}

export type ResolverParams<Q extends Query, RM extends ReadModel> = {
  ctx: ResolverContext
  query: Q
  store: ReadModelStore<RM>
}

export type ResolverFn<Q extends Query, QR extends QueryResultData, RM extends ReadModel> = (
  params: ResolverParams<Q, RM>
) => Promise<QR>
