// Gate for the skill-search feature. Kept in its own module so the
// feature() flag and the string literals it guards can be tree-shaken from
// external builds.
export function isSkillSearchEnabled(): boolean {
  return false
}
