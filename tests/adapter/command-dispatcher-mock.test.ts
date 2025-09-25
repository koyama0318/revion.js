import { describe, expect, test } from 'bun:test'
import { CommandDispatcherMock } from '../../src/adapter/command-dispatcher-mock'
import { zeroId } from '../../src/command/helpers/aggregate-id'
import type { Command } from '../../src/types/core'

describe('[adapter] command dispatcher mock', () => {
  describe('CommandDispatcherMock', () => {
    describe('dispatch', () => {
      test('should store a dispatched command', async () => {
        const dispatcher = new CommandDispatcherMock()
        const sampleCommand: Command = {
          type: 'TEST_COMMAND',
          id: zeroId('test'),
          payload: { foo: 'bar' }
        }

        await dispatcher.dispatch(sampleCommand)

        const commands = dispatcher.getCommands()
        expect(commands).toHaveLength(1)
        expect(commands[0]).toEqual(sampleCommand)
      })

      test('should accumulate multiple dispatched commands', async () => {
        const dispatcher = new CommandDispatcherMock()
        const sampleCommand: Command = {
          type: 'TEST_COMMAND',
          id: zeroId('test'),
          payload: { foo: 'bar' }
        }
        const anotherCommand: Command = {
          type: 'ANOTHER_COMMAND',
          id: zeroId('test'),
          payload: { baz: 123 }
        }

        await dispatcher.dispatch(sampleCommand)
        await dispatcher.dispatch(anotherCommand)

        const commands = dispatcher.getCommands()
        expect(commands).toHaveLength(2)
        expect(commands).toEqual([sampleCommand, anotherCommand])
      })
    })

    describe('getCommands', () => {
      test('should return empty array when no commands dispatched', () => {
        const dispatcher = new CommandDispatcherMock()

        const commands = dispatcher.getCommands()

        expect(commands).toEqual([])
      })

      test('should return a copy of internal commands', async () => {
        const dispatcher = new CommandDispatcherMock()
        const sampleCommand: Command = {
          type: 'TEST_COMMAND',
          id: zeroId('test'),
          payload: { foo: 'bar' }
        }

        await dispatcher.dispatch(sampleCommand)
        const commands = dispatcher.getCommands()
        commands.push({ type: 'SHOULD_NOT_AFFECT', id: zeroId('test'), payload: {} })

        expect(dispatcher.getCommands()).toHaveLength(1)
      })
    })

    describe('reset', () => {
      test('should clear all stored commands', async () => {
        const dispatcher = new CommandDispatcherMock()
        const sampleCommand: Command = {
          type: 'TEST_COMMAND',
          id: zeroId('test'),
          payload: { foo: 'bar' }
        }

        await dispatcher.dispatch(sampleCommand)
        expect(dispatcher.getCommands()).toHaveLength(1)
        dispatcher.reset()

        expect(dispatcher.getCommands()).toHaveLength(0)
      })
    })
  })
})
