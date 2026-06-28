import { access, chmod, writeFile } from 'fs/promises'
import { join } from 'path'
import { type ReleaseChannel, saveGlobalConfig } from './config.js'
import { getOpenCodeCliConfigHomeDir } from './envUtils.js'
import { getErrnoCode } from './errors.js'
import { execFileNoThrowWithCwd } from './execFileNoThrow.js'
import { getFsImplementation } from './fsOperations.js'
import { logError } from './log.js'
import { jsonStringify } from './slowOperations.js'
function getLocalInstallDir(): string {
  return join(getOpenCodeCliConfigHomeDir(), 'local')
}
export function getLocalOpenCodeCliPath(): string {
  return join(getLocalInstallDir(), 'open-code-cli')
}
export function isRunningFromLocalInstallation(): boolean {
  const execPath = process.argv[1] || ''
  return execPath.includes('/.open-code-cli/local/node_modules/')
}
async function writeIfMissing(
  path: string,
  content: string,
  mode?: number,
): Promise<boolean> {
  try {
    await writeFile(path, content, { encoding: 'utf8', flag: 'wx', mode })
    return true
  } catch (e) {
    if (getErrnoCode(e) === 'EEXIST') return false
    throw e
  }
}
export async function ensureLocalPackageEnvironment(): Promise<boolean> {
  try {
    const localInstallDir = getLocalInstallDir()
    await getFsImplementation().mkdir(localInstallDir)
    await writeIfMissing(
      join(localInstallDir, 'package.json'),
      jsonStringify(
        { name: 'open-code-cli-local', version: '0.0.1', private: true },
        null,
        2,
      ),
    )
    const wrapperPath = join(localInstallDir, 'open-code-cli')
    const created = await writeIfMissing(
      wrapperPath,
      `#!/bin/sh\nexec "${localInstallDir}/node_modules/.bin/open-code-cli" "$@"`,
      0o755,
    )
    if (created) {
      await chmod(wrapperPath, 0o755)
    }
    return true
  } catch (error) {
    logError(error)
    return false
  }
}
export async function installOrUpdateOpenCodeCliPackage(
  channel: ReleaseChannel,
  specificVersion?: string | null,
): Promise<'in_progress' | 'success' | 'install_failed'> {
  try {
    if (!(await ensureLocalPackageEnvironment())) {
      return 'install_failed'
    }
    const versionSpec = specificVersion
      ? specificVersion
      : channel === 'stable'
        ? 'stable'
        : 'latest'
    const result = await execFileNoThrowWithCwd(
      'npm',
      ['install', `${MACRO.PACKAGE_URL}@${versionSpec}`],
      { cwd: getLocalInstallDir(), maxBuffer: 1000000 },
    )
    if (result.code !== 0) {
      const error = new Error(
        `Failed to install Open Code CLI package: ${result.stderr}`,
      )
      logError(error)
      return result.code === 190 ? 'in_progress' : 'install_failed'
    }
    saveGlobalConfig(current => ({
      ...current,
      installMethod: 'local',
    }))
    return 'success'
  } catch (error) {
    logError(error)
    return 'install_failed'
  }
}
export async function localInstallationExists(): Promise<boolean> {
  try {
    await access(join(getLocalInstallDir(), 'node_modules', '.bin', 'open-code-cli'))
    return true
  } catch {
    return false
  }
}
export function getShellType(): string {
  const shellPath = process.env.SHELL || ''
  if (shellPath.includes('zsh')) return 'zsh'
  if (shellPath.includes('bash')) return 'bash'
  if (shellPath.includes('fish')) return 'fish'
  return 'unknown'
}
