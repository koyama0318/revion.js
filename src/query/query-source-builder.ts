import type { ReadModelStore } from '../types/adapter'
import type { Query, QueryResultData, ReadModel } from '../types/core'
import type { QueryResolver, QuerySource, ResolverFn, ResolverParams } from '../types/query'

/**
 * Internal type representing the accumulated values in the builder
 */
type BuilderValue<Q extends Query, QR extends QueryResultData, RM extends ReadModel> = {
  type: Q['type']
  queryResolver: QueryResolver<Q, QR, RM>
}

/**
 * Builder state types for enforcing correct method call order
 */
export type BuilderState = 'initial' | 'hasType' | 'hasResolver' | 'complete'

/**
 * Public interface for query source builder
 * Provides type-safe fluent API for building query sources
 */
export interface IQuerySourceBuilder<
  ST extends BuilderState,
  Q extends Query,
  QR extends QueryResultData,
  RM extends ReadModel
> {
  readonly _state: ST

  type<T extends string>(
    this: IQuerySourceBuilder<'initial', Q, QR, RM>,
    value: T
  ): IQuerySourceBuilder<'hasType', Q, QR, RM>

  resolver(
    this: IQuerySourceBuilder<'hasType', Q, QR, RM>,
    value: QueryResolver<Q, QR, RM>
  ): IQuerySourceBuilder<'complete', Q, QR, RM>

  build(this: IQuerySourceBuilder<'complete', Q, QR, RM>): QuerySource<Q, QR, RM>
}

/**
 * Validates that all required builder values are present
 */
function isRequiredBuilderValue<Q extends Query, QR extends QueryResultData, RM extends ReadModel>(
  value: Partial<BuilderValue<Q, QR, RM>>
): value is BuilderValue<Q, QR, RM> {
  return value.type !== undefined && value.queryResolver !== undefined
}

/**
 * Converts QueryResolver object to ResolverFn
 */
export function fromQueryResolver<
  Q extends Query,
  QR extends QueryResultData,
  RM extends ReadModel
>(resolvers: QueryResolver<Q, QR, RM>): ResolverFn<Q, QR, RM> {
  return async (params: ResolverParams<Q, RM>): Promise<QR> => {
    const resolverMap = resolvers as unknown as Record<
      Q['type'],
      (params: { query: Q; store: ReadModelStore }) => Promise<QR>
    >
    const resolver = resolverMap[params.query.type as Q['type']]
    if (!resolver) {
      throw new Error(`No resolver found for type: ${String(params.query.type)}`)
    }

    return resolver({
      query: params.query as Extract<Q, { type: typeof params.query.type }>,
      store: params.store as unknown as ReadModelStore
    })
  }
}

class QuerySourceBuilder<
  ST extends BuilderState,
  Q extends Query,
  QR extends QueryResultData,
  RM extends ReadModel
> {
  // @ts-expect-error: phantom type to enforce state transitions
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: phantom type to enforce state transitions
  private readonly _state!: ST

  constructor(private readonly value: Readonly<Partial<BuilderValue<Q, QR, RM>>>) {}

  type(
    this: QuerySourceBuilder<'initial', Q, QR, RM>,
    type: string
  ): QuerySourceBuilder<'hasType', Q, QR, RM> {
    return this.withValue<'hasType', { type: string }>({ type })
  }

  resolver(
    this: QuerySourceBuilder<'hasType', Q, QR, RM>,
    queryResolver: QueryResolver<Q, QR, RM>
  ): QuerySourceBuilder<'complete', Q, QR, RM> {
    return this.withValue<'complete', { queryResolver: QueryResolver<Q, QR, RM> }>({
      queryResolver
    })
  }

  private withValue<NS extends BuilderState, T extends Partial<BuilderValue<Q, QR, RM>>>(
    updates: T
  ): QuerySourceBuilder<NS, Q, QR, RM> {
    const newValue = { ...this.value, ...updates }
    return new QuerySourceBuilder<NS, Q, QR, RM>(newValue)
  }

  build(this: QuerySourceBuilder<'complete', Q, QR, RM>): QuerySource<Q, QR, RM> {
    if (!isRequiredBuilderValue(this.value)) {
      throw new Error('QuerySource is not ready to build. Missing required properties.')
    }

    return {
      type: this.value.type,
      queryResolver: fromQueryResolver(this.value.queryResolver)
    }
  }
}

export function createQuerySource<
  Q extends Query,
  QR extends QueryResultData,
  RM extends ReadModel
>() {
  return new QuerySourceBuilder<'initial', Q, QR, RM>({})
}
