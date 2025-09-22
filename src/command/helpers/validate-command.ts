import type { Command } from '../../types/core'
import type { AppError, Result } from '../../types/utils'
import { err, ok } from '../../utils/result'
import { validateAggregateId } from './aggregate-id'

export function validateCommand(command: Command): Result<void, AppError> {
  if (!command || typeof command !== 'object' || Array.isArray(command)) {
    return err({
      code: 'INVALID_COMMAND',
      message: 'Command is not valid'
    })
  }

  const isTypeNotEmpty = command.type && command.type !== ''
  if (!isTypeNotEmpty) {
    return err({
      code: 'INVALID_COMMAND_TYPE',
      message: 'command type is not valid'
    })
  }

  const isValidId = validateAggregateId(command.id)
  if (!isValidId.ok) return isValidId

  const isPayloadUndefined = typeof command.payload === 'undefined'
  const isPayloadObject =
    typeof command.payload === 'object' &&
    command.payload !== null &&
    !Array.isArray(command.payload) &&
    Object.keys(command.payload).length > 0
  if (!isPayloadUndefined && !isPayloadObject) {
    return err({
      code: 'INVALID_COMMAND_PAYLOAD',
      message: 'Command payload is not valid'
    })
  }

  return ok(undefined)
}
