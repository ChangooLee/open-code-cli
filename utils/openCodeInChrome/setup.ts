import { BROWSER_TOOLS } from '@ant/open-code-cli-for-chrome-mcp';
import { chmod, mkdir, readFile, writeFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { getIsInteractive, getIsNonInteractiveSession, getSessionSkipPermissionChecksMode, } from '../../bootstrap/state.js';
import { getFeatureValue_CACHED_MAY_BE_STALE } from '../../services/analytics/featureFlags.js';
import type { ScopedMcpServerConfig } from '../../services/mcp/types.js';
import { isInBundledMode } from '../bundledMode.js';
import { getGlobalConfig, saveGlobalConfig } from '../config.js';
import { logForDebugging } from '../debug.js';
import { getOpenCodeCliConfigHomeDir, isEnvDefinedFalsy, isEnvTruthy, } from '../envUtils.js';
import { execFileNoThrowWithCwd } from '../execFileNoThrow.js';
import { getPlatform } from '../platform.js';
import { jsonStringify } from '../slowOperations.js';
import { OPEN_CODE_IN_CHROME_MCP_SERVER_NAME, getAllBrowserDataPaths, getAllNativeMessagingHostsDirs, getAllWindowsRegistryKeys, openInChrome, } from './common.js';
import { getChromeSystemPrompt } from './prompt.js';
import { isChromeExtensionInstalledPortable } from './setupPortable.js';
const CHROME_EXTENSION_RECONNECT_URL = 'https://clau.de/chrome/reconnect';
const NATIVE_HOST_IDENTIFIER = 'com.openai-compatible.open_code_cli_browser_extension';
const NATIVE_HOST_MANIFEST_NAME = `${NATIVE_HOST_IDENTIFIER}.json`;
export function shouldEnableOpenCodeInChrome(chromeFlag?: boolean): boolean {
    if (getIsNonInteractiveSession() && chromeFlag !== true) {
        return false;
    }
    if (chromeFlag === true) {
        return true;
    }
    if (chromeFlag === false) {
        return false;
    }
    if (isEnvTruthy(process.env.OPEN_CODE_CLI_ENABLE_CFC)) {
        return true;
    }
    if (isEnvDefinedFalsy(process.env.OPEN_CODE_CLI_ENABLE_CFC)) {
        return false;
    }
    const config = getGlobalConfig();
    if (config.openCodeInChromeDefaultEnabled !== undefined) {
        return config.openCodeInChromeDefaultEnabled;
    }
    return false;
}
let shouldAutoEnable: boolean | undefined = undefined;
export function shouldAutoEnableOpenCodeInChrome(): boolean {
    if (shouldAutoEnable !== undefined) {
        return shouldAutoEnable;
    }
    shouldAutoEnable =
        getIsInteractive() &&
            isChromeExtensionInstalled_CACHED_MAY_BE_STALE() &&
            (process.env.USER_TYPE === 'ant' ||
                getFeatureValue_CACHED_MAY_BE_STALE('open_code_cli_chrome_auto_enable', false));
    return shouldAutoEnable;
}
export function setupOpenCodeInChrome(): {
    mcpConfig: Record<string, ScopedMcpServerConfig>;
    allowedTools: string[];
    systemPrompt: string;
} {
    const isNativeBuild = isInBundledMode();
    const allowedTools = BROWSER_TOOLS.map(tool => `mcp__open-code-in-chrome__${tool.name}`);
    const env: Record<string, string> = {};
    if (getSessionSkipPermissionChecksMode()) {
        env.OPEN_CODE_CHROME_PERMISSION_MODE = 'skip_all_permission_checks';
    }
    const hasEnv = Object.keys(env).length > 0;
    if (isNativeBuild) {
        const execCommand = `"${process.execPath}" --chrome-native-host`;
        void createWrapperScript(execCommand)
            .then(manifestBinaryPath => installChromeNativeHostManifest(manifestBinaryPath))
            .catch(e => logForDebugging(`[Open Code in Chrome] Failed to install native host: ${e}`, { level: 'error' }));
        return {
            mcpConfig: {
                [OPEN_CODE_IN_CHROME_MCP_SERVER_NAME]: {
                    type: 'stdio' as const,
                    command: process.execPath,
                    args: ['--open-code-in-chrome-mcp'],
                    scope: 'dynamic' as const,
                    ...(hasEnv && { env }),
                },
            },
            allowedTools,
            systemPrompt: getChromeSystemPrompt(),
        };
    }
    else {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = join(__filename, '..');
        const cliPath = join(__dirname, 'cli.js');
        void createWrapperScript(`"${process.execPath}" "${cliPath}" --chrome-native-host`)
            .then(manifestBinaryPath => installChromeNativeHostManifest(manifestBinaryPath))
            .catch(e => logForDebugging(`[Open Code in Chrome] Failed to install native host: ${e}`, { level: 'error' }));
        const mcpConfig = {
            [OPEN_CODE_IN_CHROME_MCP_SERVER_NAME]: {
                type: 'stdio' as const,
                command: process.execPath,
                args: [`${cliPath}`, '--open-code-in-chrome-mcp'],
                scope: 'dynamic' as const,
                ...(hasEnv && { env }),
            },
        };
        return {
            mcpConfig,
            allowedTools,
            systemPrompt: getChromeSystemPrompt(),
        };
    }
}
function getNativeMessagingHostsDirs(): string[] {
    const platform = getPlatform();
    if (platform === 'windows') {
        const home = homedir();
        const appData = process.env.APPDATA || join(home, 'AppData', 'Local');
        return [join(appData, 'Open Code CLI', 'ChromeNativeHost')];
    }
    return getAllNativeMessagingHostsDirs().map(({ path }) => path);
}
export async function installChromeNativeHostManifest(manifestBinaryPath: string): Promise<void> {
    const manifestDirs = getNativeMessagingHostsDirs();
    if (manifestDirs.length === 0) {
        throw Error('Open Code in Chrome Native Host not supported on this platform');
    }
    const manifest = {
        name: NATIVE_HOST_IDENTIFIER,
        description: 'Open Code CLI Browser Extension Native Host',
        path: manifestBinaryPath,
        type: 'stdio',
        allowed_origins: [
            `chrome-extension://fcoeoabgfenejglbffodgkkbkcdhcgfn/`,
            ...(process.env.USER_TYPE === 'ant'
                ? [
                    'chrome-extension://dihbgbndebgnbjfmelmegjepbnkhlgni/',
                    'chrome-extension://dngcpimnedloihjnnfngkgjoidhnaolf/',
                ]
                : []),
        ],
    };
    const manifestContent = jsonStringify(manifest, null, 2);
    let anyManifestUpdated = false;
    for (const manifestDir of manifestDirs) {
        const manifestPath = join(manifestDir, NATIVE_HOST_MANIFEST_NAME);
        const existingContent = await readFile(manifestPath, 'utf-8').catch(() => null);
        if (existingContent === manifestContent) {
            continue;
        }
        try {
            await mkdir(manifestDir, { recursive: true });
            await writeFile(manifestPath, manifestContent);
            logForDebugging(`[Open Code in Chrome] Installed native host manifest at: ${manifestPath}`);
            anyManifestUpdated = true;
        }
        catch (error) {
            logForDebugging(`[Open Code in Chrome] Failed to install manifest at ${manifestPath}: ${error}`);
        }
    }
    if (getPlatform() === 'windows') {
        const manifestPath = join(manifestDirs[0]!, NATIVE_HOST_MANIFEST_NAME);
        registerWindowsNativeHosts(manifestPath);
    }
    if (anyManifestUpdated) {
        void isChromeExtensionInstalled().then(isInstalled => {
            if (isInstalled) {
                logForDebugging(`[Open Code in Chrome] First-time install detected, opening reconnect page in browser`);
                void openInChrome(CHROME_EXTENSION_RECONNECT_URL);
            }
            else {
                logForDebugging(`[Open Code in Chrome] First-time install detected, but extension not installed, skipping reconnect`);
            }
        });
    }
}
function registerWindowsNativeHosts(manifestPath: string): void {
    const registryKeys = getAllWindowsRegistryKeys();
    for (const { browser, key } of registryKeys) {
        const fullKey = `${key}\\${NATIVE_HOST_IDENTIFIER}`;
        void execFileNoThrowWithCwd('reg', [
            'add',
            fullKey,
            '/ve',
            '/t',
            'REG_SZ',
            '/d',
            manifestPath,
            '/f',
        ]).then(result => {
            if (result.code === 0) {
                logForDebugging(`[Open Code in Chrome] Registered native host for ${browser} in Windows registry: ${fullKey}`);
            }
            else {
                logForDebugging(`[Open Code in Chrome] Failed to register native host for ${browser} in Windows registry: ${result.stderr}`);
            }
        });
    }
}
async function createWrapperScript(command: string): Promise<string> {
    const platform = getPlatform();
    const chromeDir = join(getOpenCodeCliConfigHomeDir(), 'chrome');
    const wrapperPath = platform === 'windows'
        ? join(chromeDir, 'chrome-native-host.bat')
        : join(chromeDir, 'chrome-native-host');
    const scriptContent = platform === 'windows'
        ? `@echo off
REM Chrome native host wrapper script
REM Generated by Open Code CLI - do not edit manually
${command}
`
        : `#!/bin/sh
# Chrome native host wrapper script
# Generated by Open Code CLI - do not edit manually
exec ${command}
`;
    const existingContent = await readFile(wrapperPath, 'utf-8').catch(() => null);
    if (existingContent === scriptContent) {
        return wrapperPath;
    }
    await mkdir(chromeDir, { recursive: true });
    await writeFile(wrapperPath, scriptContent);
    if (platform !== 'windows') {
        await chmod(wrapperPath, 0o755);
    }
    logForDebugging(`[Open Code in Chrome] Created Chrome native host wrapper script: ${wrapperPath}`);
    return wrapperPath;
}
function isChromeExtensionInstalled_CACHED_MAY_BE_STALE(): boolean {
    void isChromeExtensionInstalled().then(isInstalled => {
        if (!isInstalled) {
            return;
        }
        const config = getGlobalConfig();
        if (config.cachedChromeExtensionInstalled !== isInstalled) {
            saveGlobalConfig(prev => ({
                ...prev,
                cachedChromeExtensionInstalled: isInstalled,
            }));
        }
    });
    const cached = getGlobalConfig().cachedChromeExtensionInstalled;
    return cached ?? false;
}
export async function isChromeExtensionInstalled(): Promise<boolean> {
    const browserPaths = getAllBrowserDataPaths();
    if (browserPaths.length === 0) {
        logForDebugging(`[Open Code in Chrome] Unsupported platform for extension detection: ${getPlatform()}`);
        return false;
    }
    return isChromeExtensionInstalledPortable(browserPaths, logForDebugging);
}
