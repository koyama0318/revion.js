import type { ReadModelStore } from '../types/adapter'
import type { Query, QueryResultData } from '../types/core'
import type { QueryResolver, QuerySource, ResolverFn, ResolverParams } from '../types/query'

/**
 * Internal type representing the accumulated values in the builder
 */
type BuilderValue<Q extends Query, QR extends QueryResultData> = {
  type: Q['type']
  queryResolver: QueryResolver<Q, QR>
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
  QR extends QueryResultData
> {
  readonly _state: ST

  type<T extends string>(
    this: IQuerySourceBuilder<'initial', Q, QR>,
    value: T
  ): IQuerySourceBuilder<'hasType', Q, QR>

  resolver(
    this: IQuerySourceBuilder<'hasType', Q, QR>,
    value: QueryResolver<Q, QR>
  ): IQuerySourceBuilder<'complete', Q, QR>

  build(this: IQuerySourceBuilder<'complete', Q, QR>): QuerySource<Q, QR>
}

/**
 * Validates that all required builder values are present
 */
function isRequiredBuilderValue<Q extends Query, QR extends QueryResultData>(
  value: Partial<BuilderValue<Q, QR>>
): value is BuilderValue<Q, QR> {
  return value.type !== undefined && value.queryResolver !== undefined
}

/**
 * Converts QueryResolver object to ResolverFn
 */
export function fromQueryResolver<Q extends Query, QR extends QueryResultData>(
  resolvers: QueryResolver<Q, QR>
): ResolverFn<Q, QR> {
  return async (params: ResolverParams<Q>): Promise<QR> => {
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
      store: params.store
    })
  }
}

class QuerySourceBuilder<ST extends BuilderState, Q extends Query, QR extends QueryResultData> {
  // @ts-expect-error: phantom type to enforce state transitions
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: phantom type to enforce state transitions
  private readonly _state!: ST

  constructor(private readonly value: Readonly<Partial<BuilderValue<Q, QR>>>) {}

  type(
    this: QuerySourceBuilder<'initial', Q, QR>,
    type: string
  ): QuerySourceBuilder<'hasType', Q, QR> {
    return this.withValue<'hasType', { type: string }>({ type })
  }

  resolver(
    this: QuerySourceBuilder<'hasType', Q, QR>,
    queryResolver: QueryResolver<Q, QR>
  ): QuerySourceBuilder<'complete', Q, QR> {
    return this.withValue<'complete', { queryResolver: QueryResolver<Q, QR> }>({ queryResolver })
  }

  private withValue<NS extends BuilderState, T extends Partial<BuilderValue<Q, QR>>>(
    updates: T
  ): QuerySourceBuilder<NS, Q, QR> {
    const newValue = { ...this.value, ...updates }
    return new QuerySourceBuilder<NS, Q, QR>(newValue)
  }

  build(this: QuerySourceBuilder<'complete', Q, QR>): QuerySource<Q, QR> {
    if (!isRequiredBuilderValue(this.value)) {
      throw new Error('QuerySource is not ready to build. Missing required properties.')
    }

    return {
      type: this.value.type,
      queryResolver: fromQueryResolver(this.value.queryResolver)
    }
  }
}

export function createQuerySource<Q extends Query, QR extends QueryResultData>() {
  return new QuerySourceBuilder<'initial', Q, QR>({})
}
