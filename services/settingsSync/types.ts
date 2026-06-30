import { z } from 'zod/v4';
import { lazySchema } from '../../utils/lazySchema.js';
export const UserSyncContentSchema = lazySchema(() => z.object({
    entries: z.record(z.string(), z.string()),
}));
export const UserSyncDataSchema = lazySchema(() => z.object({
    userId: z.string(),
    version: z.number(),
    lastModified: z.string(),
    checksum: z.string(),
    content: UserSyncContentSchema(),
}));
export type UserSyncData = z.infer<ReturnType<typeof UserSyncDataSchema>>;
export type SettingsSyncFetchResult = {
    success: boolean;
    data?: UserSyncData;
    isEmpty?: boolean;
    error?: string;
    skipRetry?: boolean;
};
export type SettingsSyncUploadResult = {
    success: boolean;
    checksum?: string;
    lastModified?: string;
    error?: string;
};
export const SYNC_KEYS = {
    USER_SETTINGS: '~/.open-code-cli/settings.json',
    USER_MEMORY: '~/.open-code-cli/PROJECT.md',
    projectSettings: (projectId: string) => `projects/${projectId}/.open-code-cli/local.settings.json`,
    projectMemory: (projectId: string) => `projects/${projectId}/OPEN_CODE.local.md`,
} as const;
