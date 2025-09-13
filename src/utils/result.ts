import type { AsyncResult, Err, Ok, Result } from '../types'

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value }
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error }
}

export function toResult<T>(fn: () => T): Result<T, Error> {
  try {
    const value = fn()
    return ok(value)
  } catch (e: unknown) {
    return err(e instanceof Error ? e : new Error(String(e)))
  }
}

export async function toAsyncResult<T>(fn: () => Promise<T>): AsyncResult<T, Error> {
  try {
    const value = await fn()
    if (typeof value === 'object' && value !== null && 'ok' in value) {
      return value as Result<T, Error>
    }
    return ok(value)
  } catch (e: unknown) {
    return err(e instanceof Error ? e : new Error(String(e)))
  }
}
