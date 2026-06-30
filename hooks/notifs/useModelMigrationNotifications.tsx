import type { Notification } from 'src/context/notifications.js';
import { type GlobalConfig, getGlobalConfig } from 'src/utils/config.js';
import { useStartupNotification } from './useStartupNotification.js';
const MIGRATIONS: ((c: GlobalConfig) => Notification | undefined)[] = [
c => {
  if (!recent(c.standardVersionMigrationTimestamp)) return;
  return {
    key: 'standard-model-update',
    text: 'Model updated to GPT-4o',
    color: 'suggestion',
    priority: 'high',
    timeoutMs: 3000
  };
},
c => {
  const isLegacyRemap = Boolean(c.legacyProMigrationTimestamp);
  const ts = c.legacyProMigrationTimestamp ?? c.proMigrationTimestamp;
  if (!recent(ts)) return;
  return {
    key: 'pro-model-update',
    text: isLegacyRemap ? 'Model updated to GPT-4.1 · Set OPEN_CODE_CLI_DISABLE_LEGACY_MODEL_REMAP=1 to opt out' : 'Model updated to GPT-4.1',
    color: 'suggestion',
    priority: 'high',
    timeoutMs: isLegacyRemap ? 8000 : 3000
  };
}];
export function useModelMigrationNotifications() {
  useStartupNotification(_temp);
}
function _temp() {
  const config = getGlobalConfig();
  const notifs: any[] = [];
  for (const migration of MIGRATIONS) {
    const notif = migration(config);
    if (notif) {
      notifs.push(notif);
    }
  }
  return notifs.length > 0 ? notifs : null;
}
function recent(ts: number | undefined): boolean {
  return ts !== undefined && Date.now() - ts < 3000;
}
