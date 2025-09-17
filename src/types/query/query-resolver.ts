import type { Query, QueryResultData } from '../core'
import type { ResolverFn } from './resolver-fn'

export type QueryResolver<Q extends Query, QR extends QueryResultData, D> = {
  type: Q['type']
  resolver: ResolverFn<Q, QR, D>
}

// biome-ignore lint: To enable a generic QueryResolver type for utility and type inference purposes.
export type AnyQueryResolver = QueryResolver<any, any, any>
