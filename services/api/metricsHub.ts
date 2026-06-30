import axios from 'axios';
import memoize from 'lodash-es/memoize.js';
import { type AnalyticsScalarMetadata, logEvent, } from 'src/services/analytics/index.js';
import { getOauthAccountInfo, isConsumerSubscriber } from 'src/utils/auth.js';
import { logForDebugging } from 'src/utils/debug.js';
import { gracefulShutdown } from 'src/utils/gracefulShutdown.js';
import { isEssentialTrafficOnly } from 'src/utils/privacyLevel.js';
import { writeToStderr } from 'src/utils/process.js';
import { getOauthConfig } from '../../constants/oauth.js';
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js';
import { getAuthHeaders, getUserAgent, withOAuth401Retry, } from '../../utils/http.js';
import { logError } from '../../utils/log.js';
import { getOpenCodeCliUserAgent } from '../../utils/userAgent.js';
const METRICS_HUB_CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000;
export type AccountSettings = {
    metrics_hub_enabled: boolean | null;
    metrics_hub_notice_viewed_at: string | null;
};
export type MetricsHubConfig = {
    metrics_hub_enabled: boolean;
    domain_excluded: boolean;
    notice_is_grace_period: boolean;
    notice_reminder_frequency: number | null;
};
export type ApiResult<T> = {
    success: true;
    data: T;
} | {
    success: false;
};
export const getMetricsHubSettings = memoize(async (): Promise<ApiResult<AccountSettings>> => {
    if (isEssentialTrafficOnly()) {
        return { success: false };
    }
    try {
        const response = await withOAuth401Retry(() => {
            const authHeaders = getAuthHeaders();
            if (authHeaders.error) {
                throw new Error(`Failed to get auth headers: ${authHeaders.error}`);
            }
            return axios.get<AccountSettings>(`${getOauthConfig().BASE_API_URL}/api/oauth/account/settings`, {
                headers: {
                    ...authHeaders.headers,
                    'User-Agent': getOpenCodeCliUserAgent(),
                },
            });
        });
        return { success: true, data: response.data };
    }
    catch (err) {
        logError(err);
        getMetricsHubSettings.cache.clear?.();
        return { success: false };
    }
});
export async function markMetricsHubNoticeViewed(): Promise<void> {
    try {
        await withOAuth401Retry(() => {
            const authHeaders = getAuthHeaders();
            if (authHeaders.error) {
                throw new Error(`Failed to get auth headers: ${authHeaders.error}`);
            }
            return axios.post(`${getOauthConfig().BASE_API_URL}/api/oauth/account/metrics_hub_notice_viewed`, {}, {
                headers: {
                    ...authHeaders.headers,
                    'User-Agent': getOpenCodeCliUserAgent(),
                },
            });
        });
        getMetricsHubSettings.cache.clear?.();
    }
    catch (err) {
        logError(err);
    }
}
export async function updateMetricsHubSettings(metricsHubEnabled: boolean): Promise<void> {
    try {
        await withOAuth401Retry(() => {
            const authHeaders = getAuthHeaders();
            if (authHeaders.error) {
                throw new Error(`Failed to get auth headers: ${authHeaders.error}`);
            }
            return axios.patch(`${getOauthConfig().BASE_API_URL}/api/oauth/account/settings`, {
                metrics_hub_enabled: metricsHubEnabled,
            }, {
                headers: {
                    ...authHeaders.headers,
                    'User-Agent': getOpenCodeCliUserAgent(),
                },
            });
        });
        getMetricsHubSettings.cache.clear?.();
    }
    catch (err) {
        logError(err);
    }
}
export async function isQualifiedForMetricsHub(): Promise<boolean> {
    if (!isConsumerSubscriber()) {
        return false;
    }
    const accountId = getOauthAccountInfo()?.accountUuid;
    if (!accountId) {
        return false;
    }
    const globalConfig = getGlobalConfig();
    const cachedEntry = globalConfig.metricsHubConfigCache?.[accountId];
    const now = Date.now();
    if (!cachedEntry) {
        logForDebugging('MetricsHub: No cache, fetching config in background (dialog skipped this session)');
        void fetchAndStoreMetricsHubConfig(accountId);
        return false;
    }
    if (now - cachedEntry.timestamp > METRICS_HUB_CACHE_EXPIRATION_MS) {
        logForDebugging('MetricsHub: Cache stale, returning cached data and refreshing in background');
        void fetchAndStoreMetricsHubConfig(accountId);
        return cachedEntry.metrics_hub_enabled;
    }
    logForDebugging('MetricsHub: Using fresh cached config');
    return cachedEntry.metrics_hub_enabled;
}
async function fetchAndStoreMetricsHubConfig(accountId: string): Promise<void> {
    try {
        const result = await getMetricsHubNoticeConfig();
        if (!result.success) {
            return;
        }
        const metricsHubEnabled = result.data.metrics_hub_enabled;
        const cachedEntry = getGlobalConfig().metricsHubConfigCache?.[accountId];
        if (cachedEntry?.metrics_hub_enabled === metricsHubEnabled &&
            Date.now() - cachedEntry!.timestamp <= METRICS_HUB_CACHE_EXPIRATION_MS) {
            return;
        }
        saveGlobalConfig(current => ({
            ...current,
            metricsHubConfigCache: {
                ...current.metricsHubConfigCache,
                [accountId]: {
                    metrics_hub_enabled: metricsHubEnabled,
                    timestamp: Date.now(),
                },
            },
        }));
    }
    catch (err) {
        logForDebugging(`MetricsHub: Failed to fetch and store config: ${err}`);
    }
}
export const getMetricsHubNoticeConfig = memoize(async (): Promise<ApiResult<MetricsHubConfig>> => {
    if (isEssentialTrafficOnly()) {
        return { success: false };
    }
    try {
        const response = await withOAuth401Retry(() => {
            const authHeaders = getAuthHeaders();
            if (authHeaders.error) {
                throw new Error(`Failed to get auth headers: ${authHeaders.error}`);
            }
            return axios.get<MetricsHubConfig>(`${getOauthConfig().BASE_API_URL}/api/open_code_cli_metrics_hub`, {
                headers: {
                    ...authHeaders.headers,
                    'User-Agent': getUserAgent(),
                },
                timeout: 3000,
            });
        });
        const { metrics_hub_enabled, domain_excluded, notice_is_grace_period, notice_reminder_frequency, } = response.data;
        return {
            success: true,
            data: {
                metrics_hub_enabled,
                domain_excluded: domain_excluded ?? false,
                notice_is_grace_period: notice_is_grace_period ?? true,
                notice_reminder_frequency,
            },
        };
    }
    catch (err) {
        logForDebugging(`Failed to fetch MetricsHub notice config: ${err}`);
        return { success: false };
    }
});
export function calculateShouldShowMetricsHub(settingsResult: ApiResult<AccountSettings>, configResult: ApiResult<MetricsHubConfig>, showIfAlreadyViewed: boolean): boolean {
    if (!settingsResult.success || !configResult.success) {
        return false;
    }
    const settings = settingsResult.data;
    const config = configResult.data;
    const hasChosen = settings.metrics_hub_enabled !== null;
    if (hasChosen) {
        return false;
    }
    if (showIfAlreadyViewed) {
        return true;
    }
    if (!config.notice_is_grace_period) {
        return true;
    }
    const reminderFrequency = config.notice_reminder_frequency;
    if (reminderFrequency !== null && settings.metrics_hub_notice_viewed_at) {
        const daysSinceViewed = Math.floor((Date.now() - new Date(settings.metrics_hub_notice_viewed_at).getTime()) /
            (1000 * 60 * 60 * 24));
        return daysSinceViewed >= reminderFrequency;
    }
    else {
        const viewedAt = settings.metrics_hub_notice_viewed_at;
        return viewedAt === null || viewedAt === undefined;
    }
}
export async function checkMetricsHubForNonInteractive(): Promise<void> {
    const [settingsResult, configResult] = await Promise.all([
        getMetricsHubSettings(),
        getMetricsHubNoticeConfig(),
    ]);
    const shouldShowMetricsHub = calculateShouldShowMetricsHub(settingsResult, configResult, false);
    if (shouldShowMetricsHub) {
        const config = configResult.success ? configResult.data : null;
        logEvent('open_code_cli_metrics_hub_print_viewed', {
            dismissable: config?.notice_is_grace_period as AnalyticsScalarMetadata,
        });
        if (config === null || config.notice_is_grace_period) {
            writeToStderr('\nAn update to our Consumer Terms and Privacy Policy will take effect on October 8, 2025. Run `open-code-cli` to review the updated terms.\n\n');
            await markMetricsHubNoticeViewed();
        }
        else {
            writeToStderr('\n[ACTION REQUIRED] An update to our Consumer Terms and Privacy Policy has taken effect on October 8, 2025. You must run `open-code-cli` to review the updated terms.\n\n');
            await gracefulShutdown(1);
        }
    }
}
