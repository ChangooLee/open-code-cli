import { type StructuredPatchHunk, structuredPatch } from 'diff'
import { logEvent } from 'src/services/analytics/index.js'
import { getLocCounter } from '../bootstrap/state.js'
import { addToTotalLinesChanged } from '../cost-tracker.js'
import type { FileEdit } from '../tools/FileEditTool/types.js'
import { count } from './array.js'
import { convertLeadingTabsToSpaces } from './file.js'
export const CONTEXT_LINES = 3
export const DIFF_TIMEOUT_MS = 5_000
export function adjustHunkLineNumbers(
  hunks: StructuredPatchHunk[],
  offset: number,
): StructuredPatchHunk[] {
  if (offset === 0) return hunks
  return hunks.map(h => ({
    ...h,
    oldStart: h.oldStart + offset,
    newStart: h.newStart + offset,
  }))
}
const AMPERSAND_TOKEN = '<<:AMPERSAND_TOKEN:>>'
const DOLLAR_TOKEN = '<<:DOLLAR_TOKEN:>>'
function escapeForDiff(s: string): string {
  return s.replaceAll('&', AMPERSAND_TOKEN).replaceAll('$', DOLLAR_TOKEN)
}
function unescapeFromDiff(s: string): string {
  return s.replaceAll(AMPERSAND_TOKEN, '&').replaceAll(DOLLAR_TOKEN, '$')
}
export function countLinesChanged(
  patch: StructuredPatchHunk[],
  newFileContent?: string,
): void {
  let numAdditions = 0
  let numRemovals = 0
  if (patch.length === 0 && newFileContent) {
    numAdditions = newFileContent.split(/\r?\n/).length
  } else {
    numAdditions = patch.reduce(
      (acc, hunk) => acc + count(hunk.lines, _ => _.startsWith('+')),
      0,
    )
    numRemovals = patch.reduce(
      (acc, hunk) => acc + count(hunk.lines, _ => _.startsWith('-')),
      0,
    )
  }
  addToTotalLinesChanged(numAdditions, numRemovals)
  getLocCounter()?.add(numAdditions, { type: 'added' })
  getLocCounter()?.add(numRemovals, { type: 'removed' })
  logEvent('open_code_cli_file_changed', {
    lines_added: numAdditions,
    lines_removed: numRemovals,
  })
}
export function getPatchFromContents({
  filePath,
  oldContent,
  newContent,
  ignoreWhitespace = false,
  singleHunk = false,
}: {
  filePath: string
  oldContent: string
  newContent: string
  ignoreWhitespace?: boolean
  singleHunk?: boolean
}): StructuredPatchHunk[] {
  const result = structuredPatch(
    filePath,
    filePath,
    escapeForDiff(oldContent),
    escapeForDiff(newContent),
    undefined,
    undefined,
    {
      ignoreWhitespace,
      context: singleHunk ? 100_000 : CONTEXT_LINES,
      timeout: DIFF_TIMEOUT_MS,
    },
  )
  if (!result) {
    return []
  }
  return result.hunks.map(_ => ({
    ..._,
    lines: _.lines.map(unescapeFromDiff),
  }))
}
export function getPatchForDisplay({
  filePath,
  fileContents,
  edits,
  ignoreWhitespace = false,
}: {
  filePath: string
  fileContents: string
  edits: FileEdit[]
  ignoreWhitespace?: boolean
}): StructuredPatchHunk[] {
  const preparedFileContents = escapeForDiff(
    convertLeadingTabsToSpaces(fileContents),
  )
  const result = structuredPatch(
    filePath,
    filePath,
    preparedFileContents,
    edits.reduce((p, edit) => {
      const { old_string, new_string } = edit
      const replace_all = 'replace_all' in edit ? edit.replace_all : false
      const escapedOldString = escapeForDiff(
        convertLeadingTabsToSpaces(old_string),
      )
      const escapedNewString = escapeForDiff(
        convertLeadingTabsToSpaces(new_string),
      )
      if (replace_all) {
        return p.replaceAll(escapedOldString, () => escapedNewString)
      } else {
        return p.replace(escapedOldString, () => escapedNewString)
      }
    }, preparedFileContents),
    undefined,
    undefined,
    {
      context: CONTEXT_LINES,
      ignoreWhitespace,
      timeout: DIFF_TIMEOUT_MS,
    },
  )
  if (!result) {
    return []
  }
  return result.hunks.map(_ => ({
    ..._,
    lines: _.lines.map(unescapeFromDiff),
  }))
}
