import type { Query, QueryResultData } from '../core'
import type { ResolverFn } from './resolver-fn'

export type QueryResolver<Q extends Query, QR extends QueryResultData, _D> = {
  [K in Q['type']]: ResolverFn<Extract<Q, { type: K }>, Extract<QR, { type: K }>>
}
