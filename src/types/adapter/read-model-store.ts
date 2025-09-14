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

export interface ReadModelStore {
  findMany<T extends ReadModel>(type: T['type'], options: QueryOption<T>): Promise<T[]>
  findById<T extends ReadModel>(type: T['type'], id: string): Promise<T | null>
  save<T extends ReadModel>(model: T): Promise<void>
  delete<T extends ReadModel>(model: T): Promise<void>
}
