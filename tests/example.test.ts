import { expect, test } from 'bun:test'
import type { Command } from '../src/index'

test('Command type should have required structure', () => {
  const command: Command = { type: 'test-command' }
  expect(command.type).toBe('test-command')
})
