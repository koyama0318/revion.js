import type { Query, QueryResultData } from '../core'

export type ResolverContext = {
  readonly timestamp: Date
}

export type ResolverParams<Q extends Query, D> = {
  ctx: ResolverContext
  query: Q
  deps: D
}

export type ResolverFn<Q extends Query, QR extends QueryResultData, D> = (
  params: ResolverParams<Q, D>
) => Promise<QR>
