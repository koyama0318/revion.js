import type { Query, QueryResultData, ReadModel } from '../core'
import type { ResolverFn } from './resolver-fn'

export type QueryResolver<Q extends Query, QR extends QueryResultData, RM extends ReadModel> = {
  [K in Q['type']]: ResolverFn<Extract<Q, { type: K }>, Extract<QR, { type: K }>, RM>
}
