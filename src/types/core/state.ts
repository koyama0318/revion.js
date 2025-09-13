import type { AggregateId } from './aggregate-id'

export type State = {
  readonly type: string
  readonly id: AggregateId
}

export type ExtendedState<T extends State> = Readonly<T> & {
  readonly version: number
}

export type Snapshot<S extends State> = ExtendedState<S> & {
  readonly timestamp: Date
}
