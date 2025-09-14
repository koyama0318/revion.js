import type { Command } from '../core'

export interface CommandDispatcher {
  dispatch(command: Command): Promise<void>
}
