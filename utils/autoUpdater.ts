import axios from 'axios';
import { constants as fsConstants } from 'fs';
import { access, writeFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { getDynamicConfig_BLOCKS_ON_INIT } from 'src/services/analytics/featureFlags.js';
import { type AnalyticsScalarMetadata, logEvent, } from 'src/services/analytics/index.js';
import { type ReleaseChannel, saveGlobalConfig } from './config.js';
import { logForDebugging } from './debug.js';
import { env } from './env.js';
import { getOpenCodeCliConfigHomeDir } from './envUtils.js';
import { OpenCodeCliError, getErrnoCode, isENOENT } from './errors.js';
import { execFileNoThrowWithCwd } from './execFileNoThrow.js';
import { getFsImplementation } from './fsOperations.js';
import { gracefulShutdownSync } from './gracefulShutdown.js';
import { logError } from './log.js';
import { gte, lt } from './semver.js';
import { getInitialSettings } from './settings/settings.js';
import { filterOpenCodeCliAliases, getShellConfigPaths, readFileLines, writeFileLines, } from './shellConfig.js';
import { jsonParse } from './slowOperations.js';
const GCS_BUCKET_URL = 'https://storage.googleapis.com/open-code-cli-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/open-code-cli-releases';
class AutoUpdaterError extends OpenCodeCliError {
}
export type InstallStatus = 'success' | 'no_permissions' | 'install_failed' | 'in_progress';
export type AutoUpdaterResult = {
    version: string | null;
    status: InstallStatus;
    notifications?: string[];
};
export type MaxVersionConfig = {
    external?: string;
    ant?: string;
    external_message?: string;
    ant_message?: string;
};
export async function assertMinVersion(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
        return;
    }
    try {
        const versionConfig = await getDynamicConfig_BLOCKS_ON_INIT<{
            minVersion: string;
        }>('open_code_cli_version_config', { minVersion: '0.0.0' });
        if (versionConfig.minVersion &&
            lt(MACRO.VERSION, versionConfig.minVersion)) {
            console.error(`
It looks like your version of Open Code CLI (${MACRO.VERSION}) needs an update.
A newer version (${versionConfig.minVersion} or higher) is required to continue.
To update, please run:
    open-code-cli update
This will ensure you have access to the latest features and improvements.
`);
            gracefulShutdownSync(1);
        }
    }
    catch (error) {
        logError(error as Error);
    }
}
export async function getMaxVersion(): Promise<string | undefined> {
    const config = await getMaxVersionConfig();
    if (process.env.USER_TYPE === 'ant') {
        return config.ant || undefined;
    }
    return config.external || undefined;
}
export async function getMaxVersionMessage(): Promise<string | undefined> {
    const config = await getMaxVersionConfig();
    if (process.env.USER_TYPE === 'ant') {
        return config.ant_message || undefined;
    }
    return config.external_message || undefined;
}
async function getMaxVersionConfig(): Promise<MaxVersionConfig> {
    try {
        return await getDynamicConfig_BLOCKS_ON_INIT<MaxVersionConfig>('open_code_cli_max_version_config', {});
    }
    catch (error) {
        logError(error as Error);
        return {};
    }
}
export function shouldSkipVersion(targetVersion: string): boolean {
    const settings = getInitialSettings();
    const minimumVersion = settings?.minimumVersion;
    if (!minimumVersion) {
        return false;
    }
    const shouldSkip = !gte(targetVersion, minimumVersion);
    if (shouldSkip) {
        logForDebugging(`Skipping update to ${targetVersion} - below minimumVersion ${minimumVersion}`);
    }
    return shouldSkip;
}
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;
export function getLockFilePath(): string {
    return join(getOpenCodeCliConfigHomeDir(), '.update.lock');
}
async function acquireLock(): Promise<boolean> {
    const fs = getFsImplementation();
    const lockPath = getLockFilePath();
    try {
        const stats = await fs.stat(lockPath);
        const age = Date.now() - stats.mtimeMs;
        if (age < LOCK_TIMEOUT_MS) {
            return false;
        }
        try {
            const recheck = await fs.stat(lockPath);
            if (Date.now() - recheck.mtimeMs < LOCK_TIMEOUT_MS) {
                return false;
            }
            await fs.unlink(lockPath);
        }
        catch (err) {
            if (!isENOENT(err)) {
                logError(err as Error);
                return false;
            }
        }
    }
    catch (err) {
        if (!isENOENT(err)) {
            logError(err as Error);
            return false;
        }
    }
    try {
        await writeFile(lockPath, `${process.pid}`, {
            encoding: 'utf8',
            flag: 'wx',
        });
        return true;
    }
    catch (err) {
        const code = getErrnoCode(err);
        if (code === 'EEXIST') {
            return false;
        }
        if (code === 'ENOENT') {
            try {
                await fs.mkdir(getOpenCodeCliConfigHomeDir());
                await writeFile(lockPath, `${process.pid}`, {
                    encoding: 'utf8',
                    flag: 'wx',
                });
                return true;
            }
            catch (mkdirErr) {
                if (getErrnoCode(mkdirErr) === 'EEXIST') {
                    return false;
                }
                logError(mkdirErr as Error);
                return false;
            }
        }
        logError(err as Error);
        return false;
    }
}
async function releaseLock(): Promise<void> {
    const fs = getFsImplementation();
    const lockPath = getLockFilePath();
    try {
        const lockData = await fs.readFile(lockPath, { encoding: 'utf8' });
        if (lockData === `${process.pid}`) {
            await fs.unlink(lockPath);
        }
    }
    catch (err) {
        if (isENOENT(err)) {
            return;
        }
        logError(err as Error);
    }
}
async function getInstallationPrefix(): Promise<string | null> {
    const isBun = env.isRunningWithBun();
    let prefixResult: { stdout: string; stderr: string; code: number; error?: string | undefined } | null = null;
    if (isBun) {
        prefixResult = await execFileNoThrowWithCwd('bun', ['pm', 'bin', '-g'], {
            cwd: homedir(),
        });
    }
    else {
        prefixResult = await execFileNoThrowWithCwd('npm', ['-g', 'config', 'get', 'prefix'], { cwd: homedir() });
    }
    if (prefixResult.code !== 0) {
        logError(new Error(`Failed to check ${isBun ? 'bun' : 'npm'} permissions`));
        return null;
    }
    return prefixResult.stdout.trim();
}
export async function checkGlobalInstallPermissions(): Promise<{
    hasPermissions: boolean;
    npmPrefix: string | null;
}> {
    try {
        const prefix = await getInstallationPrefix();
        if (!prefix) {
            return { hasPermissions: false, npmPrefix: null };
        }
        try {
            await access(prefix, fsConstants.W_OK);
            return { hasPermissions: true, npmPrefix: prefix };
        }
        catch {
            logError(new AutoUpdaterError('Insufficient permissions for global npm install.'));
            return { hasPermissions: false, npmPrefix: prefix };
        }
    }
    catch (error) {
        logError(error as Error);
        return { hasPermissions: false, npmPrefix: null };
    }
}
export async function getLatestVersion(channel: ReleaseChannel): Promise<string | null> {
    const npmTag = channel === 'stable' ? 'stable' : 'latest';
    const result = await execFileNoThrowWithCwd('npm', ['view', `${MACRO.PACKAGE_URL}@${npmTag}`, 'version', '--prefer-online'], { abortSignal: AbortSignal.timeout(5000), cwd: homedir() });
    if (result.code !== 0) {
        logForDebugging(`npm view failed with code ${result.code}`);
        if (result.stderr) {
            logForDebugging(`npm stderr: ${result.stderr.trim()}`);
        }
        else {
            logForDebugging('npm stderr: (empty)');
        }
        if (result.stdout) {
            logForDebugging(`npm stdout: ${result.stdout.trim()}`);
        }
        return null;
    }
    return result.stdout.trim();
}
export type NpmDistTags = {
    latest: string | null;
    stable: string | null;
};
export async function getNpmDistTags(): Promise<NpmDistTags> {
    const result = await execFileNoThrowWithCwd('npm', ['view', MACRO.PACKAGE_URL, 'dist-tags', '--json', '--prefer-online'], { abortSignal: AbortSignal.timeout(5000), cwd: homedir() });
    if (result.code !== 0) {
        logForDebugging(`npm view dist-tags failed with code ${result.code}`);
        return { latest: null, stable: null };
    }
    try {
        const parsed = jsonParse(result.stdout.trim()) as Record<string, unknown>;
        return {
            latest: typeof parsed.latest === 'string' ? parsed.latest : null,
            stable: typeof parsed.stable === 'string' ? parsed.stable : null,
        };
    }
    catch (error) {
        logForDebugging(`Failed to parse dist-tags: ${error}`);
        return { latest: null, stable: null };
    }
}
export async function getLatestVersionFromGcs(channel: ReleaseChannel): Promise<string | null> {
    try {
        const response = await axios.get(`${GCS_BUCKET_URL}/${channel}`, {
            timeout: 5000,
            responseType: 'text',
        });
        return response.data.trim();
    }
    catch (error) {
        logForDebugging(`Failed to fetch ${channel} from GCS: ${error}`);
        return null;
    }
}
export async function getGcsDistTags(): Promise<NpmDistTags> {
    const [latest, stable] = await Promise.all([
        getLatestVersionFromGcs('latest'),
        getLatestVersionFromGcs('stable'),
    ]);
    return { latest, stable };
}
export async function getVersionHistory(limit: number): Promise<string[]> {
    if (process.env.USER_TYPE !== 'ant') {
        return [];
    }
    const packageUrl = MACRO.NATIVE_PACKAGE_URL ?? MACRO.PACKAGE_URL;
    const result = await execFileNoThrowWithCwd('npm', ['view', packageUrl, 'versions', '--json', '--prefer-online'], { abortSignal: AbortSignal.timeout(30000), cwd: homedir() });
    if (result.code !== 0) {
        logForDebugging(`npm view versions failed with code ${result.code}`);
        if (result.stderr) {
            logForDebugging(`npm stderr: ${result.stderr.trim()}`);
        }
        return [];
    }
    try {
        const versions = jsonParse(result.stdout.trim()) as string[];
        return versions.slice(-limit).reverse();
    }
    catch (error) {
        logForDebugging(`Failed to parse version history: ${error}`);
        return [];
    }
}
export async function installGlobalPackage(specificVersion?: string | null): Promise<InstallStatus> {
    if (!(await acquireLock())) {
        logError(new AutoUpdaterError('Another process is currently installing an update'));
        logEvent('open_code_cli_auto_updater_lock_contention', {
            pid: process.pid,
            currentVersion: MACRO.VERSION as AnalyticsScalarMetadata,
        });
        return 'in_progress';
    }
    try {
        await removeOpenCodeCliAliasesFromShellConfigs();
        if (!env.isRunningWithBun() && env.isNpmFromWindowsPath()) {
            logError(new Error('Windows NPM detected in WSL environment'));
            logEvent('open_code_cli_auto_updater_windows_npm_in_wsl', {
                currentVersion: MACRO.VERSION as AnalyticsScalarMetadata,
            });
            console.error(`
Error: Windows NPM detected in WSL
You're running Open Code CLI in WSL but using the Windows NPM installation from /mnt/c/.
This configuration is not supported for updates.
To fix this issue:
  1. Install Node.js within your Linux distribution: e.g. sudo apt install nodejs npm
  2. Make sure Linux NPM is in your PATH before the Windows version
  3. Try updating again with 'open-code-cli update'
`);
            return 'install_failed';
        }
        const { hasPermissions } = await checkGlobalInstallPermissions();
        if (!hasPermissions) {
            return 'no_permissions';
        }
        const packageSpec = specificVersion
            ? `${MACRO.PACKAGE_URL}@${specificVersion}`
            : MACRO.PACKAGE_URL;
        const packageManager = env.isRunningWithBun() ? 'bun' : 'npm';
        const installResult = await execFileNoThrowWithCwd(packageManager, ['install', '-g', packageSpec], { cwd: homedir() });
        if (installResult.code !== 0) {
            const error = new AutoUpdaterError(`Failed to install new version of open-code-cli: ${installResult.stdout} ${installResult.stderr}`);
            logError(error);
            return 'install_failed';
        }
        saveGlobalConfig(current => ({
            ...current,
            installMethod: 'global',
        }));
        return 'success';
    }
    finally {
        await releaseLock();
    }
}
async function removeOpenCodeCliAliasesFromShellConfigs(): Promise<void> {
    const configMap = getShellConfigPaths();
    for (const [, configFile] of Object.entries(configMap)) {
        try {
            const lines = await readFileLines(configFile);
            if (!lines)
                continue;
            const { filtered, hadAlias } = filterOpenCodeCliAliases(lines);
            if (hadAlias) {
                await writeFileLines(configFile, filtered);
                logForDebugging(`Removed open-code-cli alias from ${configFile}`);
            }
        }
        catch (error) {
            logForDebugging(`Failed to remove alias from ${configFile}: ${error}`, {
                level: 'error',
            });
        }
    }
}
