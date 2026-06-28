export const PRODUCT_URL = 'https://open-code-cli.dev';
export const OPEN_CODE_CLI_REMOTE_BASE_URL = 'https://open-code-cli.dev';
export const OPEN_CODE_CLI_REMOTE_STAGING_BASE_URL = 'https://staging.open-code-cli.dev';
export const OPEN_CODE_CLI_REMOTE_LOCAL_BASE_URL = 'http://localhost:4000';
export function isRemoteSessionStaging(sessionId?: string, ingressUrl?: string): boolean {
    return (sessionId?.includes('_staging_') === true ||
        ingressUrl?.includes('staging') === true);
}
export function isRemoteSessionLocal(sessionId?: string, ingressUrl?: string): boolean {
    return (sessionId?.includes('_local_') === true ||
        ingressUrl?.includes('localhost') === true);
}
export function getOpenCodeCliRemoteBaseUrl(sessionId?: string, ingressUrl?: string): string {
    if (isRemoteSessionLocal(sessionId, ingressUrl)) {
        return OPEN_CODE_CLI_REMOTE_LOCAL_BASE_URL;
    }
    if (isRemoteSessionStaging(sessionId, ingressUrl)) {
        return OPEN_CODE_CLI_REMOTE_STAGING_BASE_URL;
    }
    return OPEN_CODE_CLI_REMOTE_BASE_URL;
}
export function getRemoteSessionUrl(sessionId: string, ingressUrl?: string): string {
    const { toCompatSessionId } = require('../bridge/sessionIdCompat.js') as typeof import('../bridge/sessionIdCompat.js');
    const compatId = toCompatSessionId(sessionId);
    const baseUrl = getOpenCodeCliRemoteBaseUrl(compatId, ingressUrl);
    return `${baseUrl}/code/${compatId}`;
}
