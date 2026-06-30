import { randomUUID, type UUID } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { getOriginalCwd, getSessionId } from '../../bootstrap/state.js'
import type { LocalJSXCommandContext } from '../../commands.js'
import { logEvent } from '../../services/analytics/index.js'
import type { LocalJSXCommandOnDone } from '../../types/command.js'
import type {
  ContentReplacementEntry,
  Entry,
  LogOption,
  SerializedMessage,
  TranscriptMessage,
} from '../../types/logs.js'
import { parseJSONL } from '../../utils/json.js'
import {
  getProjectDir,
  getTranscriptPath,
  getTranscriptPathForSession,
  isTranscriptMessage,
  saveCustomTitle,
  searchSessionsByCustomTitle,
} from '../../utils/sessionStorage.js'
import { jsonStringify } from '../../utils/slowOperations.js'
import { escapeRegExp } from '../../utils/stringUtils.js'
type TranscriptEntry = TranscriptMessage & {
  splitFrom?: {
    sessionId: string
    messageUuid: UUID
  }
}
export function deriveFirstPrompt(
  firstUserMessage: Extract<SerializedMessage, { type: 'user' }> | undefined,
): string {
  const content = firstUserMessage?.message?.content
  if (!content) return 'Branched conversation'
  const raw =
    typeof content === 'string'
      ? content
      : content.find(
          (block): block is { type: 'text'; text: string } =>
            block.type === 'text',
        )?.text
  if (!raw) return 'Branched conversation'
  return (
    raw.replace(/\s+/g, ' ').trim().slice(0, 100) || 'Branched conversation'
  )
}
async function createBranchSession(customTitle?: string): Promise<{
  sessionId: UUID
  title: string | undefined
  splitPath: string
  serializedMessages: SerializedMessage[]
  contentReplacementRecords: ContentReplacementEntry['replacements']
}> {
  const splitSessionId = randomUUID() as UUID
  const originalSessionId = getSessionId()
  const projectDir = getProjectDir(getOriginalCwd())
  const splitSessionPath = getTranscriptPathForSession(splitSessionId)
  const currentTranscriptPath = getTranscriptPath()
  await mkdir(projectDir, { recursive: true, mode: 0o700 })
  let transcriptContent: Buffer
  try {
    transcriptContent = await readFile(currentTranscriptPath)
  } catch {
    throw new Error('No conversation to branch')
  }
  if (transcriptContent.length === 0) {
    throw new Error('No conversation to branch')
  }
  const entries = parseJSONL<Entry>(transcriptContent)
  const mainConversationEntries = entries.filter(
    (entry): entry is TranscriptMessage =>
      isTranscriptMessage(entry) && !entry.isSidechain,
  )
  const contentReplacementRecords = entries
    .filter(
      (entry): entry is ContentReplacementEntry =>
        entry.type === 'content-replacement' &&
        entry.sessionId === originalSessionId,
    )
    .flatMap(entry => entry.replacements)
  if (mainConversationEntries.length === 0) {
    throw new Error('No messages to branch')
  }
  let parentUuid: UUID | null = null
  const lines: string[] = []
  const serializedMessages: SerializedMessage[] = []
  for (const entry of mainConversationEntries) {
    const splitEntry: TranscriptEntry = {
      ...entry,
      sessionId: splitSessionId,
      parentUuid,
      isSidechain: false,
      splitFrom: {
        sessionId: originalSessionId,
        messageUuid: entry.uuid,
      },
    }
    const serialized: SerializedMessage = {
      ...entry,
      sessionId: splitSessionId,
    }
    serializedMessages.push(serialized)
    lines.push(jsonStringify(splitEntry))
    if (entry.type !== 'progress') {
      parentUuid = entry.uuid
    }
  }
  if (contentReplacementRecords.length > 0) {
    const splitReplacementEntry: ContentReplacementEntry = {
      type: 'content-replacement',
      sessionId: splitSessionId,
      replacements: contentReplacementRecords,
    }
    lines.push(jsonStringify(splitReplacementEntry))
  }
  await writeFile(splitSessionPath, lines.join('\n') + '\n', {
    encoding: 'utf8',
    mode: 0o600,
  })
  return {
    sessionId: splitSessionId,
    title: customTitle,
    splitPath: splitSessionPath,
    serializedMessages,
    contentReplacementRecords,
  }
}
async function getUniqueBranchName(baseName: string): Promise<string> {
  const candidateName = `${baseName} (Branch)`
  const existingWithExactName = await searchSessionsByCustomTitle(
    candidateName,
    { exact: true },
  )
  if (existingWithExactName.length === 0) {
    return candidateName
  }
  const existingBranches = await searchSessionsByCustomTitle(`${baseName} (Branch`)
  const usedNumbers = new Set<number>([1]) 
  const splitNumberPattern = new RegExp(
    `^${escapeRegExp(baseName)} \\(Branch(?: (\\d+))?\\)$`,
  )
  for (const session of existingBranches) {
    const match = session.customTitle?.match(splitNumberPattern)
    if (match) {
      if (match[1]) {
        usedNumbers.add(parseInt(match[1], 10))
      } else {
        usedNumbers.add(1) 
      }
    }
  }
  let nextNumber = 2
  while (usedNumbers.has(nextNumber)) {
    nextNumber++
  }
  return `${baseName} (Branch ${nextNumber})`
}
export async function call(
  onDone: LocalJSXCommandOnDone,
  context: LocalJSXCommandContext,
  args: string,
): Promise<React.ReactNode> {
  const customTitle = args?.trim() || undefined
  const originalSessionId = getSessionId()
  try {
    const {
      sessionId,
      title,
      splitPath,
      serializedMessages,
      contentReplacementRecords,
    } = await createBranchSession(customTitle)
    const now = new Date()
    const firstPrompt = deriveFirstPrompt(
      serializedMessages.find(m => m.type === 'user'),
    )
    const baseName = title ?? firstPrompt
    const effectiveTitle = await getUniqueBranchName(baseName)
    await saveCustomTitle(sessionId, effectiveTitle, splitPath)
    logEvent('open_code_cli_conversation_split', {
      message_count: serializedMessages.length,
      has_custom_title: !!title,
    })
    const splitLog: LogOption = {
      date: now.toISOString().split('T')[0]!,
      messages: serializedMessages,
      fullPath: splitPath,
      value: now.getTime(),
      created: now,
      modified: now,
      firstPrompt,
      messageCount: serializedMessages.length,
      isSidechain: false,
      sessionId,
      customTitle: effectiveTitle,
      contentReplacements: contentReplacementRecords,
    }
    const titleInfo = title ? ` "${title}"` : ''
    const resumeHint = `\nTo resume the original: open-code-cli -r ${originalSessionId}`
    const successMessage = `Branched conversation${titleInfo}. You are now in the branch.${resumeHint}`
    if (context.resume) {
      await context.resume(sessionId, splitLog, 'split')
      onDone(successMessage, { display: 'system' })
    } else {
      onDone(
        `Branched conversation${titleInfo}. Resume with: /resume ${sessionId}`,
      )
    }
    return null
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred'
    onDone(`Failed to branch conversation: ${message}`)
    return null
  }
}
