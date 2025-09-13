import { v4 } from 'uuid'
import type { AggregateId, AppError, Result } from '../../types'
import { err, ok } from '../../utils/result'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function id<T extends string>(type: T, value: string): AggregateId<T> {
  return { type, value }
}

export function zeroId<T extends string>(type: T): AggregateId<T> {
  const uuid = v4()
  return { type, value: uuid } as AggregateId<T>
}

export function validateAggregateId(id: AggregateId): Result<void, AppError> {
  if (!id || typeof id !== 'object') {
    return err({
      code: 'INVALID_AGGREGATE_ID',
      message: 'Aggregate ID is not valid'
    })
  }

  const isNotEmpty = id.type !== '' && id.value !== ''
  if (!isNotEmpty) {
    return err({
      code: 'INVALID_AGGREGATE_ID',
      message: 'Aggregate ID is not valid'
    })
  }

  const isUuid = UUID_REGEX.test(id.value)
  if (!isUuid) {
    return err({
      code: 'INVALID_AGGREGATE_ID',
      message: 'Aggregate ID is not valid uuid'
    })
  }

  return ok(undefined)
}

export function isEqualId(id1: AggregateId, id2: AggregateId): boolean {
  return id1.type === id2.type && id1.value === id2.value
}
