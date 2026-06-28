import { useCallback, useState } from 'react'
import { getIsNonInteractiveSession } from '../bootstrap/state.js'
import { verifyApiKey } from '../services/api/provider.js'
import {
  getOpenAICompatibleApiKeyWithSource,
  getApiKeyFromApiKeyHelper,
  isOpenAICompatibleAuthEnabled,
  isOpenCodeCliSubscriber,
} from '../utils/auth.js'
export type VerificationStatus =
  | 'loading'
  | 'valid'
  | 'invalid'
  | 'missing'
  | 'error'
export type ApiKeyVerificationResult = {
  status: VerificationStatus
  reverify: () => Promise<void>
  error: Error | null
}
export function useApiKeyVerification(): ApiKeyVerificationResult {
  const [status, setStatus] = useState<VerificationStatus>(() => {
    if (!isOpenAICompatibleAuthEnabled() || isOpenCodeCliSubscriber()) {
      return 'valid'
    }
    const { key, source } = getOpenAICompatibleApiKeyWithSource({
      skipRetrievingKeyFromApiKeyHelper: true,
    })
    if (key || source === 'apiKeyHelper') {
      return 'loading'
    }
    return 'missing'
  })
  const [error, setError] = useState<Error | null>(null)
  const verify = useCallback(async (): Promise<void> => {
    if (!isOpenAICompatibleAuthEnabled() || isOpenCodeCliSubscriber()) {
      setStatus('valid')
      return
    }
    await getApiKeyFromApiKeyHelper(getIsNonInteractiveSession())
    const { key: apiKey, source } = getOpenAICompatibleApiKeyWithSource()
    if (!apiKey) {
      if (source === 'apiKeyHelper') {
        setStatus('error')
        setError(new Error('API key helper did not return a valid key'))
        return
      }
      const newStatus = 'missing'
      setStatus(newStatus)
      return
    }
    try {
      const isValid = await verifyApiKey(apiKey, false)
      const newStatus = isValid ? 'valid' : 'invalid'
      setStatus(newStatus)
      return
    } catch (error) {
      setError(error as Error)
      const newStatus = 'error'
      setStatus(newStatus)
      return
    }
  }, [])
  return {
    status,
    reverify: verify,
    error,
  }
}
