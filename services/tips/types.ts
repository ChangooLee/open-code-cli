import type { ThemeName } from 'src/utils/theme.js'
import type { FileStateCache } from 'src/utils/fileStateCache.js'
export type TipContext = {
  theme?: ThemeName
  readFileState?: FileStateCache
  bashTools?: Set<string>
}
export type Tip = {
  id: string
  content: (context?: TipContext) => Promise<string>
  cooldownSessions: number
  isRelevant: (context?: TipContext) => Promise<boolean>
}
