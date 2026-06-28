/**
 * Unix-domain-socket messaging server (ant-only, gated behind UDS_INBOX). Lets
 * external processes deliver messages into a running headless/REPL session.
 */

/** Returns the default socket path to bind when none is explicitly provided. */
export function getDefaultUdsSocketPath(): string {
  throw new Error('not implemented')
}

/** Returns the socket path the messaging server is currently bound to. */
export function getUdsMessagingSocketPath(): string {
  throw new Error('not implemented')
}

/**
 * Start the UDS messaging server bound to the given socket path.
 *
 * @param socketPath - Filesystem path for the unix domain socket.
 * @param opts.isExplicit - Whether the path came from an explicit CLI flag.
 */
export async function startUdsMessaging(
  _socketPath: string,
  _opts: { isExplicit: boolean },
): Promise<void> {
  throw new Error('not implemented')
}

/** Register a callback fired whenever a message is enqueued via the socket. */
export function setOnEnqueue(_onEnqueue: () => void): void {
  throw new Error('not implemented')
}
