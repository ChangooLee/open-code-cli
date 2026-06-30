export type NonNullableUsage = {
  prompt_tokens: number
  completion_tokens: number
  cached_tokens: number
  server_tool_use: {
    web_search_requests: number
    web_fetch_requests: number
  }
  service_tier: string
  inference_geo: string
  iterations: Array<{
    prompt_tokens: number
    completion_tokens: number
    type?: string
  }>
  speed: string
}
