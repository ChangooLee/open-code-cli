import { feature } from 'bun:bundle'
import { useEffect, useRef } from 'react'
import {
  type AppState,
  useAppState,
  useAppStateStore,
  useSetAppState,
} from 'src/state/AppState.js'
import type { ToolPermissionContext } from 'src/Tool.js'
import { getIsRemoteMode } from '../../bootstrap/state.js'
import {
  createDisabledSkipPermissionChecksContext,
  shouldDisableSkipPermissionChecks,
  verifyAutoModeGateAccess,
} from './permissionSetup.js'
let skipPermissionChecksCheckRan = false
export async function checkAndDisableSkipPermissionChecksIfNeeded(
  toolPermissionContext: ToolPermissionContext,
  setAppState: (f: (prev: AppState) => AppState) => void,
): Promise<void> {
  if (skipPermissionChecksCheckRan) {
    return
  }
  skipPermissionChecksCheckRan = true
  if (!toolPermissionContext.isSkipPermissionChecksModeAvailable) {
    return
  }
  const shouldDisable = await shouldDisableSkipPermissionChecks()
  if (!shouldDisable) {
    return
  }
  setAppState(prev => {
    return {
      ...prev,
      toolPermissionContext: createDisabledSkipPermissionChecksContext(
        prev.toolPermissionContext,
      ),
    }
  })
}
export function resetSkipPermissionChecksCheck(): void {
  skipPermissionChecksCheckRan = false
}
export function useKickOffCheckAndDisableSkipPermissionChecksIfNeeded(): void {
  const toolPermissionContext = useAppState(s => s.toolPermissionContext)
  const setAppState = useSetAppState()
  useEffect(() => {
    if (getIsRemoteMode()) return
    void checkAndDisableSkipPermissionChecksIfNeeded(
      toolPermissionContext,
      setAppState,
    )
  }, [])
}
let autoModeCheckRan = false
export async function checkAndDisableAutoModeIfNeeded(
  toolPermissionContext: ToolPermissionContext,
  setAppState: (f: (prev: AppState) => AppState) => void,
  fastMode?: boolean,
): Promise<void> {
  if (feature('TRANSCRIPT_CLASSIFIER')) {
    if (autoModeCheckRan) {
      return
    }
    autoModeCheckRan = true
    const { updateContext, notification } = await verifyAutoModeGateAccess(
      toolPermissionContext,
      fastMode,
    )
    setAppState(prev => {
      const nextCtx = updateContext(prev.toolPermissionContext)
      const newState =
        nextCtx === prev.toolPermissionContext
          ? prev
          : { ...prev, toolPermissionContext: nextCtx }
      if (!notification) return newState
      return {
        ...newState,
        notifications: {
          ...newState.notifications,
          queue: [
            ...newState.notifications.queue,
            {
              key: 'auto-mode-gate-notification',
              text: notification,
              color: 'warning' as const,
              priority: 'high' as const,
            },
          ],
        },
      }
    })
  }
}
export function resetAutoModeGateCheck(): void {
  autoModeCheckRan = false
}
export function useKickOffCheckAndDisableAutoModeIfNeeded(): void {
  const mainLoopModel = useAppState(s => s.mainLoopModel)
  const mainLoopModelForSession = useAppState(s => s.mainLoopModelForSession)
  const fastMode = useAppState(s => s.fastMode)
  const setAppState = useSetAppState()
  const store = useAppStateStore()
  const isFirstRunRef = useRef(true)
  useEffect(() => {
    if (getIsRemoteMode()) return
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false
    } else {
      resetAutoModeGateCheck()
    }
    void checkAndDisableAutoModeIfNeeded(
      store.getState().toolPermissionContext,
      setAppState,
      fastMode,
    )
  }, [mainLoopModel, mainLoopModelForSession, fastMode])
}
