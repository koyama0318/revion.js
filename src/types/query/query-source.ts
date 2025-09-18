import type { Query, QueryResultData } from '../core'
import type { ResolverFn } from './resolver-fn'

export type QuerySource<Q extends Query, QR extends QueryResultData, D> = {
  type: Q['type']
  queryResolver: ResolverFn<Q, QR, D>
}

// biome-ignore lint: To enable a generic Aggregate type for utility and type inference purposes.
export type AnyQuerySource = QuerySource<any, any, any>
