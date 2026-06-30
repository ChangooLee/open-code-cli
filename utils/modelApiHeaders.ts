import memoize from 'lodash-es/memoize.js'
import { getSdkApiHeaders } from '../bootstrap/state.js'
import { CAPABILITY_SEARCH_HEADER_1P } from '../constants/apiHeaders.js'

export function filterAllowedSdkApiHeaders(
  sdkApiHeaders: string[] | undefined,
): string[] | undefined {
  return sdkApiHeaders && sdkApiHeaders.length > 0 ? sdkApiHeaders : undefined
}

export function modelSupportsISP(_model: string): boolean {
  return false
}

export function modelSupportsContextManagement(_model: string): boolean {
  return false
}

export function modelSupportsStructuredOutputs(_model: string): boolean {
  return true
}

export function modelSupportsAutoMode(_model: string): boolean {
  return false
}

export function getCapabilitySearchApiHeader(): string {
  return CAPABILITY_SEARCH_HEADER_1P
}

export function shouldIncludeFirstPartyOnlyApiHeaders(): boolean {
  return false
}

export function shouldUseGlobalCacheScope(): boolean {
  return false
}

export const getAllModelApiHeaders = memoize((_model: string): string[] => [])
export const getModelApiHeaders = memoize((_model: string): string[] => [])
export const getExtraBodyParamsFeatures = memoize((_model: string): string[] => [])

export function getMergedApiHeaders(
  model: string,
  _options?: { isAgenticQuery?: boolean },
): string[] {
  return [...getModelApiHeaders(model), ...(getSdkApiHeaders() ?? [])]
}

export function clearModelApiHeaderCaches(): void {
  getAllModelApiHeaders.cache.clear?.()
  getModelApiHeaders.cache.clear?.()
  getExtraBodyParamsFeatures.cache.clear?.()
}
