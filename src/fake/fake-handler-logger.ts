import type { CommandDispatcherMock } from '../adapter/command-dispatcher-mock'
import type { EventStoreInMemory } from '../adapter/event-store-in-memory'
import type { ReadModelStoreInMemory } from '../adapter/read-model-store-in-memory'
import type { Command, DomainEvent, ExtendedDomainEvent } from '../types/core'

export interface IFakeHandlerLogger {
  logCommand(command: Command, phase: 'start' | 'success' | 'error'): void
  logEvents(events: ExtendedDomainEvent<DomainEvent>[]): void
  logEventHandling(
    event: ExtendedDomainEvent<DomainEvent>,
    phase: 'start' | 'success' | 'error'
  ): void
  logState(
    eventStore: EventStoreInMemory,
    readDatabase: ReadModelStoreInMemory,
    commandDispatcher: CommandDispatcherMock
  ): void
}

export class FakeHandlerLogger implements IFakeHandlerLogger {
  private readonly prefix = '[FakeHandler]'

  logCommand(command: Command, phase: 'start' | 'success' | 'error') {
    const timestamp = new Date().toISOString()
    const commandInfo = {
      type: command.type,
      id: command.id.value,
      aggregateType: command.id.type
    }

    switch (phase) {
      case 'start':
        this.log(
          `${this.prefix} ${timestamp} Command dispatched:`,
          JSON.stringify(commandInfo, null, 2)
        )
        break
      case 'success':
        this.log(
          `${this.prefix} ${timestamp} Command completed successfully:`,
          JSON.stringify(commandInfo, null, 2)
        )
        break
      case 'error':
        this.log(
          `${this.prefix} ${timestamp} Command failed:`,
          JSON.stringify(commandInfo, null, 2)
        )
        break
    }
  }

  logEvents(events: ExtendedDomainEvent<DomainEvent>[]) {
    if (events.length === 0) return

    const timestamp = new Date().toISOString()
    this.log(`${this.prefix} ${timestamp} Events generated (${events.length}):`)
    events.forEach((event, index) => {
      this.log(`  ${index + 1}. ${event.type} - ${event.id.value}`)
    })
  }

  logEventHandling(event: ExtendedDomainEvent<DomainEvent>, phase: 'start' | 'success' | 'error') {
    const timestamp = new Date().toISOString()
    const eventInfo = {
      type: event.type,
      id: event.id.value,
      aggregateType: event.id.type
    }

    switch (phase) {
      case 'start':
        this.log(
          `${this.prefix} ${timestamp} Event handling started:`,
          JSON.stringify(eventInfo, null, 2)
        )
        break
      case 'success':
        this.log(
          `${this.prefix} ${timestamp} Event handled successfully:`,
          JSON.stringify(eventInfo, null, 2)
        )
        break
      case 'error':
        this.log(
          `${this.prefix} ${timestamp} Event handling failed:`,
          JSON.stringify(eventInfo, null, 2)
        )
        break
    }
  }

  logState(
    eventStore: EventStoreInMemory,
    readDatabase: ReadModelStoreInMemory,
    commandDispatcher: CommandDispatcherMock
  ) {
    const timestamp = new Date().toISOString()
    this.log(`${this.prefix} ${timestamp} Current state:`)
    this.log('Event Store:', JSON.stringify(eventStore.events, null, 2))
    this.log('Command Queue:', JSON.stringify(commandDispatcher.getCommands(), null, 2))
    this.log('Read Database:', JSON.stringify(readDatabase.storage, null, 2))
  }

  private log(message: string, ...args: unknown[]) {
    console.log(message, ...args)
  }
}

export class NullFakeHandlerLogger implements IFakeHandlerLogger {
  logCommand(): void {}
  logEvents(): void {}
  logEventHandling(): void {}
  logState(): void {}
}
