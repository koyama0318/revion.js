import type { Query } from '../../types/core'
import type { AppError, Result } from '../../types/utils'
import { err, ok } from '../../utils/result'

export function validateQuery(query: Query): Result<void, AppError> {
  if (!query || typeof query !== 'object' || Array.isArray(query)) {
    return err({
      code: 'INVALID_QUERY',
      message: 'Query is not valid'
    })
  }

  const isTypeNotEmpty = query.type && query.type !== ''
  if (!isTypeNotEmpty) {
    return err({
      code: 'INVALID_QUERY_TYPE',
      message: 'query type is not valid'
    })
  }

  const isSourceTypeNotEmpty = query.sourceType && query.sourceType !== ''
  if (!isSourceTypeNotEmpty) {
    return err({
      code: 'INVALID_QUERY_SOURCE_TYPE',
      message: 'query source type is not valid'
    })
  }

  return ok(undefined)
}
