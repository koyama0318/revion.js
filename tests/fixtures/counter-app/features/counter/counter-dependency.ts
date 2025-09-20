import type { ReadModelStore } from '../../../../../src/types/adapter'
import type { CounterReadModel } from '../../shared/readmodel'
import type { CounterId, CounterState } from './types'

export type CounterCommandDeps = {
  counterRepository: {
    getCounter(id: CounterId): Promise<CounterState>
    saveCounter(counter: CounterState): Promise<void>
  }
}

export type CounterQueryDeps = {
  readModelStore: ReadModelStore<CounterReadModel>
}
