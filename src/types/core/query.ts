import type { AppError } from '../utils/app-error'
import type { AsyncResult } from '../utils/result'

export type Query = {
  readonly type: string
  readonly sourceType: string
}

export type QueryResultData = Record<string, unknown>

export type QueryResultPayload<T extends QueryResultData = QueryResultData> = {
  type: string
  data: T
}

export type QueryResult = AsyncResult<QueryResultPayload, AppError>
