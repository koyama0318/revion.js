import { beforeEach, describe, expect, test } from 'bun:test'
import { CommandDispatcherMock } from '../../src/adapter/command-dispatcher-mock'
import { zeroId } from '../../src/command/helpers/aggregate-id'
import type { Command } from '../../src/types/core'

describe('[adapter] command dispatcher mock', () => {
  describe('CommandDispatcherMock', () => {
    let dispatcher: CommandDispatcherMock
    let sampleCommand: Command
    let anotherCommand: Command

    beforeEach(() => {
      dispatcher = new CommandDispatcherMock()
      sampleCommand = { type: 'TEST_COMMAND', id: zeroId('test'), payload: { foo: 'bar' } }
      anotherCommand = { type: 'ANOTHER_COMMAND', id: zeroId('test'), payload: { baz: 123 } }
    })

    describe('dispatch', () => {
      test('should store a dispatched command', async () => {
        await dispatcher.dispatch(sampleCommand)
        const commands = dispatcher.getCommands()
        expect(commands).toHaveLength(1)
        expect(commands[0]).toEqual(sampleCommand)
      })

      test('should accumulate multiple dispatched commands', async () => {
        await dispatcher.dispatch(sampleCommand)
        await dispatcher.dispatch(anotherCommand)
        const commands = dispatcher.getCommands()
        expect(commands).toHaveLength(2)
        expect(commands).toEqual([sampleCommand, anotherCommand])
      })
    })

    describe('getCommands', () => {
      test('should return a copy of internal commands', async () => {
        await dispatcher.dispatch(sampleCommand)
        const commands = dispatcher.getCommands()
        commands.push({ type: 'SHOULD_NOT_AFFECT', id: zeroId('test'), payload: {} })
        expect(dispatcher.getCommands()).toHaveLength(1)
      })

      test('should return empty array when no commands dispatched', () => {
        expect(dispatcher.getCommands()).toEqual([])
      })
    })

    describe('reset', () => {
      test('should clear all stored commands', async () => {
        await dispatcher.dispatch(sampleCommand)
        expect(dispatcher.getCommands()).toHaveLength(1)
        dispatcher.reset()
        expect(dispatcher.getCommands()).toHaveLength(0)
      })
    })
  })
})
