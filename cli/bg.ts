/**
 * Background session management — `open-code-cli ps|logs|attach|kill` and the
 * `--bg`/`--background` flag. Operates against the ~/.open-code-cli/sessions/
 * registry. Loaded lazily from the CLI bootstrap fast-path.
 */

export async function psHandler(args: string[]): Promise<void> {
  throw new Error('not implemented')
}

export async function logsHandler(sessionId: string | undefined): Promise<void> {
  throw new Error('not implemented')
}

export async function attachHandler(
  sessionId: string | undefined,
): Promise<void> {
  throw new Error('not implemented')
}

export async function killHandler(sessionId: string | undefined): Promise<void> {
  throw new Error('not implemented')
}

export async function handleBgFlag(args: string[]): Promise<void> {
  throw new Error('not implemented')
}
