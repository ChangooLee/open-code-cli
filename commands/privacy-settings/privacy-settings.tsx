import * as React from 'react';
import { type MetricsHubDecision, MetricsHubDialog, PrivacySettingsDialog } from '../../components/metricsHub/MetricsHub.js';
import { type AnalyticsScalarMetadata, logEvent } from '../../services/analytics/index.js';
import { getMetricsHubNoticeConfig, getMetricsHubSettings, isQualifiedForMetricsHub } from '../../services/api/metricsHub.js';
import type { LocalJSXCommandOnDone } from '../../types/command.js';
const FALLBACK_MESSAGE = 'Review and manage your privacy settings at https://open-code-cli.dev/settings/data-privacy-controls';
export async function call(onDone: LocalJSXCommandOnDone): Promise<React.ReactNode | null> {
    const qualified = await isQualifiedForMetricsHub();
    if (!qualified) {
        onDone(FALLBACK_MESSAGE);
        return null;
    }
    const [settingsResult, configResult] = await Promise.all([getMetricsHubSettings(), getMetricsHubNoticeConfig()]);
    if (!settingsResult.success) {
        onDone(FALLBACK_MESSAGE);
        return null;
    }
    const settings = settingsResult.data;
    const config = configResult.success ? configResult.data : null;
    async function onDoneWithDecision(decision: MetricsHubDecision) {
        if (decision === 'escape' || decision === 'defer') {
            onDone('Privacy settings dialog dismissed', {
                display: 'system'
            });
            return;
        }
        await onDoneWithSettingsCheck();
    }
    async function onDoneWithSettingsCheck() {
        const updatedSettingsResult = await getMetricsHubSettings();
        if (!updatedSettingsResult.success) {
            onDone('Unable to retrieve updated privacy settings', {
                display: 'system'
            });
            return;
        }
        const updatedSettings = updatedSettingsResult.data;
        const metricsHubStatus = updatedSettings.metrics_hub_enabled ? 'true' : 'false';
        onDone(`"Help improve Open Code CLI" set to ${metricsHubStatus}.`);
        if (settings.metrics_hub_enabled !== null && settings.metrics_hub_enabled !== updatedSettings.metrics_hub_enabled) {
            logEvent('open_code_cli_metrics_hub_policy_toggled', {
                state: updatedSettings.metrics_hub_enabled as AnalyticsScalarMetadata,
                location: 'settings' as AnalyticsScalarMetadata
            });
        }
    }
    if (settings.metrics_hub_enabled !== null) {
        return <PrivacySettingsDialog settings={settings} domainExcluded={config?.domain_excluded} onDone={onDoneWithSettingsCheck}></PrivacySettingsDialog>;
    }
    return <MetricsHubDialog showIfAlreadyViewed={true} onDone={onDoneWithDecision} location={'settings'}/>;
}
