import type { CommandDispatcher } from '../types/adapter'
import type { Command } from '../types/core'

export class CommandDispatcherMock implements CommandDispatcher {
  constructor(private readonly commands: Command[] = []) {}

  dispatch(command: Command): Promise<void> {
    this.commands.push(command)
    return Promise.resolve()
  }

  getCommands(): Command[] {
    return [...this.commands]
  }

  reset() {
    this.commands.length = 0
  }
}
