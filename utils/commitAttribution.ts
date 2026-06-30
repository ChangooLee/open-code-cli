import { createHash, randomUUID, type UUID } from 'crypto';
import { stat } from 'fs/promises';
import { isAbsolute, join, relative, sep } from 'path';
import { getOriginalCwd, getSessionId } from '../bootstrap/state.js';
import type { AttributionSnapshotMessage, FileAttributionState, } from '../types/logs.js';
import { getCwd } from './cwd.js';
import { logForDebugging } from './debug.js';
import { execFileNoThrowWithCwd } from './execFileNoThrow.js';
import { getFsImplementation } from './fsOperations.js';
import { isGeneratedFile } from './generatedFiles.js';
import { getRemoteUrlForDir, resolveGitDir } from './git/gitFilesystem.js';
import { findGitRoot, gitExe } from './git.js';
import { logError } from './log.js';
import { getCanonicalName, type ModelName } from './model/model.js';
import { sequential } from './sequential.js';
import { getOpenCodeCliEnv } from './envUtils.js';
const INTERNAL_MODEL_REPOS = [
    'github.com:open-code-cli/open-code-cli-internal',
    'github.com/open-code-cli/open-code-cli-internal',
    'github.com:open-code-cli-org/openai-compatible',
    'github.com/open-code-cli/openai-compatible',
    'github.com:open-code-cli-org/apps',
    'github.com/open-code-cli/apps',
    'github.com:open-code-cli-org/casino',
    'github.com/open-code-cli/casino',
    'github.com:open-code-cli-org/dbt',
    'github.com/open-code-cli/dbt',
    'github.com:open-code-cli-org/dotfiles',
    'github.com/open-code-cli/dotfiles',
    'github.com:open-code-cli-org/terraform-config',
    'github.com/open-code-cli/terraform-config',
    'github.com:open-code-cli-org/hex-export',
    'github.com/open-code-cli/hex-export',
    'github.com:open-code-cli-org/feedback-v2',
    'github.com/open-code-cli/feedback-v2',
    'github.com:open-code-cli-org/labs',
    'github.com/open-code-cli/labs',
    'github.com:open-code-cli-org/argo-rollouts',
    'github.com/open-code-cli/argo-rollouts',
    'github.com:open-code-cli-org/starling-configs',
    'github.com/open-code-cli/starling-configs',
    'github.com:open-code-cli-org/ts-tools',
    'github.com/open-code-cli/ts-tools',
    'github.com:open-code-cli-org/ts-capsules',
    'github.com/open-code-cli/ts-capsules',
    'github.com:open-code-cli-org/feldspar-testing',
    'github.com/open-code-cli/feldspar-testing',
    'github.com:open-code-cli-org/trellis',
    'github.com/open-code-cli/trellis',
    'github.com:open-code-cli-org/open-code-cli-for-hiring',
    'github.com/open-code-cli/open-code-cli-for-hiring',
    'github.com:open-code-cli-org/forge-web',
    'github.com/open-code-cli/forge-web',
    'github.com:open-code-cli-org/infra-manifests',
    'github.com/open-code-cli/infra-manifests',
    'github.com:open-code-cli-org/mycro_manifests',
    'github.com/open-code-cli/mycro_manifests',
    'github.com:open-code-cli-org/mycro_configs',
    'github.com/open-code-cli/mycro_configs',
    'github.com:open-code-cli-org/mobile-apps',
    'github.com/open-code-cli/mobile-apps',
];
export function getAttributionRepoRoot(): string {
    const cwd = getCwd();
    return findGitRoot(cwd) ?? getOriginalCwd();
}
let repoClassCache: 'internal' | 'external' | 'none' | null = null;
export function getRepoClassCached(): 'internal' | 'external' | 'none' | null {
    return repoClassCache;
}
export function isInternalModelRepoCached(): boolean {
    return repoClassCache === 'internal';
}
export const isInternalModelRepo = sequential(async (): Promise<boolean> => {
    if (repoClassCache !== null) {
        return repoClassCache === 'internal';
    }
    const cwd = getAttributionRepoRoot();
    const remoteUrl = await getRemoteUrlForDir(cwd);
    if (!remoteUrl) {
        repoClassCache = 'none';
        return false;
    }
    const isInternal = INTERNAL_MODEL_REPOS.some(repo => remoteUrl.includes(repo));
    repoClassCache = isInternal ? 'internal' : 'external';
    return isInternal;
});
export function sanitizeSurfaceKey(surfaceKey: string): string {
    const slashIndex = surfaceKey.lastIndexOf('/');
    if (slashIndex === -1) {
        return surfaceKey;
    }
    const surface = surfaceKey.slice(0, slashIndex);
    const model = surfaceKey.slice(slashIndex + 1);
    const sanitizedModel = sanitizeModelName(model);
    return `${surface}/${sanitizedModel}`;
}
export function sanitizeModelName(shortName: string): string {
    if (shortName.includes('gpt-4.1'))
        return 'openai/gpt-4.1';
    if (shortName.includes('gpt-4.1'))
        return 'openai/gpt-4.1';
    if (shortName.includes('gpt-4.1'))
        return 'openai/gpt-4.1';
    if (shortName.includes('gpt-4.1'))
        return 'openai/gpt-4.1';
    if (shortName.includes('gpt-4o'))
        return 'openai/gpt-4o';
    if (shortName.includes('gpt-4o'))
        return 'openai/gpt-4o';
    if (shortName.includes('gpt-4o'))
        return 'openai/gpt-4o';
    if (shortName.includes('gpt-4.1-mini'))
        return 'openai/gpt-4o';
    if (shortName.includes('gpt-4o-mini'))
        return 'openai/gpt-4o-mini';
    if (shortName.includes('gpt-4o-mini'))
        return 'openai/gpt-4o-mini';
    return 'open-code-cli';
}
export type AttributionState = {
    fileStates: Map<string, FileAttributionState>;
    sessionBaselines: Map<string, {
        contentHash: string;
        mtime: number;
    }>;
    surface: string;
    startingHeadSha: string | null;
    promptCount: number;
    promptCountAtLastCommit: number;
    permissionPromptCount: number;
    permissionPromptCountAtLastCommit: number;
    escapeCount: number;
    escapeCountAtLastCommit: number;
};
export type AttributionSummary = {
    openCodeCliPercent: number;
    openCodeCliChars: number;
    humanChars: number;
    surfaces: string[];
};
export type FileAttribution = {
    openCodeCliChars: number;
    humanChars: number;
    percent: number;
    surface: string;
};
export type AttributionData = {
    version: 1;
    summary: AttributionSummary;
    files: Record<string, FileAttribution>;
    surfaceBreakdown: Record<string, {
        openCodeCliChars: number;
        percent: number;
    }>;
    excludedGenerated: string[];
    sessions: string[];
};
export function getClientSurface(): string {
    return getOpenCodeCliEnv('LAUNCH_MODE') ?? 'cli';
}
export function buildSurfaceKey(surface: string, model: ModelName): string {
    return `${surface}/${getCanonicalName(model)}`;
}
export function computeContentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
}
export function normalizeFilePath(filePath: string): string {
    const fs = getFsImplementation();
    const cwd = getAttributionRepoRoot();
    if (!isAbsolute(filePath)) {
        return filePath;
    }
    let resolvedPath = filePath;
    let resolvedCwd = cwd;
    try {
        resolvedPath = fs.realpathSync(filePath);
    }
    catch {
    }
    try {
        resolvedCwd = fs.realpathSync(cwd);
    }
    catch {
    }
    if (resolvedPath.startsWith(resolvedCwd + sep) ||
        resolvedPath === resolvedCwd) {
        return relative(resolvedCwd, resolvedPath).replaceAll(sep, '/');
    }
    if (filePath.startsWith(cwd + sep) || filePath === cwd) {
        return relative(cwd, filePath).replaceAll(sep, '/');
    }
    return filePath;
}
export function expandFilePath(filePath: string): string {
    if (isAbsolute(filePath)) {
        return filePath;
    }
    return join(getAttributionRepoRoot(), filePath);
}
export function createEmptyAttributionState(): AttributionState {
    return {
        fileStates: new Map(),
        sessionBaselines: new Map(),
        surface: getClientSurface(),
        startingHeadSha: null,
        promptCount: 0,
        promptCountAtLastCommit: 0,
        permissionPromptCount: 0,
        permissionPromptCountAtLastCommit: 0,
        escapeCount: 0,
        escapeCountAtLastCommit: 0,
    };
}
function computeFileModificationState(existingFileStates: Map<string, FileAttributionState>, filePath: string, oldContent: string, newContent: string, mtime: number): FileAttributionState | null {
    const normalizedPath = normalizeFilePath(filePath);
    try {
        let openCodeCliContribution: number;
        if (oldContent === '' || newContent === '') {
            openCodeCliContribution =
                oldContent === '' ? newContent.length : oldContent.length;
        }
        else {
            const minLen = Math.min(oldContent.length, newContent.length);
            let prefixEnd = 0;
            while (prefixEnd < minLen &&
                oldContent[prefixEnd] === newContent[prefixEnd]) {
                prefixEnd++;
            }
            let suffixLen = 0;
            while (suffixLen < minLen - prefixEnd &&
                oldContent[oldContent.length - 1 - suffixLen] ===
                    newContent[newContent.length - 1 - suffixLen]) {
                suffixLen++;
            }
            const oldChangedLen = oldContent.length - prefixEnd - suffixLen;
            const newChangedLen = newContent.length - prefixEnd - suffixLen;
            openCodeCliContribution = Math.max(oldChangedLen, newChangedLen);
        }
        const existingState = existingFileStates.get(normalizedPath);
        const existingContribution = existingState?.openCodeCliContribution ?? 0;
        return {
            contentHash: computeContentHash(newContent),
            openCodeCliContribution: existingContribution + openCodeCliContribution,
            mtime,
        };
    }
    catch (error) {
        logError(error as Error);
        return null;
    }
}
export async function getFileMtime(filePath: string): Promise<number> {
    const normalizedPath = normalizeFilePath(filePath);
    const absPath = expandFilePath(normalizedPath);
    try {
        const stats = await stat(absPath);
        return stats.mtimeMs;
    }
    catch {
        return Date.now();
    }
}
export function trackFileModification(state: AttributionState, filePath: string, oldContent: string, newContent: string, _userModified: boolean, mtime: number = Date.now()): AttributionState {
    const normalizedPath = normalizeFilePath(filePath);
    const newFileState = computeFileModificationState(state.fileStates, filePath, oldContent, newContent, mtime);
    if (!newFileState) {
        return state;
    }
    const newFileStates = new Map(state.fileStates);
    newFileStates.set(normalizedPath, newFileState);
    logForDebugging(`Attribution: Tracked ${newFileState.openCodeCliContribution} chars for ${normalizedPath}`);
    return {
        ...state,
        fileStates: newFileStates,
    };
}
export function trackFileCreation(state: AttributionState, filePath: string, content: string, mtime: number = Date.now()): AttributionState {
    return trackFileModification(state, filePath, '', content, false, mtime);
}
export function trackFileDeletion(state: AttributionState, filePath: string, oldContent: string): AttributionState {
    const normalizedPath = normalizeFilePath(filePath);
    const existingState = state.fileStates.get(normalizedPath);
    const existingContribution = existingState?.openCodeCliContribution ?? 0;
    const deletedChars = oldContent.length;
    const newFileState: FileAttributionState = {
        contentHash: '',
        openCodeCliContribution: existingContribution + deletedChars,
        mtime: Date.now(),
    };
    const newFileStates = new Map(state.fileStates);
    newFileStates.set(normalizedPath, newFileState);
    logForDebugging(`Attribution: Tracked deletion of ${normalizedPath} (${deletedChars} chars removed, total contribution: ${newFileState.openCodeCliContribution})`);
    return {
        ...state,
        fileStates: newFileStates,
    };
}
export function trackBulkFileChanges(state: AttributionState, changes: ReadonlyArray<{
    path: string;
    type: 'modified' | 'created' | 'deleted';
    oldContent: string;
    newContent: string;
    mtime?: number;
}>): AttributionState {
    const newFileStates = new Map(state.fileStates);
    for (const change of changes) {
        const mtime = change.mtime ?? Date.now();
        if (change.type === 'deleted') {
            const normalizedPath = normalizeFilePath(change.path);
            const existingState = newFileStates.get(normalizedPath);
            const existingContribution = existingState?.openCodeCliContribution ?? 0;
            const deletedChars = change.oldContent.length;
            newFileStates.set(normalizedPath, {
                contentHash: '',
                openCodeCliContribution: existingContribution + deletedChars,
                mtime,
            });
            logForDebugging(`Attribution: Tracked deletion of ${normalizedPath} (${deletedChars} chars removed, total contribution: ${existingContribution + deletedChars})`);
        }
        else {
            const newFileState = computeFileModificationState(newFileStates, change.path, change.oldContent, change.newContent, mtime);
            if (newFileState) {
                const normalizedPath = normalizeFilePath(change.path);
                newFileStates.set(normalizedPath, newFileState);
                logForDebugging(`Attribution: Tracked ${newFileState.openCodeCliContribution} chars for ${normalizedPath}`);
            }
        }
    }
    return {
        ...state,
        fileStates: newFileStates,
    };
}
export async function calculateCommitAttribution(states: AttributionState[], stagedFiles: string[]): Promise<AttributionData> {
    const cwd = getAttributionRepoRoot();
    const sessionId = getSessionId();
    const files: Record<string, FileAttribution> = {};
    const excludedGenerated: string[] = [];
    const surfaces = new Set<string>();
    const surfaceCounts: Record<string, number> = {};
    let totalOpenCodeCliChars = 0;
    let totalHumanChars = 0;
    const mergedFileStates = new Map<string, FileAttributionState>();
    const mergedBaselines = new Map<string, {
        contentHash: string;
        mtime: number;
    }>();
    for (const state of states) {
        surfaces.add(state.surface);
        const baselines = state.sessionBaselines instanceof Map
            ? state.sessionBaselines
            : new Map(Object.entries((state.sessionBaselines ?? {}) as Record<string, {
                contentHash: string;
                mtime: number;
            }>));
        for (const [path, baseline] of baselines) {
            if (!mergedBaselines.has(path)) {
                mergedBaselines.set(path, baseline);
            }
        }
        const fileStates = state.fileStates instanceof Map
            ? state.fileStates
            : new Map(Object.entries((state.fileStates ?? {}) as Record<string, FileAttributionState>));
        for (const [path, fileState] of fileStates) {
            const existing = mergedFileStates.get(path);
            if (existing) {
                mergedFileStates.set(path, {
                    ...fileState,
                    openCodeCliContribution: existing.openCodeCliContribution + fileState.openCodeCliContribution,
                });
            }
            else {
                mergedFileStates.set(path, fileState);
            }
        }
    }
    const fileResults = await Promise.all(stagedFiles.map(async (file) => {
        if (isGeneratedFile(file)) {
            return { type: 'generated' as const, file };
        }
        const absPath = join(cwd, file);
        const fileState = mergedFileStates.get(file);
        const baseline = mergedBaselines.get(file);
        const fileSurface = states[0]!.surface;
        let openCodeCliChars = 0;
        let humanChars = 0;
        const deleted = await isFileDeleted(file);
        if (deleted) {
            if (fileState) {
                openCodeCliChars = fileState.openCodeCliContribution;
                humanChars = 0;
            }
            else {
                const diffSize = await getGitDiffSize(file);
                humanChars = diffSize > 0 ? diffSize : 100;
            }
        }
        else {
            try {
                const stats = await stat(absPath);
                if (fileState) {
                    openCodeCliChars = fileState.openCodeCliContribution;
                    humanChars = 0;
                }
                else if (baseline) {
                    const diffSize = await getGitDiffSize(file);
                    humanChars = diffSize > 0 ? diffSize : stats.size;
                }
                else {
                    humanChars = stats.size;
                }
            }
            catch {
                return null;
            }
        }
        openCodeCliChars = Math.max(0, openCodeCliChars);
        humanChars = Math.max(0, humanChars);
        const total = openCodeCliChars + humanChars;
        const percent = total > 0 ? Math.round((openCodeCliChars / total) * 100) : 0;
        return {
            type: 'file' as const,
            file,
            openCodeCliChars,
            humanChars,
            percent,
            surface: fileSurface,
        };
    }));
    for (const result of fileResults) {
        if (!result)
            continue;
        if (result.type === 'generated') {
            excludedGenerated.push(result.file);
            continue;
        }
        files[result.file] = {
            openCodeCliChars: result.openCodeCliChars,
            humanChars: result.humanChars,
            percent: result.percent,
            surface: result.surface,
        };
        totalOpenCodeCliChars += result.openCodeCliChars;
        totalHumanChars += result.humanChars;
        surfaceCounts[result.surface] =
            (surfaceCounts[result.surface] ?? 0) + result.openCodeCliChars;
    }
    const totalChars = totalOpenCodeCliChars + totalHumanChars;
    const openCodeCliPercent = totalChars > 0 ? Math.round((totalOpenCodeCliChars / totalChars) * 100) : 0;
    const surfaceBreakdown: Record<string, {
        openCodeCliChars: number;
        percent: number;
    }> = {};
    for (const [surface, chars] of Object.entries(surfaceCounts)) {
        const percent = totalChars > 0 ? Math.round((chars / totalChars) * 100) : 0;
        surfaceBreakdown[surface] = { openCodeCliChars: chars, percent };
    }
    return {
        version: 1,
        summary: {
            openCodeCliPercent,
            openCodeCliChars: totalOpenCodeCliChars,
            humanChars: totalHumanChars,
            surfaces: Array.from(surfaces),
        },
        files,
        surfaceBreakdown,
        excludedGenerated,
        sessions: [sessionId],
    };
}
export async function getGitDiffSize(filePath: string): Promise<number> {
    const cwd = getAttributionRepoRoot();
    try {
        const result = await execFileNoThrowWithCwd(gitExe(), ['diff', '--cached', '--stat', '--', filePath], { cwd, timeout: 5000 });
        if (result.code !== 0 || !result.stdout) {
            return 0;
        }
        const lines = result.stdout.split('\n').filter(Boolean);
        let totalChanges = 0;
        for (const line of lines) {
            if (line.includes('file changed') || line.includes('files changed')) {
                const insertMatch = line.match(/(\d+) insertions?/);
                const deleteMatch = line.match(/(\d+) deletions?/);
                const insertions = insertMatch ? parseInt(insertMatch[1]!, 10) : 0;
                const deletions = deleteMatch ? parseInt(deleteMatch[1]!, 10) : 0;
                totalChanges += (insertions + deletions) * 40;
            }
        }
        return totalChanges;
    }
    catch {
        return 0;
    }
}
export async function isFileDeleted(filePath: string): Promise<boolean> {
    const cwd = getAttributionRepoRoot();
    try {
        const result = await execFileNoThrowWithCwd(gitExe(), ['diff', '--cached', '--name-status', '--', filePath], { cwd, timeout: 5000 });
        if (result.code === 0 && result.stdout) {
            return result.stdout.trim().startsWith('D\t');
        }
    }
    catch {
    }
    return false;
}
export async function getStagedFiles(): Promise<string[]> {
    const cwd = getAttributionRepoRoot();
    try {
        const result = await execFileNoThrowWithCwd(gitExe(), ['diff', '--cached', '--name-only'], { cwd, timeout: 5000 });
        if (result.code === 0 && result.stdout) {
            return result.stdout.split('\n').filter(Boolean);
        }
    }
    catch (error) {
        logError(error as Error);
    }
    return [];
}
export async function isGitTransientState(): Promise<boolean> {
    const gitDir = await resolveGitDir(getAttributionRepoRoot());
    if (!gitDir)
        return false;
    const indicators = [
        'rebase-merge',
        'rebase-apply',
        'MERGE_HEAD',
        'CHERRY_PICK_HEAD',
        'BISECT_LOG',
    ];
    const results = await Promise.all(indicators.map(async (indicator) => {
        try {
            await stat(join(gitDir, indicator));
            return true;
        }
        catch {
            return false;
        }
    }));
    return results.some(exists => exists);
}
export function stateToSnapshotMessage(state: AttributionState, messageId: UUID): AttributionSnapshotMessage {
    const fileStates: Record<string, FileAttributionState> = {};
    for (const [path, fileState] of state.fileStates) {
        fileStates[path] = fileState;
    }
    return {
        type: 'attribution-snapshot',
        messageId,
        surface: state.surface,
        fileStates,
        promptCount: state.promptCount,
        promptCountAtLastCommit: state.promptCountAtLastCommit,
        permissionPromptCount: state.permissionPromptCount,
        permissionPromptCountAtLastCommit: state.permissionPromptCountAtLastCommit,
        escapeCount: state.escapeCount,
        escapeCountAtLastCommit: state.escapeCountAtLastCommit,
    };
}
export function restoreAttributionStateFromSnapshots(snapshots: AttributionSnapshotMessage[]): AttributionState {
    const state = createEmptyAttributionState();
    const lastSnapshot = snapshots[snapshots.length - 1];
    if (!lastSnapshot) {
        return state;
    }
    state.surface = lastSnapshot.surface;
    for (const [path, fileState] of Object.entries(lastSnapshot.fileStates)) {
        state.fileStates.set(path, fileState);
    }
    state.promptCount = lastSnapshot.promptCount ?? 0;
    state.promptCountAtLastCommit = lastSnapshot.promptCountAtLastCommit ?? 0;
    state.permissionPromptCount = lastSnapshot.permissionPromptCount ?? 0;
    state.permissionPromptCountAtLastCommit =
        lastSnapshot.permissionPromptCountAtLastCommit ?? 0;
    state.escapeCount = lastSnapshot.escapeCount ?? 0;
    state.escapeCountAtLastCommit = lastSnapshot.escapeCountAtLastCommit ?? 0;
    return state;
}
export function attributionRestoreStateFromLog(attributionSnapshots: AttributionSnapshotMessage[], onUpdateState: (newState: AttributionState) => void): void {
    const state = restoreAttributionStateFromSnapshots(attributionSnapshots);
    onUpdateState(state);
}
export function incrementPromptCount(attribution: AttributionState, saveSnapshot: (snapshot: AttributionSnapshotMessage) => void): AttributionState {
    const newAttribution = {
        ...attribution,
        promptCount: attribution.promptCount + 1,
    };
    const snapshot = stateToSnapshotMessage(newAttribution, randomUUID());
    saveSnapshot(snapshot);
    return newAttribution;
}
