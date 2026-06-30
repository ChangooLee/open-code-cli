import type { OverageDisabledReason } from 'src/services/openCodeCliLimits.js'
import { isOpenCodeCliSubscriber } from '../auth.js'
import { getGlobalConfig } from '../config.js'
import { isLongContextDisabled } from '../context.js'
function isExtraUsageEnabled(): boolean {
  const reason = getGlobalConfig().cachedExtraUsageDisabledReason
  if (reason === undefined) {
    return false
  }
  if (reason === null) {
    return true
  }
  switch (reason as OverageDisabledReason) {
    case 'out_of_credits':
      return true
    case 'overage_not_provisioned':
    case 'org_level_disabled':
    case 'org_level_disabled_until':
    case 'seat_tier_level_disabled':
    case 'member_level_disabled':
    case 'seat_tier_zero_credit_limit':
    case 'group_zero_credit_limit':
    case 'member_zero_credit_limit':
    case 'org_service_level_disabled':
    case 'org_service_zero_credit_limit':
    case 'no_limits_configured':
    case 'unknown':
      return false
    default:
      return false
  }
}
export function checkProLongContextAccess(): boolean {
  if (isLongContextDisabled()) {
    return false
  }
  if (isOpenCodeCliSubscriber()) {
    return isExtraUsageEnabled()
  }
  return true
}
export function checkStandardLongContextAccess(): boolean {
  if (isLongContextDisabled()) {
    return false
  }
  if (isOpenCodeCliSubscriber()) {
    return isExtraUsageEnabled()
  }
  return true
}
