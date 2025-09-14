import type { QueryOption, ReadModelStore } from '../types/adapter'
import type { ReadModel } from '../types/core'

export class ReadModelStoreInMemory implements ReadModelStore {
  storage: Record<string, Record<string, ReadModel>> = {}

  async findMany<T extends ReadModel>(type: T['type'], options: QueryOption<T>): Promise<T[]> {
    const dataMap = this.storage[type as string]
    if (!dataMap) return []

    let items: T[] = Object.values(dataMap) as T[]

    // filter
    if (options.filter) {
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
              return true
          }
        })
      }
    }

    // sort
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

    // pagination
    const offset = options.range?.offset ?? 0
    const limit = options.range?.limit ?? items.length
    const paged = items.slice(offset, offset + limit)

    return paged
  }

  async findById<T extends ReadModel>(type: T['type'], id: string): Promise<T | null> {
    const typeStorage = this.storage[type as string] || {}
    const readModel = typeStorage[id]
    if (!readModel) return null
    return readModel as T
  }

  async save<T extends ReadModel>(model: T): Promise<void> {
    const typeStorage = this.storage[model.type] || {}
    typeStorage[model.id] = model
    this.storage[model.type] = typeStorage
  }

  async delete<T extends ReadModel>(model: T): Promise<void> {
    const typeStorage = this.storage[model.type]
    if (typeStorage) {
      delete typeStorage[model.id]
    }
  }
}
