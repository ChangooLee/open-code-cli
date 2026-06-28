/**
 * Daemon worker registry — entry point for `--daemon-worker=<kind>` processes
 * spawned by the daemon supervisor. Dispatches to the per-kind worker run loop.
 */
export async function runDaemonWorker(kind: string | undefined): Promise<void> {
  throw new Error('not implemented')
}
