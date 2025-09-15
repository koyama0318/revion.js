import type { Command } from '../core'
import type { CommandHandlerDeps } from '../framework'
import type { AppError, AsyncResult } from '../utils'

export type PrepareDepsFn<C extends Command> = (
  command: C,
  deps: CommandHandlerDeps
) => AsyncResult<Record<string, unknown> | null, AppError>
