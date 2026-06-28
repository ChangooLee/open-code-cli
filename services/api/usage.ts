import axios from 'axios';
import { getOauthConfig } from '../../constants/oauth.js';
import { getOpenCodeCliOAuthTokens, hasProfileScope, isOpenCodeCliSubscriber, } from '../../utils/auth.js';
import { getAuthHeaders } from '../../utils/http.js';
import { getOpenCodeCliUserAgent } from '../../utils/userAgent.js';
import { isOAuthTokenExpired } from '../oauth/client.js';
export type RateLimit = {
    utilization: number | null;
    resets_at: string | null;
};
export type ExtraUsage = {
    is_enabled: boolean;
    monthly_limit: number | null;
    used_credits: number | null;
    utilization: number | null;
};
export type Utilization = {
    five_hour?: RateLimit | null;
    seven_day?: RateLimit | null;
    seven_day_oauth_apps?: RateLimit | null;
    seven_day_opus?: RateLimit | null;
    seven_day_sonnet?: RateLimit | null;
    extra_usage?: ExtraUsage | null;
};
export async function fetchUtilization(): Promise<Utilization | null> {
    if (!isOpenCodeCliSubscriber() || !hasProfileScope()) {
        return {};
    }
    const tokens = getOpenCodeCliOAuthTokens();
    if (tokens && isOAuthTokenExpired(tokens.expiresAt)) {
        return null;
    }
    const authResult = getAuthHeaders();
    if (authResult.error) {
        throw new Error(`Auth error: ${authResult.error}`);
    }
    const headers = {
        'Content-Type': 'application/json',
        'User-Agent': getOpenCodeCliUserAgent(),
        ...authResult.headers,
    };
    const url = `${getOauthConfig().BASE_API_URL}/api/oauth/usage`;
    const response = await axios.get<Utilization>(url, {
        headers,
        timeout: 5000,
    });
    return response.data;
}
