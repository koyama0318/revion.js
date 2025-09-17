import type { ReadModel } from '../core'

export type ReadModelMap = Record<string, ReadModel>

export type GetListOptions<T extends ReadModel> = {
  filter?: FilterCondition<T>[]
  sort?: SortOption<T>
  range?: RangeOption
}

export type FilterCondition<T> = {
  by: keyof T & string
  operator:
    | 'eq'
    | 'ne'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'nin'
    | 'contains'
    | 'startsWith'
    | 'endsWith'
  value: T[keyof T] | T[keyof T][]
}

export type SortOption<T> = {
  by: keyof T & string
  order: 'asc' | 'desc'
}

export type RangeOption = {
  limit: number
  offset: number
}

export type QueryOption<T extends ReadModel> = {
  filter?: FilterCondition<T>[]
  sort?: SortOption<T>
  range?: RangeOption
}

export interface ReadModelStore<M extends ReadModel = ReadModel> {
  findMany<T extends M['type']>(
    type: T,
    options: QueryOption<M extends { type: T } ? M : never>
  ): Promise<(M extends { type: T } ? M : never)[]>
  findById<T extends M['type']>(
    type: T,
    id: string
  ): Promise<(M extends { type: T } ? M : never) | null>
  save(model: M): Promise<void>
  delete(model: M): Promise<void>
}
