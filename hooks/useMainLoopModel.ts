import { useEffect, useReducer } from 'react'
import { onFeatureFlagsRefresh } from '../services/analytics/featureFlags.js'
import { useAppState } from '../state/AppState.js'
import {
  getDefaultMainLoopModelSetting,
  type ModelName,
  parseUserSpecifiedModel,
} from '../utils/model/model.js'
export function useMainLoopModel(): ModelName {
  const mainLoopModel = useAppState(s => s.mainLoopModel)
  const mainLoopModelForSession = useAppState(s => s.mainLoopModelForSession)
  const [, forceRerender] = useReducer(x => x + 1, 0)
  useEffect(() => onFeatureFlagsRefresh(forceRerender), [])
  const model = parseUserSpecifiedModel(
    mainLoopModelForSession ??
      mainLoopModel ??
      getDefaultMainLoopModelSetting(),
  )
  return model
}
