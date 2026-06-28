import { extname } from 'path'
export type CliHighlight = {
  highlight: any
  supportsLanguage: any
}
let cliHighlightPromise: Promise<CliHighlight | null> | undefined
let loadedGetLanguage: ((name: string) => any) | undefined
async function loadCliHighlight(): Promise<CliHighlight | null> {
  try {
    const cliHighlight = await import('cli-highlight')
    const highlightJs = await import('highlight.js')
    loadedGetLanguage = (highlightJs as any).getLanguage
    return {
      highlight: cliHighlight.highlight,
      supportsLanguage: cliHighlight.supportsLanguage,
    }
  } catch {
    return null
  }
}
export function getCliHighlightPromise(): Promise<CliHighlight | null> {
  cliHighlightPromise ??= loadCliHighlight()
  return cliHighlightPromise
}
export async function getLanguageName(file_path: string): Promise<string> {
  await getCliHighlightPromise()
  const ext = extname(file_path).slice(1)
  if (!ext) return 'unknown'
  return loadedGetLanguage?.(ext)?.name ?? 'unknown'
}
