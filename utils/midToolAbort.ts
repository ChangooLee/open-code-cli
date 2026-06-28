export type AbortCheckResult = {
  aborted: boolean;
  reason: 'signal' | null;
};

export function checkMidToolAbort(
  signal: { aborted: boolean } | null | undefined,
): AbortCheckResult {
  if (signal && signal.aborted === true) {
    return { aborted: true, reason: 'signal' };
  }
  return { aborted: false, reason: null };
}

export function formatMidToolAbortError(context: string): string {
  const where = context && context.trim() ? context.trim() : 'operation';
  return `Aborted by parent during ${where}.`;
}
