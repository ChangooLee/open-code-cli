import * as React from 'react';
import type { LocalJSXCommandContext } from '../../commands.js';
import { getOauthProfileFromOauthToken } from '../../services/oauth/getOauthProfile.js';
import type { LocalJSXCommandOnDone } from '../../types/command.js';
import { getOpenCodeCliOAuthTokens, isOpenCodeCliSubscriber } from '../../utils/auth.js';
import { openBrowser } from '../../utils/browser.js';
import { logError } from '../../utils/log.js';
import { Login } from '../login/login.js';
export async function call(onDone: LocalJSXCommandOnDone, context: LocalJSXCommandContext): Promise<React.ReactNode | null> {
    try {
        if (isOpenCodeCliSubscriber()) {
            const tokens = getOpenCodeCliOAuthTokens();
            let isMax20x = false;
            if (tokens?.subscriptionType && tokens?.rateLimitTier) {
                isMax20x = tokens.subscriptionType === 'max' && tokens.rateLimitTier === 'default_open_code_cli_max_20x';
            }
            else if (tokens?.accessToken) {
                const profile = await getOauthProfileFromOauthToken(tokens.accessToken);
                isMax20x = profile?.organization?.organization_type === 'open_code_cli_max' && profile?.organization?.rate_limit_tier === 'default_open_code_cli_max_20x';
            }
            if (isMax20x) {
                setTimeout(onDone, 0, 'You are already on the highest Max subscription plan. For additional usage, run /login to switch to an API usage-billed account.');
                return null;
            }
        }
        const url = 'https://Open Code CLI/upgrade/max';
        await openBrowser(url);
        return <Login startingMessage={'Starting new login following /upgrade. Exit with Ctrl-C to use existing account.'} onDone={success => {
                context.onChangeAPIKey();
                onDone(success ? 'Login successful' : 'Login interrupted');
            }}/>;
    }
    catch (error) {
        logError(error as Error);
        setTimeout(onDone, 0, 'Failed to open browser. Please visit https://Open Code CLI/upgrade/max to upgrade.');
    }
    return null;
}
