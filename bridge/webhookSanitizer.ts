import type { ContentBlockParam } from 'src/services/api/chatCompletions.js'
export function sanitizeInboundWebhookContent(
  content: string | Array<ContentBlockParam>,
): string | Array<ContentBlockParam> {
  throw new Error('not implemented')
}
