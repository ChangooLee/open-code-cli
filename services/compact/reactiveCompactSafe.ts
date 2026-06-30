export function safeReactiveCall<T>(
  fn: () => T,
  fallback: T,
  onError?: (err: unknown) => void,
): T {
  try {
    return fn()
  } catch (err) {
    if (onError) {
      onError(err)
    }
    return fallback
  }
}

export async function safeReactiveCallAsync<T>(
  fn: () => Promise<T>,
  fallback: T,
  onError?: (err: unknown) => void,
): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (onError) {
      onError(err)
    }
    return fallback
  }
}
