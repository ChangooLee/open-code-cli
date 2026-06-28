import type { Command } from 'commander'

/**
 * Ant-only subcommand handlers — extracted from main.tsx for lazy loading.
 * These commands are gated behind the build-time "ant" flag and stripped from
 * external builds via dead-code elimination.
 */

export async function logHandler(
  logId: string | number | undefined,
): Promise<void> {
  throw new Error('not implemented')
}

export async function errorHandler(number: number | undefined): Promise<void> {
  throw new Error('not implemented')
}

export async function exportHandler(
  source: string,
  outputFile: string,
): Promise<void> {
  throw new Error('not implemented')
}

export async function taskCreateHandler(
  subject: string,
  opts: { description?: string; list?: string },
): Promise<void> {
  throw new Error('not implemented')
}

export async function taskListHandler(opts: {
  list?: string
  pending?: boolean
  json?: boolean
}): Promise<void> {
  throw new Error('not implemented')
}

export async function taskGetHandler(
  id: string,
  opts: { list?: string },
): Promise<void> {
  throw new Error('not implemented')
}

export async function taskUpdateHandler(
  id: string,
  opts: {
    list?: string
    status?: string
    subject?: string
    description?: string
    owner?: string
    clearOwner?: boolean
  },
): Promise<void> {
  throw new Error('not implemented')
}

export async function taskDirHandler(opts: { list?: string }): Promise<void> {
  throw new Error('not implemented')
}

export async function completionHandler(
  shell: string,
  opts: { output?: string },
  program: Command,
): Promise<void> {
  throw new Error('not implemented')
}
