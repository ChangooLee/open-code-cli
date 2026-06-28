// Build-time macros and globals.
//
// `open-code-cli` is bundled with Bun, which resolves the `bun:bundle` macro and
// the global `MACRO` object at build time (feature-flag dead-code elimination and
// inlined build metadata). These declarations let `tsc --noEmit` and editors
// understand those symbols without running the bundler. The bundler replaces the
// real values during the build; see scripts/build.mjs for the non-Bun fallback.
//
// NOTE: this file is intentionally a *script* (no top-level import/export) so the
// declarations below are ambient/global. Adding an `export` would turn the
// `declare module 'bun:bundle'` into module augmentation and break resolution.

declare module 'bun:bundle' {
  /**
   * Build-time feature flag. Replaced with a boolean literal by the bundler so
   * disabled branches are eliminated. Outside the bundler it reads from the
   * `OPEN_CODE_CLI_FEATURES` env allowlist (see scripts/build.mjs for inlining).
   */
  export function feature(flag: string): boolean
}

/**
 * Build metadata inlined by the bundler. Values come from package.json / the
 * build environment. Declared globally so `MACRO.VERSION` et al. typecheck.
 */
declare const MACRO: {
  readonly VERSION: string
  readonly BUILD_TIME: string
  readonly PACKAGE_URL: string
  readonly NATIVE_PACKAGE_URL: string
  readonly ISSUES_EXPLAINER: string
  readonly VERSION_CHANGELOG: string
  readonly FEEDBACK_CHANNEL: string
}
