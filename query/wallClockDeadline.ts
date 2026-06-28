export function resolveDeadlineMs(envValue: string | undefined): number | null {
  if (envValue === undefined) return null
  const trimmed = envValue.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.floor(parsed)
}

export type DeadlineDecision =
  | { expired: false }
  | { expired: true; elapsedMs: number; deadlineMs: number }

export function checkDeadline(
  startedAt: number,
  deadlineMs: number | null,
  now: number,
): DeadlineDecision {
  if (deadlineMs === null || deadlineMs <= 0) return { expired: false }
  const elapsedMs = now - startedAt
  if (elapsedMs < deadlineMs) return { expired: false }
  return { expired: true, elapsedMs, deadlineMs }
}
