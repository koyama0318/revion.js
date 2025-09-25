import type { ReadModelStore } from '../adapter'
import type { Query, QueryResultData } from '../core'

export type ResolverContext = {
  readonly timestamp: Date
}

export type ResolverParams<Q extends Query> = {
  ctx: ResolverContext
  query: Q
  store: ReadModelStore
}

export type ResolverFn<Q extends Query, QR extends QueryResultData> = (
  params: ResolverParams<Q>
) => Promise<QR>
