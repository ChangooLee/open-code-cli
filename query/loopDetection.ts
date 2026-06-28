import { feature } from 'bun:bundle'

const IDENTICAL_CALL_THRESHOLD = 5

function toolSignatures(messages: any[]): string[] {
  const sigs: string[] = []
  for (const m of messages) {
    const content = m?.message?.content
    if (!Array.isArray(content)) {
      continue
    }
    for (const block of content) {
      if (block?.type === 'tool_use') {
        let inputSig: string
        try {
          inputSig = JSON.stringify(block.input)
        } catch {
          inputSig = String(block.input)
        }
        sigs.push(`${block.name}:${inputSig}`)
      }
    }
  }
  return sigs
}

export function detectNoProgress(messages: any[]): {
  stop: boolean
  toolName?: string
  count?: number
} {
  if (!feature('AGENT_LOOP_DETECTION')) {
    return { stop: false }
  }
  const sigs = toolSignatures(messages)
  if (sigs.length < IDENTICAL_CALL_THRESHOLD) {
    return { stop: false }
  }
  const last = sigs[sigs.length - 1]
  let count = 0
  for (let i = sigs.length - 1; i >= 0 && sigs[i] === last; i--) {
    count++
  }
  if (count >= IDENTICAL_CALL_THRESHOLD) {
    return { stop: true, toolName: last.split(':')[0], count }
  }
  return { stop: false }
}
