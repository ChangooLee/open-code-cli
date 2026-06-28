import type { ThemeName } from 'src/utils/theme.js'
import type { FileStateCache } from 'src/utils/fileStateCache.js'

/**
 * Runtime context used to decide which spinner tips are relevant and to render
 * their content. All fields are optional since tips may be evaluated before a
 * session has accumulated state.
 */
export type TipContext = {
  theme?: ThemeName
  /** Files the user has read this session, used for file-path-based signals. */
  readFileState?: FileStateCache
  /** Names of CLI tools the model has invoked via Bash, used for CLI signals. */
  bashTools?: Set<string>
}

/** A contextual tip shown on the spinner. */
export type Tip = {
  id: string
  /** Lazily-rendered tip text (may depend on theme/context). */
  content: (context?: TipContext) => Promise<string>
  /** Minimum number of sessions between showings. */
  cooldownSessions: number
  /** Whether this tip applies given the current context. */
  isRelevant: (context?: TipContext) => Promise<boolean>
}
