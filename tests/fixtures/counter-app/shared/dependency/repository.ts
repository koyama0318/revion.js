import type { CommandHandlerDeps } from '../../../../../src/types/framework'
import type { CounterState } from '../../features/counter2/types'

export interface Repository extends CommandHandlerDeps {
  counterRepository: CounterRepository
}

export interface CounterRepository {
  getCounter(id: string): Promise<CounterState | null>
}
