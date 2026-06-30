import type { ModelName } from './model.js'
import type { APIProvider } from './providers.js'
export type ModelConfig = Record<APIProvider, ModelName>
export const GPT_4O_MINI_CONFIG = {
  chatCompletions: 'openai/gpt-4o-mini',
} as const satisfies ModelConfig
export const GPT_4O_CONFIG = {
  chatCompletions: 'openai/gpt-4o',
} as const satisfies ModelConfig
export const GPT_4_1_CONFIG = {
  chatCompletions: 'openai/gpt-4.1',
} as const satisfies ModelConfig
export const GPT_4_1_MINI_CONFIG = {
  chatCompletions: 'openai/gpt-4.1-mini',
} as const satisfies ModelConfig
export const OPEN_CODE_PRO_CONFIG = GPT_4_1_CONFIG
export const ALL_MODEL_CONFIGS = {
  fast35: GPT_4O_MINI_CONFIG,
  fast45: GPT_4O_MINI_CONFIG,
  standard35: GPT_4_1_MINI_CONFIG,
  standard37: GPT_4_1_MINI_CONFIG,
  standard40: GPT_4O_CONFIG,
  standard45: GPT_4O_CONFIG,
  standard46: GPT_4O_CONFIG,
  pro40: GPT_4_1_CONFIG,
  pro41: GPT_4_1_CONFIG,
  pro45: GPT_4_1_CONFIG,
  pro46: GPT_4_1_CONFIG,
} as const satisfies Record<string, ModelConfig>
export type ModelKey = keyof typeof ALL_MODEL_CONFIGS
export type CanonicalModelId =
  (typeof ALL_MODEL_CONFIGS)[ModelKey]['chatCompletions']
export const CANONICAL_MODEL_IDS = Object.values(ALL_MODEL_CONFIGS).map(
  c => c.chatCompletions,
) as [CanonicalModelId, ...CanonicalModelId[]]
export const CANONICAL_ID_TO_KEY: Record<CanonicalModelId, ModelKey> =
  Object.fromEntries(
    (Object.entries(ALL_MODEL_CONFIGS) as [ModelKey, ModelConfig][]).map(
      ([key, cfg]) => [cfg.chatCompletions, key],
    ),
  ) as Record<CanonicalModelId, ModelKey>
