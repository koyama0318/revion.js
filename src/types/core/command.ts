import type { AppError } from '../utils/app-error'
import type { AsyncResult } from '../utils/result'
import type { AggregateId } from './aggregate-id'

export type Command<T = unknown> = {
  readonly type: string
  readonly id: AggregateId
  readonly payload?: T
}

/**
 * Represents an empty command type.
 *
 * This type is used when there is no specific type to perform.
 * Typically, it serves as a dummy command when no command is required.
 */
export type DummyCommand = {
  readonly type: ''
  readonly id: AggregateId
  readonly payload?: undefined
}

export type CommandResultPayload = {
  id: AggregateId
}

export type CommandResult = AsyncResult<CommandResultPayload, AppError>
