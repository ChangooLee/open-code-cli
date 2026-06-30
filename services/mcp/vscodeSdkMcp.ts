import { logForDebugging } from 'src/utils/debug.js'
import { z } from 'zod/v4'
import { lazySchema } from '../../utils/lazySchema.js'
import {
  checkStatsigFeatureGate_CACHED_MAY_BE_STALE,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from '../analytics/featureFlags.js'
import { logEvent } from '../analytics/index.js'
import type { ConnectedMCPServer, MCPServerConnection } from './types.js'
type AutoModeEnabledState = 'enabled' | 'disabled' | 'opt-in'
function readAutoModeEnabledState(): AutoModeEnabledState | undefined {
  const v = getFeatureValue_CACHED_MAY_BE_STALE<{ enabled?: string }>(
    'open_code_cli_auto_mode_config',
    {},
  )?.enabled
  return v === 'enabled' || v === 'disabled' || v === 'opt-in' ? v : undefined
}
export const LogEventNotificationSchema = lazySchema(() =>
  z.object({
    method: z.literal('log_event'),
    params: z.object({
      eventName: z.string(),
      eventData: z.object({}).passthrough(),
    }),
  }),
)
let vscodeMcpClient: ConnectedMCPServer | null = null
export function notifyVscodeFileUpdated(
  filePath: string,
  oldContent: string | null,
  newContent: string | null,
): void {
  if (process.env.USER_TYPE !== 'ant' || !vscodeMcpClient) {
    return
  }
  void vscodeMcpClient.client
    .notification({
      method: 'file_updated',
      params: { filePath, oldContent, newContent },
    })
    .catch((error: Error) => {
      logForDebugging(
        `[VSCode] Failed to send file_updated notification: ${error.message}`,
      )
    })
}
export function setupVscodeSdkMcp(sdkClients: MCPServerConnection[]): void {
  const client = sdkClients.find(client => client.name === 'open-code-cli-vscode')
  if (client && client.type === 'connected') {
    vscodeMcpClient = client
    client.client.setNotificationHandler(
      LogEventNotificationSchema(),
      async notification => {
        const { eventName, eventData } = notification.params
        logEvent(
          `open_code_cli_vscode_${eventName}`,
          eventData as { [key: string]: boolean | number | undefined },
        )
      },
    )
    const gates: Record<string, boolean | string> = {
      open_code_cli_vscode_review_upsell: checkStatsigFeatureGate_CACHED_MAY_BE_STALE(
        'open_code_cli_vscode_review_upsell',
      ),
      open_code_cli_vscode_onboarding: checkStatsigFeatureGate_CACHED_MAY_BE_STALE(
        'open_code_cli_vscode_onboarding',
      ),
      open_code_cli_quiet_fern: getFeatureValue_CACHED_MAY_BE_STALE(
        'open_code_cli_quiet_fern',
        false,
      ),
      open_code_cli_vscode_cc_auth: getFeatureValue_CACHED_MAY_BE_STALE(
        'open_code_cli_vscode_cc_auth',
        false,
      ),
    }
    const autoModeState = readAutoModeEnabledState()
    if (autoModeState !== undefined) {
      gates.open_code_cli_auto_mode_state = autoModeState
    }
    void client.client.notification({
      method: 'experiment_gates',
      params: { gates },
    })
  }
}
