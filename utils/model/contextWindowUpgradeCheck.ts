import { checkProLongContextAccess, checkStandardLongContextAccess } from './checkLongContextAccess.js'
import { getUserSpecifiedModelSetting } from './model.js'
function getAvailableUpgrade(): {
  alias: string
  name: string
  multiplier: number
} | null {
  const currentModelSetting = getUserSpecifiedModelSetting()
  if (currentModelSetting === 'pro' && checkProLongContextAccess()) {
    return {
      alias: 'pro-long',
      name: 'Opus 1M',
      multiplier: 5,
    }
  } else if (currentModelSetting === 'standard' && checkStandardLongContextAccess()) {
    return {
      alias: 'standard-long',
      name: 'Sonnet 1M',
      multiplier: 5,
    }
  }
  return null
}
export function getUpgradeMessage(context: 'warning' | 'tip'): string | null {
  const upgrade = getAvailableUpgrade()
  if (!upgrade) return null
  switch (context) {
    case 'warning':
      return `/model ${upgrade.alias}`
    case 'tip':
      return `Tip: You have access to ${upgrade.name} with ${upgrade.multiplier}x more context`
    default:
      return null
  }
}
