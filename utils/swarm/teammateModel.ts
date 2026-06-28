import { OPEN_CODE_OPUS_4_6_CONFIG } from '../model/configs.js'
import { getAPIProvider } from '../model/providers.js'
export function getHardcodedTeammateModelFallback(): string {
  return OPEN_CODE_OPUS_4_6_CONFIG[getAPIProvider()]
}
