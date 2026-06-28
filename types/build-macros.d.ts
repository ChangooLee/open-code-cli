declare module 'bun:bundle' {
  export function feature(flag: string): boolean
}
declare const MACRO: {
  readonly VERSION: string
  readonly BUILD_TIME: string
  readonly PACKAGE_URL: string
  readonly NATIVE_PACKAGE_URL: string
  readonly ISSUES_EXPLAINER: string
  readonly VERSION_CHANGELOG: string
  readonly FEEDBACK_CHANNEL: string
}
