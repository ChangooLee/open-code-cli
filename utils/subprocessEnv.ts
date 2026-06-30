import { isEnvTruthy } from './envUtils.js'
const GHA_SUBPROCESS_SCRUB = [
  'OPEN_CODE_CLI_API_KEY',
  'OPEN_CODE_CLI_AUTH_TOKEN',
  'OPEN_CODE_CLI_AUTH_TOKEN',
  'OPEN_CODE_CLI_API_KEY',
  'OPEN_CODE_CLI_CUSTOM_HEADERS',
  'OTEL_EXPORTER_OTLP_HEADERS',
  'OTEL_EXPORTER_OTLP_LOGS_HEADERS',
  'OTEL_EXPORTER_OTLP_METRICS_HEADERS',
  'OTEL_EXPORTER_OTLP_TRACES_HEADERS',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
  'AWS_BEARER_TOKEN',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'AZURE_CLIENT_SECRET',
  'AZURE_CLIENT_CERTIFICATE_PATH',
  'ACTIONS_ID_TOKEN_REQUEST_TOKEN',
  'ACTIONS_ID_TOKEN_REQUEST_URL',
  'ACTIONS_RUNTIME_TOKEN',
  'ACTIONS_RUNTIME_URL',
  'ALL_INPUTS',
  'OVERRIDE_GITHUB_TOKEN',
  'DEFAULT_WORKFLOW_TOKEN',
  'SSH_SIGNING_KEY',
] as const
let _getUpstreamProxyEnv: (() => Record<string, string>) | undefined
export function registerUpstreamProxyEnvFn(
  fn: () => Record<string, string>,
): void {
  _getUpstreamProxyEnv = fn
}
export function subprocessEnv(): NodeJS.ProcessEnv {
  const proxyEnv = _getUpstreamProxyEnv?.() ?? {}
  if (!isEnvTruthy(process.env.OPEN_CODE_CLI_SUBPROCESS_ENV_SCRUB)) {
    return Object.keys(proxyEnv).length > 0
      ? { ...process.env, ...proxyEnv }
      : process.env
  }
  const env = { ...process.env, ...proxyEnv }
  for (const k of GHA_SUBPROCESS_SCRUB) {
    delete env[k]
    delete env[`INPUT_${k}`]
  }
  return env
}
