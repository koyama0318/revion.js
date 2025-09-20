import type { Query, QueryResultData } from '../types/core'
import type { QueryResolver, QuerySource, ResolverFn, ResolverParams } from '../types/query'

/**
 * Internal type representing the accumulated values in the builder
 */
type BuilderValue<
  Q extends Query,
  QR extends QueryResultData,
  D extends Record<string, unknown>
> = {
  type: Q['type']
  queryResolver: QueryResolver<Q, QR, D>
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
  D extends Record<string, unknown>
> {
  readonly _state: ST

  type<T extends string>(
    this: IQuerySourceBuilder<'initial', Q, QR, D>,
    value: T
  ): IQuerySourceBuilder<'hasType', Q, QR, D>

  resolver(
    this: IQuerySourceBuilder<'hasType', Q, QR, D>,
    value: QueryResolver<Q, QR, D>
  ): IQuerySourceBuilder<'complete', Q, QR, D>

  build(this: IQuerySourceBuilder<'complete', Q, QR, D>): QuerySource<Q, QR, D>
}

/**
 * Validates that all required builder values are present
 */
function isRequiredBuilderValue<
  Q extends Query,
  QR extends QueryResultData,
  D extends Record<string, unknown>
>(value: Partial<BuilderValue<Q, QR, D>>): value is BuilderValue<Q, QR, D> {
  return value.type !== undefined && value.queryResolver !== undefined
}

/**
 * Converts QueryResolver object to ResolverFn
 */
export function fromQueryResolver<Q extends Query, QR extends QueryResultData, D>(
  resolvers: QueryResolver<Q, QR, D>
): ResolverFn<Q, QR, D> {
  return async (params: ResolverParams<Q, D>): Promise<QR> => {
    const resolverMap = resolvers as unknown as Record<Q['type'], ResolverFn<Q, QR, D>>
    const resolver = resolverMap[params.query.type as Q['type']]
    if (!resolver) {
      throw new Error(`No resolver found for type: ${String(params.query.type)}`)
    }

    return resolver({
      ctx: params.ctx,
      query: params.query as Extract<Q, { type: typeof params.query.type }>,
      deps: params.deps
    })
  }
}

class QuerySourceBuilder<
  ST extends BuilderState,
  Q extends Query,
  QR extends QueryResultData,
  D extends Record<string, unknown>
> {
  // @ts-expect-error: phantom type to enforce state transitions
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: phantom type to enforce state transitions
  private readonly _state!: ST

  constructor(private readonly value: Readonly<Partial<BuilderValue<Q, QR, D>>>) {}

  type(
    this: QuerySourceBuilder<'initial', Q, QR, D>,
    type: string
  ): QuerySourceBuilder<'hasType', Q, QR, D> {
    return this.withValue<'hasType', { type: string }>({ type })
  }

  resolver(
    this: QuerySourceBuilder<'hasType', Q, QR, D>,
    queryResolver: QueryResolver<Q, QR, D>
  ): QuerySourceBuilder<'complete', Q, QR, D> {
    return this.withValue<'complete', { queryResolver: QueryResolver<Q, QR, D> }>({ queryResolver })
  }

  private withValue<NS extends BuilderState, T extends Partial<BuilderValue<Q, QR, D>>>(
    updates: T
  ): QuerySourceBuilder<NS, Q, QR, D> {
    const newValue = { ...this.value, ...updates }
    return new QuerySourceBuilder<NS, Q, QR, D>(newValue)
  }

  build(this: QuerySourceBuilder<'complete', Q, QR, D>): QuerySource<Q, QR, D> {
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
  D extends Record<string, unknown> = Record<string, unknown>
>() {
  return new QuerySourceBuilder<'initial', Q, QR, D>({})
}
