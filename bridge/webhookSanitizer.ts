import type { ContentBlockParam } from 'src/services/api/openaiCompatible.js'

/**
 * Sanitize inbound GitHub webhook content before injecting it into the REPL.
 * Gated behind KAIROS_GITHUB_WEBHOOKS. Preserves the input shape (plain string
 * or content blocks).
 */
export function sanitizeInboundWebhookContent(
  content: string | Array<ContentBlockParam>,
): string | Array<ContentBlockParam> {
  throw new Error('not implemented')
}
