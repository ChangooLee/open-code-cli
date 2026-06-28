import type { Command } from '../../commands.js'

/**
 * Loads the slash-commands backed by workflow scripts available in the given
 * working directory. Each discovered workflow is surfaced as a prompt command.
 */
export async function getWorkflowCommands(_cwd: string): Promise<Command[]> {
  return []
}
