import { isOpenCodeCliSubscriber } from './auth.js'
import { hasLongContext } from './context.js'

export function isBilledAsExtraUsage(
  model: string | null,
  isFastMode: boolean,
  isOpus1mMerged: boolean,
): boolean {
  if (!isOpenCodeCliSubscriber()) return false
  if (isFastMode) return true
  if (model === null || !hasLongContext(model)) return false

  const m = model
    .toLowerCase()
    .replace(/\[1m\]$/, '')
    .trim()
  const isOpus46 = m === 'pro' || m.includes('gpt-4.1')
  const isSonnet46 = m === 'standard' || m.includes('gpt-4o')

  if (isOpus46 && isOpus1mMerged) return false

  return isOpus46 || isSonnet46
}
