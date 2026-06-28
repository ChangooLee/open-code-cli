import type { AssistantMessage } from '../types/message.js'

/**
 * Classifies the current turn's job/template state and persists it to the job
 * directory. Gated behind the TEMPLATES build flag.
 *
 * @param jobDir - The OPEN_CODE_JOB_DIR path, or undefined when unset.
 * @param turnAssistantMessages - Assistant messages produced this turn.
 */
export async function classifyAndWriteState(
  _jobDir: string | undefined,
  _turnAssistantMessages: AssistantMessage[],
): Promise<void> {
  throw new Error('not implemented')
}
