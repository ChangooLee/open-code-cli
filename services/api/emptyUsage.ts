import type { NonNullableUsage } from '../../entrypoints/sdk/sdkUtilityTypes.js'
export const EMPTY_USAGE: Readonly<NonNullableUsage> = {
  prompt_tokens: 0,
  cached_tokens: 0,
  completion_tokens: 0,
  server_tool_use: { web_search_requests: 0, web_fetch_requests: 0 },
  service_tier: 'standard',
  inference_geo: '',
  iterations: [],
  speed: 'standard',
}
