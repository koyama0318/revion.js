import type { QueryOption, ReadModelStore } from '../types/adapter'
import type { ReadModel } from '../types/core'

type ModelOfType<M extends ReadModel, T extends M['type']> = M extends { type: T } ? M : never

export class ReadModelStoreInMemory<M extends ReadModel = ReadModel> implements ReadModelStore<M> {
  storage: Record<string, Record<string, M>> = {}

  async findMany<T extends M['type']>(
    type: T,
    options: QueryOption<ModelOfType<M, T>>
  ): Promise<ModelOfType<M, T>[]> {
    const dataMap = this.storage[type as string]
    if (!dataMap) return []

    let items = Object.values(dataMap) as ModelOfType<M, T>[]

    if (options.filter && Array.isArray(options.filter)) {
      for (const filterCondition of options.filter) {
        const { by, operator, value } = filterCondition
        items = items.filter(item => {
          const itemValue = item[by]
          switch (operator) {
            case 'eq':
              return itemValue === value
            case 'ne':
              return itemValue !== value
            case 'gt':
              return itemValue > value
            case 'gte':
              return itemValue >= value
            case 'lt':
              return itemValue < value
            case 'lte':
              return itemValue <= value
            case 'in':
              return Array.isArray(value) && value.includes(itemValue)
            case 'nin':
              return Array.isArray(value) && !value.includes(itemValue)
            case 'contains':
              return (
                typeof itemValue === 'string' &&
                typeof value === 'string' &&
                itemValue.includes(value)
              )
            case 'startsWith':
              return (
                typeof itemValue === 'string' &&
                typeof value === 'string' &&
                itemValue.startsWith(value)
              )
            case 'endsWith':
              return (
                typeof itemValue === 'string' &&
                typeof value === 'string' &&
                itemValue.endsWith(value)
              )
            default:
              return false
          }
        })
      }
    }

    if (options.sort) {
      const { by, order } = options.sort
      items = [...items].sort((a, b) => {
        const aVal = a[by]
        const bVal = b[by]

        if (aVal == null || bVal == null) return 0
        if (aVal < bVal) return order === 'asc' ? -1 : 1
        if (aVal > bVal) return order === 'asc' ? 1 : -1
        return 0
      })
    }

    const offset = options.range?.offset ?? 0
    const limit = options.range?.limit ?? items.length
    const paged = items.slice(offset, offset + limit)

    return paged
  }

  async findById<T extends M['type']>(type: T, id: string): Promise<ModelOfType<M, T> | null> {
    const typeStorage = this.storage[type as string]
    if (!typeStorage) return null

    const readModel = typeStorage[id]
    if (!readModel) return null

    return readModel as ModelOfType<M, T>
  }

  async save(model: M): Promise<void> {
    const typeStorage = this.storage[model.type] || {}
    if (typeStorage[model.id]) return
    typeStorage[model.id] = model
    this.storage[model.type] = typeStorage
  }

  async delete(model: M): Promise<void> {
    const typeStorage = this.storage[model.type]
    if (typeStorage) {
      delete typeStorage[model.id]
    }
  }

  clear(): void {
    this.storage = {}
  }
}
