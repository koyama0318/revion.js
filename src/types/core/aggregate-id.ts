export type AggregateId<T extends string = string> = {
  readonly type: T
  readonly value: string
}
