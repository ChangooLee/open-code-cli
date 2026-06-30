import * as React from 'react';
import { clearTrustedDeviceTokenCache } from '../../bridge/trustedDevice.js';
import { Text } from '../../ink.js';
import { refreshFeatureFlagsAfterAuthChange } from '../../services/analytics/featureFlags.js';
import { getMetricsHubNoticeConfig, getMetricsHubSettings } from '../../services/api/metricsHub.js';
import { clearPolicyLimitsCache } from '../../services/policyLimits/index.js';
import { clearRemoteManagedSettingsCache } from '../../services/remoteManagedSettings/index.js';
import { getOpenCodeCliOAuthTokens, removeApiKey } from '../../utils/auth.js';
import { clearModelApiHeaderCaches } from '../../utils/modelApiHeaders.js';
import { saveGlobalConfig } from '../../utils/config.js';
import { gracefulShutdownSync } from '../../utils/gracefulShutdown.js';
import { getSecureStorage } from '../../utils/secureStorage/index.js';
import { clearToolSchemaCache } from '../../utils/toolSchemaCache.js';
import { resetUserCache } from '../../utils/user.js';
export async function performLogout({
  clearOnboarding = false
}): Promise<void> {
  const {
    flushTelemetry
  } = await import('../../utils/telemetry/instrumentation.js');
  await flushTelemetry();
  await removeApiKey();
  const secureStorage = getSecureStorage();
  secureStorage.delete();
  await clearAuthRelatedCaches();
  saveGlobalConfig(current => {
    const updated = {
      ...current
    };
    if (clearOnboarding) {
      updated.hasCompletedOnboarding = false;
      updated.subscriptionNoticeCount = 0;
      updated.hasAvailableSubscription = false;
      if (updated.customApiKeyResponses?.approved) {
        updated.customApiKeyResponses = {
          ...updated.customApiKeyResponses,
          approved: []
        };
      }
    }
    updated.oauthAccount = undefined;
    return updated;
  });
}
export async function clearAuthRelatedCaches(): Promise<void> {
  getOpenCodeCliOAuthTokens.cache?.clear?.();
  clearTrustedDeviceTokenCache();
  clearModelApiHeaderCaches();
  clearToolSchemaCache();
  resetUserCache();
  refreshFeatureFlagsAfterAuthChange();
  getMetricsHubNoticeConfig.cache?.clear?.();
  getMetricsHubSettings.cache?.clear?.();
  await clearRemoteManagedSettingsCache();
  await clearPolicyLimitsCache();
}
export async function call(): Promise<React.ReactNode> {
  await performLogout({
    clearOnboarding: true
  });
  const message = <Text>Successfully logged out from your Open Code CLI account.</Text>;
  setTimeout(() => {
    gracefulShutdownSync(0, 'logout');
  }, 200);
  return message;
}
