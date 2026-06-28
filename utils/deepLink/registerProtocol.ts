import { promises as fs } from 'fs'
import * as os from 'os'
import * as path from 'path'
import { getFeatureValue_CACHED_MAY_BE_STALE } from 'src/services/analytics/growthbook.js'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from 'src/services/analytics/index.js'
import { logForDebugging } from '../debug.js'
import { getOpenCodeCliConfigHomeDir } from '../envUtils.js'
import { getErrnoCode } from '../errors.js'
import { execFileNoThrow } from '../execFileNoThrow.js'
import { getInitialSettings } from '../settings/settings.js'
import { which } from '../which.js'
import { getUserBinDir, getXDGDataHome } from '../xdg.js'
import { DEEP_LINK_PROTOCOL } from './parseDeepLink.js'
export const MACOS_BUNDLE_ID = 'dev.open-code-cli.url-handler'
const APP_NAME = 'Open Code CLI URL Handler'
const DESKTOP_FILE_NAME = 'open-code-cli-url-handler.desktop'
const MACOS_APP_NAME = 'Open Code CLI URL Handler.app'
const MACOS_APP_DIR = path.join(os.homedir(), 'Applications', MACOS_APP_NAME)
const MACOS_SYMLINK_PATH = path.join(
  MACOS_APP_DIR,
  'Contents',
  'MacOS',
  'open-code-cli',
)
function linuxDesktopPath(): string {
  return path.join(getXDGDataHome(), 'applications', DESKTOP_FILE_NAME)
}
const WINDOWS_REG_KEY = `HKEY_CURRENT_USER\\Software\\Classes\\${DEEP_LINK_PROTOCOL}`
const WINDOWS_COMMAND_KEY = `${WINDOWS_REG_KEY}\\shell\\open\\command`
const FAILURE_BACKOFF_MS = 24 * 60 * 60 * 1000
function linuxExecLine(openCodeCliPath: string): string {
  return `Exec="${openCodeCliPath}" --handle-uri %u`
}
function windowsCommandValue(openCodeCliPath: string): string {
  return `"${openCodeCliPath}" --handle-uri "%1"`
}
async function registerMacos(openCodeCliPath: string): Promise<void> {
  const contentsDir = path.join(MACOS_APP_DIR, 'Contents')
  try {
    await fs.rm(MACOS_APP_DIR, { recursive: true })
  } catch (e: unknown) {
    const code = getErrnoCode(e)
    if (code !== 'ENOENT') {
      throw e
    }
  }
  await fs.mkdir(path.dirname(MACOS_SYMLINK_PATH), { recursive: true })
  const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>${MACOS_BUNDLE_ID}</string>
  <key>CFBundleName</key>
  <string>${APP_NAME}</string>
  <key>CFBundleExecutable</key>
  <string>open-code-cli</string>
  <key>CFBundleVersion</key>
  <string>1.0</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>LSBackgroundOnly</key>
  <true/>
  <key>CFBundleURLTypes</key>
  <array>
    <dict>
      <key>CFBundleURLName</key>
      <string>Open Code CLI Deep Link</string>
      <key>CFBundleURLSchemes</key>
      <array>
        <string>${DEEP_LINK_PROTOCOL}</string>
      </array>
    </dict>
  </array>
</dict>
</plist>`
  await fs.writeFile(path.join(contentsDir, 'Info.plist'), infoPlist)
  await fs.symlink(openCodeCliPath, MACOS_SYMLINK_PATH)
  const lsregister =
    '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister'
  await execFileNoThrow(lsregister, ['-R', MACOS_APP_DIR], { useCwd: false })
  logForDebugging(
    `Registered ${DEEP_LINK_PROTOCOL}:// protocol handler at ${MACOS_APP_DIR}`,
  )
}
async function registerLinux(openCodeCliPath: string): Promise<void> {
  await fs.mkdir(path.dirname(linuxDesktopPath()), { recursive: true })
  const desktopEntry = `[Desktop Entry]
Name=${APP_NAME}
Comment=Handle ${DEEP_LINK_PROTOCOL}:// deep links for Open Code CLI
${linuxExecLine(openCodeCliPath)}
Type=Application
NoDisplay=true
MimeType=x-scheme-handler/${DEEP_LINK_PROTOCOL};
`
  await fs.writeFile(linuxDesktopPath(), desktopEntry)
  const xdgMime = await which('xdg-mime')
  if (xdgMime) {
    const { code } = await execFileNoThrow(
      xdgMime,
      ['default', DESKTOP_FILE_NAME, `x-scheme-handler/${DEEP_LINK_PROTOCOL}`],
      { useCwd: false },
    )
    if (code !== 0) {
      throw Object.assign(new Error(`xdg-mime exited with code ${code}`), {
        code: 'XDG_MIME_FAILED',
      })
    }
  }
  logForDebugging(
    `Registered ${DEEP_LINK_PROTOCOL}:// protocol handler at ${linuxDesktopPath()}`,
  )
}
async function registerWindows(openCodeCliPath: string): Promise<void> {
  for (const args of [
    ['add', WINDOWS_REG_KEY, '/ve', '/d', `URL:${APP_NAME}`, '/f'],
    ['add', WINDOWS_REG_KEY, '/v', 'URL Protocol', '/d', '', '/f'],
    [
      'add',
      WINDOWS_COMMAND_KEY,
      '/ve',
      '/d',
      windowsCommandValue(openCodeCliPath),
      '/f',
    ],
  ]) {
    const { code } = await execFileNoThrow('reg', args, { useCwd: false })
    if (code !== 0) {
      throw Object.assign(new Error(`reg add exited with code ${code}`), {
        code: 'REG_FAILED',
      })
    }
  }
  logForDebugging(
    `Registered ${DEEP_LINK_PROTOCOL}:// protocol handler in Windows registry`,
  )
}
export async function registerProtocolHandler(
  openCodeCliPath?: string,
): Promise<void> {
  const resolved = openCodeCliPath ?? (await resolveOpenCodeCliPath())
  switch (process.platform) {
    case 'darwin':
      await registerMacos(resolved)
      break
    case 'linux':
      await registerLinux(resolved)
      break
    case 'win32':
      await registerWindows(resolved)
      break
    default:
      throw new Error(`Unsupported platform: ${process.platform}`)
  }
}
async function resolveOpenCodeCliPath(): Promise<string> {
  const binaryNames =
    process.platform === 'win32'
      ? ['open-code-cli.exe']
      : ['open-code-cli']
  for (const binaryName of binaryNames) {
    const stablePath = path.join(getUserBinDir(), binaryName)
    try {
      await fs.realpath(stablePath)
      return stablePath
    } catch {
    }
  }
  return process.execPath
}
export async function isProtocolHandlerCurrent(
  openCodeCliPath: string,
): Promise<boolean> {
  try {
    switch (process.platform) {
      case 'darwin': {
        const target = await fs.readlink(MACOS_SYMLINK_PATH)
        return target === openCodeCliPath
      }
      case 'linux': {
        const content = await fs.readFile(linuxDesktopPath(), 'utf8')
        return content.includes(linuxExecLine(openCodeCliPath))
      }
      case 'win32': {
        const { stdout, code } = await execFileNoThrow(
          'reg',
          ['query', WINDOWS_COMMAND_KEY, '/ve'],
          { useCwd: false },
        )
        return code === 0 && stdout.includes(windowsCommandValue(openCodeCliPath))
      }
      default:
        return false
    }
  } catch {
    return false
  }
}
export async function ensureDeepLinkProtocolRegistered(): Promise<void> {
  if (getInitialSettings().disableDeepLinkRegistration === 'disable') {
    return
  }
  if (!getFeatureValue_CACHED_MAY_BE_STALE('open_code_cli_lodestone_enabled', false)) {
    return
  }
  const openCodeCliPath = await resolveOpenCodeCliPath()
  if (await isProtocolHandlerCurrent(openCodeCliPath)) {
    return
  }
  const failureMarkerPath = path.join(
    getOpenCodeCliConfigHomeDir(),
    '.deep-link-register-failed',
  )
  try {
    const stat = await fs.stat(failureMarkerPath)
    if (Date.now() - stat.mtimeMs < FAILURE_BACKOFF_MS) {
      return
    }
  } catch {
  }
  try {
    await registerProtocolHandler(openCodeCliPath)
    logEvent('open_code_cli_deep_link_registered', { success: true })
    logForDebugging('Auto-registered open-code-cli:// deep link protocol handler')
    await fs.rm(failureMarkerPath, { force: true }).catch(() => {})
  } catch (error) {
    const code = getErrnoCode(error)
    logEvent('open_code_cli_deep_link_registered', {
      success: false,
      error_code:
        code as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
    logForDebugging(
      `Failed to auto-register deep link protocol handler: ${error instanceof Error ? error.message : String(error)}`,
      { level: 'warn' },
    )
    if (code === 'EACCES' || code === 'ENOSPC') {
      await fs.writeFile(failureMarkerPath, '').catch(() => {})
    }
  }
}
