import type { AggregateId, DomainEvent } from '../../types/core'
import type { AppError, Result } from '../../types/utils'
import { err, ok } from '../../utils/result'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function validateEvent(event: DomainEvent): Result<void, AppError> {
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    return err({
      code: 'INVALID_EVENT',
      message: 'Event is not valid'
    })
  }

  const isTypeNotEmpty = event.type && event.type !== ''
  if (!isTypeNotEmpty) {
    return err({
      code: 'INVALID_EVENT_TYPE',
      message: 'event type is not valid'
    })
  }

  const isValidId = validateAggregateId(event.id)
  if (!isValidId.ok) return isValidId

  const isPayloadUndefined = typeof event.payload === 'undefined'
  const isPayloadObject =
    typeof event.payload === 'object' &&
    event.payload !== null &&
    !Array.isArray(event.payload) &&
    Object.keys(event.payload).length > 0
  if (!isPayloadUndefined && !isPayloadObject) {
    return err({
      code: 'INVALID_EVENT_PAYLOAD',
      message: 'Event payload is not valid'
    })
  }

  return ok(undefined)
}

function validateAggregateId(id: AggregateId): Result<void, AppError> {
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
