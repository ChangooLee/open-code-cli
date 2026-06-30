import memoize from 'lodash-es/memoize.js'
export function getLocalISODate(): string {
  if (process.env.OPEN_CODE_CLI_OVERRIDE_DATE) {
    return process.env.OPEN_CODE_CLI_OVERRIDE_DATE
  }
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
export const getOnSessionStartDate = memoize(getLocalISODate)
export function getLocalMonthYear(): string {
  const date = process.env.OPEN_CODE_CLI_OVERRIDE_DATE
    ? new Date(process.env.OPEN_CODE_CLI_OVERRIDE_DATE)
    : new Date()
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' })
}
