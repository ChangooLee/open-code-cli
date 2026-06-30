import { OPEN_CODE_PRO_CONFIG } from '../model/configs.js'
import { getAPIProvider } from '../model/providers.js'
export function getHardcodedTeammateModelFallback(): string {
  return OPEN_CODE_PRO_CONFIG[getAPIProvider()]
}
