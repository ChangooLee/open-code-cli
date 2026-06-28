// Reconstructed: utility types that can't be expressed as Zod schemas.

/**
 * The provider API usage shape with every field present (non-nullable).
 * Consumers (EMPTY_USAGE, updateUsage, accumulateUsage in services/api) use the
 * snake_case wire shape, so this models that rather than the SDK ModelUsage.
 */
export type NonNullableUsage = {
  input_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
  output_tokens: number
  server_tool_use: {
    web_search_requests: number
    web_fetch_requests: number
  }
  service_tier: string
  cache_creation: {
    ephemeral_1h_input_tokens: number
    ephemeral_5m_input_tokens: number
  }
  inference_geo: string
  iterations: Array<{
    input_tokens: number
    output_tokens: number
    type?: string
  }>
  speed: string
}
