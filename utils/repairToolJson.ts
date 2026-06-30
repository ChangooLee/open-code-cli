export function repairToolJson(input: string): unknown | undefined {
  if (!input) {
    return undefined
  }
  let s = input.trim()
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fence) {
    s = fence[1].trim()
  }
  const objStart = s.indexOf('{')
  const arrStart = s.indexOf('[')
  let start: number
  if (objStart === -1) {
    start = arrStart
  } else if (arrStart === -1) {
    start = objStart
  } else {
    start = Math.min(objStart, arrStart)
  }
  if (start > 0) {
    s = s.slice(start)
  }
  const stripTrailingCommas = (t: string): string =>
    t.replace(/,\s*([}\]])/g, '$1')
  const attempts = [s, stripTrailingCommas(s)]
  const lastClose = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'))
  if (lastClose !== -1) {
    attempts.push(stripTrailingCommas(s.slice(0, lastClose + 1)))
  }
  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt)
      if (parsed !== null && typeof parsed === 'object') {
        return parsed
      }
    } catch {
      continue
    }
  }
  return undefined
}
