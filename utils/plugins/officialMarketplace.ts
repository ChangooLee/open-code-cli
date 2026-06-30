import type { MarketplaceSource } from './schemas.js'
export const OFFICIAL_MARKETPLACE_SOURCE = {
  source: 'github',
  repo: 'open-code-cli-org/open-code-cli-plugins-official',
} as const satisfies MarketplaceSource
export const OFFICIAL_MARKETPLACE_NAME = 'open-code-cli-plugins-official'
