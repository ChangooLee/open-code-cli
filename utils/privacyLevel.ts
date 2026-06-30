type PrivacyLevel = 'default' | 'no-telemetry' | 'essential-traffic'
export function getPrivacyLevel(): PrivacyLevel {
  if (process.env.OPEN_CODE_CLI_DISABLE_NONESSENTIAL_TRAFFIC) {
    return 'essential-traffic'
  }
  if (process.env.DISABLE_TELEMETRY) {
    return 'no-telemetry'
  }
  return 'default'
}
export function isEssentialTrafficOnly(): boolean {
  return getPrivacyLevel() === 'essential-traffic'
}
export function isTelemetryDisabled(): boolean {
  return getPrivacyLevel() !== 'default'
}
export function getEssentialTrafficOnlyReason(): string | null {
  if (process.env.OPEN_CODE_CLI_DISABLE_NONESSENTIAL_TRAFFIC) {
    return 'OPEN_CODE_CLI_DISABLE_NONESSENTIAL_TRAFFIC'
  }
  return null
}
