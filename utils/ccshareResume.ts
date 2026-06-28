import type { LogOption } from '../types/logs.js'

/**
 * Parse a ccshare identifier out of a resume argument (e.g. a
 * `https://go/ccshare/<id>` URL), returning null when it isn't a ccshare ref.
 */
export function parseCcshareId(_input: string): string | null {
  throw new Error('not implemented')
}

/**
 * Fetch a shared conversation by ccshare id and materialize it as a resumable
 * log option.
 */
export async function loadCcshare(_ccshareId: string): Promise<LogOption> {
  throw new Error('not implemented')
}
