// Local (on-disk) skill index used by skill search. Exposes a cache-clear hook
// invoked when skills change (MCP reconnect, command reload, etc.).
export function clearSkillIndexCache(): void {
  // No-op until the local skill index is reconstructed.
}
