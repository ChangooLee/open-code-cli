import { getPlatform } from '../platform.js'
export type FlagArgType =
  | 'none' 
  | 'number' 
  | 'string' 
  | 'char' 
  | '{}' 
  | 'EOF' 
export type ExternalCommandConfig = {
  safeFlags: Record<string, FlagArgType>
  additionalCommandIsDangerousCallback?: (
    rawCommand: string,
    args: string[],
  ) => boolean
  respectsDoubleDash?: boolean
}
const GIT_REF_SELECTION_FLAGS: Record<string, FlagArgType> = {
  '--all': 'none',
  '--branches': 'none',
  '--tags': 'none',
  '--remotes': 'none',
}
const GIT_DATE_FILTER_FLAGS: Record<string, FlagArgType> = {
  '--since': 'string',
  '--after': 'string',
  '--until': 'string',
  '--before': 'string',
}
const GIT_LOG_DISPLAY_FLAGS: Record<string, FlagArgType> = {
  '--oneline': 'none',
  '--graph': 'none',
  '--decorate': 'none',
  '--no-decorate': 'none',
  '--date': 'string',
  '--relative-date': 'none',
}
const GIT_COUNT_FLAGS: Record<string, FlagArgType> = {
  '--max-count': 'number',
  '-n': 'number',
}
const GIT_STAT_FLAGS: Record<string, FlagArgType> = {
  '--stat': 'none',
  '--numstat': 'none',
  '--shortstat': 'none',
  '--name-only': 'none',
  '--name-status': 'none',
}
const GIT_COLOR_FLAGS: Record<string, FlagArgType> = {
  '--color': 'none',
  '--no-color': 'none',
}
const GIT_PATCH_FLAGS: Record<string, FlagArgType> = {
  '--patch': 'none',
  '-p': 'none',
  '--no-patch': 'none',
  '--no-ext-diff': 'none',
  '-s': 'none',
}
const GIT_AUTHOR_FILTER_FLAGS: Record<string, FlagArgType> = {
  '--author': 'string',
  '--committer': 'string',
  '--grep': 'string',
}
export const GIT_READ_ONLY_COMMANDS: Record<string, ExternalCommandConfig> = {
  'git diff': {
    safeFlags: {
      ...GIT_STAT_FLAGS,
      ...GIT_COLOR_FLAGS,
      '--dirstat': 'none',
      '--summary': 'none',
      '--patch-with-stat': 'none',
      '--word-diff': 'none',
      '--word-diff-regex': 'string',
      '--color-words': 'none',
      '--no-renames': 'none',
      '--no-ext-diff': 'none',
      '--check': 'none',
      '--ws-error-highlight': 'string',
      '--full-index': 'none',
      '--binary': 'none',
      '--abbrev': 'number',
      '--break-rewrites': 'none',
      '--find-renames': 'none',
      '--find-copies': 'none',
      '--find-copies-harder': 'none',
      '--irreversible-delete': 'none',
      '--diff-algorithm': 'string',
      '--histogram': 'none',
      '--patience': 'none',
      '--minimal': 'none',
      '--ignore-space-at-eol': 'none',
      '--ignore-space-change': 'none',
      '--ignore-all-space': 'none',
      '--ignore-blank-lines': 'none',
      '--inter-hunk-context': 'number',
      '--function-context': 'none',
      '--exit-code': 'none',
      '--quiet': 'none',
      '--cached': 'none',
      '--staged': 'none',
      '--pickaxe-regex': 'none',
      '--pickaxe-all': 'none',
      '--no-index': 'none',
      '--relative': 'string',
      '--diff-filter': 'string',
      '-p': 'none',
      '-u': 'none',
      '-s': 'none',
      '-M': 'none',
      '-C': 'none',
      '-B': 'none',
      '-D': 'none',
      '-l': 'none',
      '-S': 'string',
      '-G': 'string',
      '-O': 'string',
      '-R': 'none',
    },
  },
  'git log': {
    safeFlags: {
      ...GIT_LOG_DISPLAY_FLAGS,
      ...GIT_REF_SELECTION_FLAGS,
      ...GIT_DATE_FILTER_FLAGS,
      ...GIT_COUNT_FLAGS,
      ...GIT_STAT_FLAGS,
      ...GIT_COLOR_FLAGS,
      ...GIT_PATCH_FLAGS,
      ...GIT_AUTHOR_FILTER_FLAGS,
      '--abbrev-commit': 'none',
      '--full-history': 'none',
      '--dense': 'none',
      '--sparse': 'none',
      '--simplify-merges': 'none',
      '--ancestry-path': 'none',
      '--source': 'none',
      '--first-parent': 'none',
      '--merges': 'none',
      '--no-merges': 'none',
      '--reverse': 'none',
      '--walk-reflogs': 'none',
      '--skip': 'number',
      '--max-age': 'number',
      '--min-age': 'number',
      '--no-min-parents': 'none',
      '--no-max-parents': 'none',
      '--follow': 'none',
      '--no-walk': 'none',
      '--left-right': 'none',
      '--cherry-mark': 'none',
      '--cherry-pick': 'none',
      '--boundary': 'none',
      '--topo-order': 'none',
      '--date-order': 'none',
      '--author-date-order': 'none',
      '--pretty': 'string',
      '--format': 'string',
      '--diff-filter': 'string',
      '-S': 'string',
      '-G': 'string',
      '--pickaxe-regex': 'none',
      '--pickaxe-all': 'none',
    },
  },
  'git show': {
    safeFlags: {
      ...GIT_LOG_DISPLAY_FLAGS,
      ...GIT_STAT_FLAGS,
      ...GIT_COLOR_FLAGS,
      ...GIT_PATCH_FLAGS,
      '--abbrev-commit': 'none',
      '--word-diff': 'none',
      '--word-diff-regex': 'string',
      '--color-words': 'none',
      '--pretty': 'string',
      '--format': 'string',
      '--first-parent': 'none',
      '--raw': 'none',
      '--diff-filter': 'string',
      '-m': 'none',
      '--quiet': 'none',
    },
  },
  'git shortlog': {
    safeFlags: {
      ...GIT_REF_SELECTION_FLAGS,
      ...GIT_DATE_FILTER_FLAGS,
      '-s': 'none',
      '--summary': 'none',
      '-n': 'none',
      '--numbered': 'none',
      '-e': 'none',
      '--email': 'none',
      '-c': 'none',
      '--committer': 'none',
      '--group': 'string',
      '--format': 'string',
      '--no-merges': 'none',
      '--author': 'string',
    },
  },
  'git reflog': {
    safeFlags: {
      ...GIT_LOG_DISPLAY_FLAGS,
      ...GIT_REF_SELECTION_FLAGS,
      ...GIT_DATE_FILTER_FLAGS,
      ...GIT_COUNT_FLAGS,
      ...GIT_AUTHOR_FILTER_FLAGS,
    },
    additionalCommandIsDangerousCallback: (
      _rawCommand: string,
      args: string[],
    ) => {
      const DANGEROUS_SUBCOMMANDS = new Set(['expire', 'delete', 'exists'])
      for (const token of args) {
        if (!token || token.startsWith('-')) continue
        if (DANGEROUS_SUBCOMMANDS.has(token)) {
          return true 
        }
        return false
      }
      return false 
    },
  },
  'git stash list': {
    safeFlags: {
      ...GIT_LOG_DISPLAY_FLAGS,
      ...GIT_REF_SELECTION_FLAGS,
      ...GIT_COUNT_FLAGS,
    },
  },
  'git ls-remote': {
    safeFlags: {
      '--branches': 'none',
      '-b': 'none',
      '--tags': 'none',
      '-t': 'none',
      '--heads': 'none',
      '-h': 'none',
      '--refs': 'none',
      '--quiet': 'none',
      '-q': 'none',
      '--exit-code': 'none',
      '--get-url': 'none',
      '--symref': 'none',
      '--sort': 'string',
    },
  },
  'git status': {
    safeFlags: {
      '--short': 'none',
      '-s': 'none',
      '--branch': 'none',
      '-b': 'none',
      '--porcelain': 'none',
      '--long': 'none',
      '--verbose': 'none',
      '-v': 'none',
      '--untracked-files': 'string',
      '-u': 'string',
      '--ignored': 'none',
      '--ignore-submodules': 'string',
      '--column': 'none',
      '--no-column': 'none',
      '--ahead-behind': 'none',
      '--no-ahead-behind': 'none',
      '--renames': 'none',
      '--no-renames': 'none',
      '--find-renames': 'string',
      '-M': 'string',
    },
  },
  'git blame': {
    safeFlags: {
      ...GIT_COLOR_FLAGS,
      '-L': 'string',
      '--porcelain': 'none',
      '-p': 'none',
      '--line-porcelain': 'none',
      '--incremental': 'none',
      '--root': 'none',
      '--show-stats': 'none',
      '--show-name': 'none',
      '--show-number': 'none',
      '-n': 'none',
      '--show-email': 'none',
      '-e': 'none',
      '-f': 'none',
      '--date': 'string',
      '-w': 'none',
      '--ignore-rev': 'string',
      '--ignore-revs-file': 'string',
      '-M': 'none',
      '-C': 'none',
      '--score-debug': 'none',
      '--abbrev': 'number',
      '-s': 'none',
      '-l': 'none',
      '-t': 'none',
    },
  },
  'git ls-files': {
    safeFlags: {
      '--cached': 'none',
      '-c': 'none',
      '--deleted': 'none',
      '-d': 'none',
      '--modified': 'none',
      '-m': 'none',
      '--others': 'none',
      '-o': 'none',
      '--ignored': 'none',
      '-i': 'none',
      '--stage': 'none',
      '-s': 'none',
      '--killed': 'none',
      '-k': 'none',
      '--unmerged': 'none',
      '-u': 'none',
      '--directory': 'none',
      '--no-empty-directory': 'none',
      '--eol': 'none',
      '--full-name': 'none',
      '--abbrev': 'number',
      '--debug': 'none',
      '-z': 'none',
      '-t': 'none',
      '-v': 'none',
      '-f': 'none',
      '--exclude': 'string',
      '-x': 'string',
      '--exclude-from': 'string',
      '-X': 'string',
      '--exclude-per-directory': 'string',
      '--exclude-standard': 'none',
      '--error-unmatch': 'none',
      '--recurse-submodules': 'none',
    },
  },
  'git config --get': {
    safeFlags: {
      '--local': 'none',
      '--global': 'none',
      '--system': 'none',
      '--worktree': 'none',
      '--default': 'string',
      '--type': 'string',
      '--bool': 'none',
      '--int': 'none',
      '--bool-or-int': 'none',
      '--path': 'none',
      '--expiry-date': 'none',
      '-z': 'none',
      '--null': 'none',
      '--name-only': 'none',
      '--show-origin': 'none',
      '--show-scope': 'none',
    },
  },
  'git remote show': {
    safeFlags: {
      '-n': 'none',
    },
    additionalCommandIsDangerousCallback: (
      _rawCommand: string,
      args: string[],
    ) => {
      const positional = args.filter(a => a !== '-n')
      if (positional.length !== 1) return true
      return !/^[a-zA-Z0-9_-]+$/.test(positional[0]!)
    },
  },
  'git remote': {
    safeFlags: {
      '-v': 'none',
      '--verbose': 'none',
    },
    additionalCommandIsDangerousCallback: (
      _rawCommand: string,
      args: string[],
    ) => {
      return args.some(a => a !== '-v' && a !== '--verbose')
    },
  },
  'git merge-base': {
    safeFlags: {
      '--is-ancestor': 'none', // Check if first commit is ancestor of second
      '--fork-point': 'none', // Find fork point
      '--octopus': 'none', // Find best common ancestors for multiple refs
      '--independent': 'none', // Filter independent refs
      '--all': 'none', // Output all merge bases
    },
  },
  'git rev-parse': {
    safeFlags: {
      '--verify': 'none', // Verify that exactly one argument is a valid object name
      '--short': 'string', // Abbreviate output (optional length via =N)
      '--abbrev-ref': 'none', // Symbolic name of ref
      '--symbolic': 'none', // Output symbolic names
      '--symbolic-full-name': 'none', // Full symbolic name including refs/heads/ prefix
      '--show-toplevel': 'none', // Absolute path of top-level directory
      '--show-cdup': 'none', // Path components to traverse up to top-level
      '--show-prefix': 'none', // Relative path from top-level to cwd
      '--git-dir': 'none', // Path to .git directory
      '--git-common-dir': 'none', // Path to common directory (.git in main worktree)
      '--absolute-git-dir': 'none', // Absolute path to .git directory
      '--show-superproject-working-tree': 'none', // Superproject root (if submodule)
      '--is-inside-work-tree': 'none',
      '--is-inside-git-dir': 'none',
      '--is-bare-repository': 'none',
      '--is-shallow-repository': 'none',
      '--is-shallow-update': 'none',
      '--path-prefix': 'none',
    },
  },
  'git rev-list': {
    safeFlags: {
      ...GIT_REF_SELECTION_FLAGS,
      ...GIT_DATE_FILTER_FLAGS,
      ...GIT_COUNT_FLAGS,
      ...GIT_AUTHOR_FILTER_FLAGS,
      '--count': 'none', // Output commit count instead of listing
      '--reverse': 'none',
      '--first-parent': 'none',
      '--ancestry-path': 'none',
      '--merges': 'none',
      '--no-merges': 'none',
      '--min-parents': 'number',
      '--max-parents': 'number',
      '--no-min-parents': 'none',
      '--no-max-parents': 'none',
      '--skip': 'number',
      '--max-age': 'number',
      '--min-age': 'number',
      '--walk-reflogs': 'none',
      '--oneline': 'none',
      '--abbrev-commit': 'none',
      '--pretty': 'string',
      '--format': 'string',
      '--abbrev': 'number',
      '--full-history': 'none',
      '--dense': 'none',
      '--sparse': 'none',
      '--source': 'none',
      '--graph': 'none',
    },
  },
  'git describe': {
    safeFlags: {
      '--tags': 'none', // Consider all tags, not just annotated
      '--match': 'string', // Only consider tags matching the glob pattern
      '--exclude': 'string', // Do not consider tags matching the glob pattern
      '--long': 'none', // Always output long format (tag-distance-ghash)
      '--abbrev': 'number', // Abbreviate objectname to N hex digits
      '--always': 'none', // Show uniquely abbreviated object as fallback
      '--contains': 'none', // Find tag that comes after the commit
      '--first-match': 'none', // Prefer tags closest to the tip (stops after first match)
      '--exact-match': 'none', // Only output if an exact match (tag points at commit)
      '--candidates': 'number', // Limit walk before selecting best candidates
      '--dirty': 'none', // Append "-dirty" if working tree has modifications
      '--broken': 'none', // Append "-broken" if repository is in invalid state
    },
  },
  'git cat-file': {
    safeFlags: {
      '-t': 'none', // Print type of object
      '-s': 'none', // Print size of object
      '-p': 'none', // Pretty-print object contents
      '-e': 'none', // Exit with zero if object exists, non-zero otherwise
      '--batch-check': 'none', // For each object on stdin, print type and size (no content)
      '--allow-undetermined-type': 'none',
    },
  },
  'git for-each-ref': {
    safeFlags: {
      '--format': 'string', // Format string using %(fieldname) placeholders
      '--sort': 'string', // Sort by key (e.g., refname, creatordate, version:refname)
      '--count': 'number', // Limit output to at most N refs
      '--contains': 'string', // Only list refs that contain specified commit
      '--no-contains': 'string', // Only list refs that do NOT contain specified commit
      '--merged': 'string', // Only list refs reachable from specified commit
      '--no-merged': 'string', // Only list refs NOT reachable from specified commit
      '--points-at': 'string', // Only list refs pointing at specified object
    },
  },
  'git grep': {
    safeFlags: {
      '-e': 'string', // Pattern
      '-E': 'none', // Extended regexp
      '--extended-regexp': 'none',
      '-G': 'none', // Basic regexp (default)
      '--basic-regexp': 'none',
      '-F': 'none', // Fixed strings
      '--fixed-strings': 'none',
      '-P': 'none', // Perl regexp
      '--perl-regexp': 'none',
      '-i': 'none', // Ignore case
      '--ignore-case': 'none',
      '-v': 'none', // Invert match
      '--invert-match': 'none',
      '-w': 'none', // Word regexp
      '--word-regexp': 'none',
      '-n': 'none', // Line number
      '--line-number': 'none',
      '-c': 'none', // Count
      '--count': 'none',
      '-l': 'none', // Files with matches
      '--files-with-matches': 'none',
      '-L': 'none', // Files without match
      '--files-without-match': 'none',
      '-h': 'none', // No filename
      '-H': 'none', // With filename
      '--heading': 'none',
      '--break': 'none',
      '--full-name': 'none',
      '--color': 'none',
      '--no-color': 'none',
      '-o': 'none', // Only matching
      '--only-matching': 'none',
      '-A': 'number', // After context
      '--after-context': 'number',
      '-B': 'number', // Before context
      '--before-context': 'number',
      '-C': 'number', // Context
      '--context': 'number',
      '--and': 'none',
      '--or': 'none',
      '--not': 'none',
      '--max-depth': 'number',
      '--untracked': 'none',
      '--no-index': 'none',
      '--recurse-submodules': 'none',
      '--cached': 'none',
      '--threads': 'number',
      '-q': 'none',
      '--quiet': 'none',
    },
  },
  'git stash show': {
    safeFlags: {
      ...GIT_STAT_FLAGS,
      ...GIT_COLOR_FLAGS,
      ...GIT_PATCH_FLAGS,
      '--word-diff': 'none',
      '--word-diff-regex': 'string',
      '--diff-filter': 'string',
      '--abbrev': 'number',
    },
  },
  'git worktree list': {
    safeFlags: {
      '--porcelain': 'none',
      '-v': 'none',
      '--verbose': 'none',
      '--expire': 'string',
    },
  },
  'git tag': {
    safeFlags: {
      '-l': 'none',
      '--list': 'none',
      '-n': 'number',
      '--contains': 'string',
      '--no-contains': 'string',
      '--merged': 'string',
      '--no-merged': 'string',
      '--sort': 'string',
      '--format': 'string',
      '--points-at': 'string',
      '--column': 'none',
      '--no-column': 'none',
      '-i': 'none',
      '--ignore-case': 'none',
    },
    additionalCommandIsDangerousCallback: (
      _rawCommand: string,
      args: string[],
    ) => {
      const flagsWithArgs = new Set([
        '--contains',
        '--no-contains',
        '--merged',
        '--no-merged',
        '--points-at',
        '--sort',
        '--format',
        '-n',
      ])
      let i = 0
      let seenListFlag = false
      let seenDashDash = false
      while (i < args.length) {
        const token = args[i]
        if (!token) {
          i++
          continue
        }
        if (token === '--' && !seenDashDash) {
          seenDashDash = true
          i++
          continue
        }
        if (!seenDashDash && token.startsWith('-')) {
          if (token === '--list' || token === '-l') {
            seenListFlag = true
          } else if (
            token[0] === '-' &&
            token[1] !== '-' &&
            token.length > 2 &&
            !token.includes('=') &&
            token.slice(1).includes('l')
          ) {
            seenListFlag = true
          }
          if (token.includes('=')) {
            i++
          } else if (flagsWithArgs.has(token)) {
            i += 2
          } else {
            i++
          }
        } else {
          if (!seenListFlag) {
            return true 
          }
          i++
        }
      }
      return false
    },
  },
  'git branch': {
    safeFlags: {
      '-l': 'none',
      '--list': 'none',
      '-a': 'none',
      '--all': 'none',
      '-r': 'none',
      '--remotes': 'none',
      '-v': 'none',
      '-vv': 'none',
      '--verbose': 'none',
      '--color': 'none',
      '--no-color': 'none',
      '--column': 'none',
      '--no-column': 'none',
      '--abbrev': 'number',
      '--no-abbrev': 'none',
      '--contains': 'string',
      '--no-contains': 'string',
      '--merged': 'none', // Optional commit argument - handled in callback
      '--no-merged': 'none', // Optional commit argument - handled in callback
      '--points-at': 'string',
      '--sort': 'string',
      '--show-current': 'none',
      '-i': 'none',
      '--ignore-case': 'none',
    },
    additionalCommandIsDangerousCallback: (
      _rawCommand: string,
      args: string[],
    ) => {
      const flagsWithArgs = new Set([
        '--contains',
        '--no-contains',
        '--points-at',
        '--sort',
      ])
      const flagsWithOptionalArgs = new Set(['--merged', '--no-merged'])
      let i = 0
      let lastFlag = ''
      let seenListFlag = false
      let seenDashDash = false
      while (i < args.length) {
        const token = args[i]
        if (!token) {
          i++
          continue
        }
        if (token === '--' && !seenDashDash) {
          seenDashDash = true
          lastFlag = ''
          i++
          continue
        }
        if (!seenDashDash && token.startsWith('-')) {
          if (token === '--list' || token === '-l') {
            seenListFlag = true
          } else if (
            token[0] === '-' &&
            token[1] !== '-' &&
            token.length > 2 &&
            !token.includes('=') &&
            token.slice(1).includes('l')
          ) {
            seenListFlag = true
          }
          if (token.includes('=')) {
            lastFlag = token.split('=')[0] || ''
            i++
          } else if (flagsWithArgs.has(token)) {
            lastFlag = token
            i += 2
          } else {
            lastFlag = token
            i++
          }
        } else {
          const lastFlagHasOptionalArg = flagsWithOptionalArgs.has(lastFlag)
          if (!seenListFlag && !lastFlagHasOptionalArg) {
            return true 
          }
          i++
        }
      }
      return false
    },
  },
}
function ghIsDangerousCallback(_rawCommand: string, args: string[]): boolean {
  for (const token of args) {
    if (!token) continue
    let value = token
    if (token.startsWith('-')) {
      const eqIdx = token.indexOf('=')
      if (eqIdx === -1) continue 
      value = token.slice(eqIdx + 1)
      if (!value) continue
    }
    if (
      !value.includes('/') &&
      !value.includes('://') &&
      !value.includes('@')
    ) {
      continue
    }
    if (value.includes('://')) {
      return true
    }
    if (value.includes('@')) {
      return true
    }
    const slashCount = (value.match(/\//g) || []).length
    if (slashCount >= 2) {
      return true
    }
  }
  return false
}
export const GH_READ_ONLY_COMMANDS: Record<string, ExternalCommandConfig> = {
  'gh pr view': {
    safeFlags: {
      '--json': 'string', // JSON field selection
      '--comments': 'none', // Show comments
      '--repo': 'string', // Target repository (OWNER/REPO)
      '-R': 'string',
    },
    additionalCommandIsDangerousCallback: ghIsDangerousCallback,
  },
  'gh pr list': {
    safeFlags: {
      '--state': 'string', // open, closed, merged, all
      '-s': 'string',
      '--author': 'string',
      '--assignee': 'string',
      '--label': 'string',
      '--limit': 'number',
      '-L': 'number',
      '--base': 'string',
      '--head': 'string',
      '--search': 'string',
      '--json': 'string',
      '--draft': 'none',
      '--app': 'string',
      '--repo': 'string',
      '-R': 'string',
    },
    additionalCommandIsDangerousCallback: ghIsDangerousCallback,
  },
  'gh pr diff': {
    safeFlags: {
      '--color': 'string',
      '--name-only': 'none',
      '--patch': 'none',
      '--repo': 'string',
      '-R': 'string',
    },
    additionalCommandIsDangerousCallback: ghIsDangerousCallback,
  },
  'gh pr checks': {
    safeFlags: {
      '--watch': 'none',
      '--required': 'none',
      '--fail-fast': 'none',
      '--json': 'string',
      '--interval': 'number',
      '--repo': 'string',
      '-R': 'string',
    },
    additionalCommandIsDangerousCallback: ghIsDangerousCallback,
  },
  'gh issue view': {
    safeFlags: {
      '--json': 'string',
      '--comments': 'none',
      '--repo': 'string',
      '-R': 'string',
    },
    additionalCommandIsDangerousCallback: ghIsDangerousCallback,
  },
  'gh issue list': {
    safeFlags: {
      '--state': 'string',
      '-s': 'string',
      '--assignee': 'string',
      '--author': 'string',
      '--label': 'string',
      '--limit': 'number',
      '-L': 'number',
      '--milestone': 'string',
      '--search': 'string',
      '--json': 'string',
      '--app': 'string',
      '--repo': 'string',
      '-R': 'string',
    },
    additionalCommandIsDangerousCallback: ghIsDangerousCallback,
  },
  'gh repo view': {
    safeFlags: {
      '--json': 'string',
    },
    additionalCommandIsDangerousCallback: ghIsDangerousCallback,
  },
  'gh run list': {
    safeFlags: {
      '--branch': 'string', // Filter by branch
      '-b': 'string',
      '--status': 'string', // Filter by status
      '-s': 'string',
      '--workflow': 'string', // Filter by workflow
      '-w': 'string', // NOTE: -w is --workflow here, NOT --web (gh run list has no --web)
      '--limit': 'number', // Max results
      '-L': 'number',
      '--json': 'string', // JSON field selection
      '--repo': 'string', // Target repository
      '-R': 'string',
      '--event': 'string', // Filter by event type
      '-e': 'string',
      '--user': 'string', // Filter by user
      '-u': 'string',
      '--created': 'string', // Filter by creation date
      '--commit': 'string', // Filter by commit SHA
      '-c': 'string',
    },
    additionalCommandIsDangerousCallback: ghIsDangerousCallback,
  },
  'gh run view': {
    safeFlags: {
      '--log': 'none', // Show full run log
      '--log-failed': 'none', // Show log for failed steps only
      '--exit-status': 'none', // Exit with run's status code
      '--verbose': 'none', // Show job steps
      '-v': 'none', // NOTE: -v is --verbose here, NOT --web
      '--json': 'string', // JSON field selection
      '--repo': 'string', // Target repository
      '-R': 'string',
      '--job': 'string', // View a specific job by ID
      '-j': 'string',
      '--attempt': 'number', // View a specific attempt
      '-a': 'number',
    },
    additionalCommandIsDangerousCallback: ghIsDangerousCallback,
  },
  'gh auth status': {
    safeFlags: {
      '--active': 'none', // Display active account only
      '-a': 'none',
      '--hostname': 'string', // Check specific hostname
      '-h': 'string',
      '--json': 'string', // JSON field selection
    },
    additionalCommandIsDangerousCallback: ghIsDangerousCallback,
  },
  'gh pr status': {
    safeFlags: {
      '--conflict-status': 'none', // Display merge conflict status
      '-c': 'none',
      '--json': 'string', // JSON field selection
      '--repo': 'string', // Target repository
      '-R': 'string',
    },
    additionalCommandIsDangerousCallback: ghIsDangerousCallback,
  },
  'gh issue status': {
    safeFlags: {
      '--json': 'string', // JSON field selection
      '--repo': 'string', // Target repository
      '-R': 'string',
    },
    additionalCommandIsDangerousCallback: ghIsDangerousCallback,
  },
  'gh release list': {
    safeFlags: {
      '--exclude-drafts': 'none', // Exclude draft releases
      '--exclude-pre-releases': 'none', // Exclude pre-releases
      '--json': 'string', // JSON field selection
      '--limit': 'number', // Max results
      '-L': 'number',
      '--order': 'string', // Order: asc|desc
      '-O': 'string',
      '--repo': 'string', // Target repository
      '-R': 'string',
    },
    additionalCommandIsDangerousCallback: ghIsDangerousCallback,
  },
  'gh release view': {
    safeFlags: {
      '--json': 'string', // JSON field selection
      '--repo': 'string', // Target repository
      '-R': 'string',
    },
    additionalCommandIsDangerousCallback: ghIsDangerousCallback,
  },
  'gh workflow list': {
    safeFlags: {
      '--all': 'none', // Include disabled workflows
      '-a': 'none',
      '--json': 'string', // JSON field selection
      '--limit': 'number', // Max results
      '-L': 'number',
      '--repo': 'string', // Target repository
      '-R': 'string',
    },
    additionalCommandIsDangerousCallback: ghIsDangerousCallback,
  },
  'gh workflow view': {
    safeFlags: {
      '--ref': 'string', // Branch/tag with workflow version
      '-r': 'string',
      '--yaml': 'none', // View workflow yaml
      '-y': 'none',
      '--repo': 'string', // Target repository
      '-R': 'string',
    },
    additionalCommandIsDangerousCallback: ghIsDangerousCallback,
  },
  'gh label list': {
    safeFlags: {
      '--json': 'string', // JSON field selection
      '--limit': 'number', // Max results
      '-L': 'number',
      '--order': 'string', // Order: asc|desc
      '--search': 'string', // Search label names
      '-S': 'string',
      '--sort': 'string', // Sort: created|name
      '--repo': 'string', // Target repository
      '-R': 'string',
    },
    additionalCommandIsDangerousCallback: ghIsDangerousCallback,
  },
  'gh search repos': {
    safeFlags: {
      '--archived': 'none', // Filter by archived state
      '--created': 'string', // Filter by creation date
      '--followers': 'string', // Filter by followers count
      '--forks': 'string', // Filter by forks count
      '--good-first-issues': 'string', // Filter by good first issues
      '--help-wanted-issues': 'string', // Filter by help wanted issues
      '--include-forks': 'string', // Include forks: false|true|only
      '--json': 'string', // JSON field selection
      '--language': 'string', // Filter by language
      '--license': 'string', // Filter by license
      '--limit': 'number', // Max results
      '-L': 'number',
      '--match': 'string', // Restrict to field: name|description|readme
      '--number-topics': 'string', // Filter by number of topics
      '--order': 'string', // Order: asc|desc
      '--owner': 'string', // Filter by owner
      '--size': 'string', // Filter by size range
      '--sort': 'string', // Sort: forks|help-wanted-issues|stars|updated
      '--stars': 'string', // Filter by stars
      '--topic': 'string', // Filter by topic
      '--updated': 'string', // Filter by update date
      '--visibility': 'string', // Filter: public|private|internal
    },
  },
  'gh search issues': {
    safeFlags: {
      '--app': 'string', // Filter by GitHub App author
      '--assignee': 'string', // Filter by assignee
      '--author': 'string', // Filter by author
      '--closed': 'string', // Filter by closed date
      '--commenter': 'string', // Filter by commenter
      '--comments': 'string', // Filter by comment count
      '--created': 'string', // Filter by creation date
      '--include-prs': 'none', // Include PRs in results
      '--interactions': 'string', // Filter by interactions count
      '--involves': 'string', // Filter by involvement
      '--json': 'string', // JSON field selection
      '--label': 'string', // Filter by label
      '--language': 'string', // Filter by language
      '--limit': 'number', // Max results
      '-L': 'number',
      '--locked': 'none', // Filter locked conversations
      '--match': 'string', // Restrict to field: title|body|comments
      '--mentions': 'string', // Filter by user mentions
      '--milestone': 'string', // Filter by milestone
      '--no-assignee': 'none', // Filter missing assignee
      '--no-label': 'none', // Filter missing label
      '--no-milestone': 'none', // Filter missing milestone
      '--no-project': 'none', // Filter missing project
      '--order': 'string', // Order: asc|desc
      '--owner': 'string', // Filter by owner
      '--project': 'string', // Filter by project
      '--reactions': 'string', // Filter by reaction count
      '--repo': 'string', // Filter by repository
      '-R': 'string',
      '--sort': 'string', // Sort field
      '--state': 'string', // Filter: open|closed
      '--team-mentions': 'string', // Filter by team mentions
      '--updated': 'string', // Filter by update date
      '--visibility': 'string', // Filter: public|private|internal
    },
  },
  'gh search prs': {
    safeFlags: {
      '--app': 'string', // Filter by GitHub App author
      '--assignee': 'string', // Filter by assignee
      '--author': 'string', // Filter by author
      '--base': 'string', // Filter by base branch
      '-B': 'string',
      '--checks': 'string', // Filter by check status
      '--closed': 'string', // Filter by closed date
      '--commenter': 'string', // Filter by commenter
      '--comments': 'string', // Filter by comment count
      '--created': 'string', // Filter by creation date
      '--draft': 'none', // Filter draft PRs
      '--head': 'string', // Filter by head branch
      '-H': 'string',
      '--interactions': 'string', // Filter by interactions count
      '--involves': 'string', // Filter by involvement
      '--json': 'string', // JSON field selection
      '--label': 'string', // Filter by label
      '--language': 'string', // Filter by language
      '--limit': 'number', // Max results
      '-L': 'number',
      '--locked': 'none', // Filter locked conversations
      '--match': 'string', // Restrict to field: title|body|comments
      '--mentions': 'string', // Filter by user mentions
      '--merged': 'none', // Filter merged PRs
      '--merged-at': 'string', // Filter by merge date
      '--milestone': 'string', // Filter by milestone
      '--no-assignee': 'none', // Filter missing assignee
      '--no-label': 'none', // Filter missing label
      '--no-milestone': 'none', // Filter missing milestone
      '--no-project': 'none', // Filter missing project
      '--order': 'string', // Order: asc|desc
      '--owner': 'string', // Filter by owner
      '--project': 'string', // Filter by project
      '--reactions': 'string', // Filter by reaction count
      '--repo': 'string', // Filter by repository
      '-R': 'string',
      '--review': 'string', // Filter by review status
      '--review-requested': 'string', // Filter by review requested
      '--reviewed-by': 'string', // Filter by reviewer
      '--sort': 'string', // Sort field
      '--state': 'string', // Filter: open|closed
      '--team-mentions': 'string', // Filter by team mentions
      '--updated': 'string', // Filter by update date
      '--visibility': 'string', // Filter: public|private|internal
    },
  },
  'gh search commits': {
    safeFlags: {
      '--author': 'string', // Filter by author
      '--author-date': 'string', // Filter by authored date
      '--author-email': 'string', // Filter by author email
      '--author-name': 'string', // Filter by author name
      '--committer': 'string', // Filter by committer
      '--committer-date': 'string', // Filter by committed date
      '--committer-email': 'string', // Filter by committer email
      '--committer-name': 'string', // Filter by committer name
      '--hash': 'string', // Filter by commit hash
      '--json': 'string', // JSON field selection
      '--limit': 'number', // Max results
      '-L': 'number',
      '--merge': 'none', // Filter merge commits
      '--order': 'string', // Order: asc|desc
      '--owner': 'string', // Filter by owner
      '--parent': 'string', // Filter by parent hash
      '--repo': 'string', // Filter by repository
      '-R': 'string',
      '--sort': 'string', // Sort: author-date|committer-date
      '--tree': 'string', // Filter by tree hash
      '--visibility': 'string', // Filter: public|private|internal
    },
  },
  'gh search code': {
    safeFlags: {
      '--extension': 'string', // Filter by file extension
      '--filename': 'string', // Filter by filename
      '--json': 'string', // JSON field selection
      '--language': 'string', // Filter by language
      '--limit': 'number', // Max results
      '-L': 'number',
      '--match': 'string', // Restrict to: file|path
      '--owner': 'string', // Filter by owner
      '--repo': 'string', // Filter by repository
      '-R': 'string',
      '--size': 'string', // Filter by size range
    },
  },
}
export const DOCKER_READ_ONLY_COMMANDS: Record<string, ExternalCommandConfig> =
  {
    'docker logs': {
      safeFlags: {
        '--follow': 'none',
        '-f': 'none',
        '--tail': 'string',
        '-n': 'string',
        '--timestamps': 'none',
        '-t': 'none',
        '--since': 'string',
        '--until': 'string',
        '--details': 'none',
      },
    },
    'docker inspect': {
      safeFlags: {
        '--format': 'string',
        '-f': 'string',
        '--type': 'string',
        '--size': 'none',
        '-s': 'none',
      },
    },
  }
export const RIPGREP_READ_ONLY_COMMANDS: Record<string, ExternalCommandConfig> =
  {
    rg: {
      safeFlags: {
        '-e': 'string', // Pattern to search for
        '--regexp': 'string',
        '-f': 'string', // Read patterns from file
        '-i': 'none', // Case insensitive
        '--ignore-case': 'none',
        '-S': 'none', // Smart case
        '--smart-case': 'none',
        '-F': 'none', // Fixed strings
        '--fixed-strings': 'none',
        '-w': 'none', // Word regexp
        '--word-regexp': 'none',
        '-v': 'none', // Invert match
        '--invert-match': 'none',
        '-c': 'none', // Count matches
        '--count': 'none',
        '-l': 'none', // Files with matches
        '--files-with-matches': 'none',
        '--files-without-match': 'none',
        '-n': 'none', // Line number
        '--line-number': 'none',
        '-o': 'none', // Only matching
        '--only-matching': 'none',
        '-A': 'number', // After context
        '--after-context': 'number',
        '-B': 'number', // Before context
        '--before-context': 'number',
        '-C': 'number', // Context
        '--context': 'number',
        '-H': 'none', // With filename
        '-h': 'none', // No filename
        '--heading': 'none',
        '--no-heading': 'none',
        '-q': 'none', // Quiet
        '--quiet': 'none',
        '--column': 'none',
        '-g': 'string', // Glob
        '--glob': 'string',
        '-t': 'string', // Type
        '--type': 'string',
        '-T': 'string', // Type not
        '--type-not': 'string',
        '--type-list': 'none',
        '--hidden': 'none',
        '--no-ignore': 'none',
        '-u': 'none', // Unrestricted
        '-m': 'number', // Max count per file
        '--max-count': 'number',
        '-d': 'number', // Max depth
        '--max-depth': 'number',
        '-a': 'none', // Text (search binary files)
        '--text': 'none',
        '-z': 'none', // Search zip
        '-L': 'none', // Follow symlinks
        '--follow': 'none',
        '--color': 'string',
        '--json': 'none',
        '--stats': 'none',
        '--help': 'none',
        '--version': 'none',
        '--debug': 'none',
        '--': 'none',
      },
    },
  }
export const PYRIGHT_READ_ONLY_COMMANDS: Record<string, ExternalCommandConfig> =
  {
    pyright: {
      respectsDoubleDash: false, // pyright treats -- as a file path, not end-of-options
      safeFlags: {
        '--outputjson': 'none',
        '--project': 'string',
        '-p': 'string',
        '--pythonversion': 'string',
        '--pythonplatform': 'string',
        '--typeshedpath': 'string',
        '--venvpath': 'string',
        '--level': 'string',
        '--stats': 'none',
        '--verbose': 'none',
        '--version': 'none',
        '--dependencies': 'none',
        '--warnings': 'none',
      },
      additionalCommandIsDangerousCallback: (
        _rawCommand: string,
        args: string[],
      ) => {
        return args.some(t => t === '--watch' || t === '-w')
      },
    },
  }
export const EXTERNAL_READONLY_COMMANDS: readonly string[] = [
  'docker ps',
  'docker images',
] as const
export function containsVulnerableUncPath(pathOrCommand: string): boolean {
  if (getPlatform() !== 'windows') {
    return false
  }
  const backslashUncPattern = /\\\\[^\s\\/]+(?:@(?:\d+|ssl))?(?:[\\/]|$|\s)/i
  if (backslashUncPattern.test(pathOrCommand)) {
    return true
  }
  const forwardSlashUncPattern =
    /(?<!:)\/\/[^\s\\/]+(?:@(?:\d+|ssl))?(?:[\\/]|$|\s)/i
  if (forwardSlashUncPattern.test(pathOrCommand)) {
    return true
  }
  const mixedSlashUncPattern = /\/\\{2,}[^\s\\/]/
  if (mixedSlashUncPattern.test(pathOrCommand)) {
    return true
  }
  const reverseMixedSlashUncPattern = /\\{2,}\/[^\s\\/]/
  if (reverseMixedSlashUncPattern.test(pathOrCommand)) {
    return true
  }
  if (/@SSL@\d+/i.test(pathOrCommand) || /@\d+@SSL/i.test(pathOrCommand)) {
    return true
  }
  if (/DavWWWRoot/i.test(pathOrCommand)) {
    return true
  }
  if (
    /^\\\\(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})[\\/]/.test(pathOrCommand) ||
    /^\/\/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})[\\/]/.test(pathOrCommand)
  ) {
    return true
  }
  if (
    /^\\\\(\[[\da-fA-F:]+\])[\\/]/.test(pathOrCommand) ||
    /^\/\/(\[[\da-fA-F:]+\])[\\/]/.test(pathOrCommand)
  ) {
    return true
  }
  return false
}
export const FLAG_PATTERN = /^-[a-zA-Z0-9_-]/
export function validateFlagArgument(
  value: string,
  argType: FlagArgType,
): boolean {
  switch (argType) {
    case 'none':
      return false 
    case 'number':
      return /^\d+$/.test(value)
    case 'string':
      return true 
    case 'char':
      return value.length === 1
    case '{}':
      return value === '{}'
    case 'EOF':
      return value === 'EOF'
    default:
      return false
  }
}
export function validateFlags(
  tokens: string[],
  startIndex: number,
  config: ExternalCommandConfig,
  options?: {
    commandName?: string
    rawCommand?: string
    xargsTargetCommands?: string[]
  },
): boolean {
  let i = startIndex
  while (i < tokens.length) {
    let token = tokens[i]
    if (!token) {
      i++
      continue
    }
    if (
      options?.xargsTargetCommands &&
      options.commandName === 'xargs' &&
      (!token.startsWith('-') || token === '--')
    ) {
      if (token === '--' && i + 1 < tokens.length) {
        i++
        token = tokens[i]
      }
      if (token && options.xargsTargetCommands.includes(token)) {
        break
      }
      return false
    }
    if (token === '--') {
      if (config.respectsDoubleDash !== false) {
        i++
        break 
      }
      i++
      continue
    }
    if (token.startsWith('-') && token.length > 1 && FLAG_PATTERN.test(token)) {
      const hasEquals = token.includes('=')
      const [flag, ...valueParts] = token.split('=')
      const inlineValue = valueParts.join('=')
      if (!flag) {
        return false
      }
      const flagArgType = config.safeFlags[flag]
      if (!flagArgType) {
        if (options?.commandName === 'git' && flag.match(/^-\d+$/)) {
          i++
          continue
        }
        if (
          (options?.commandName === 'grep' || options?.commandName === 'rg') &&
          flag.startsWith('-') &&
          !flag.startsWith('--') &&
          flag.length > 2
        ) {
          const potentialFlag = flag.substring(0, 2) 
          const potentialValue = flag.substring(2) 
          if (config.safeFlags[potentialFlag] && /^\d+$/.test(potentialValue)) {
            const flagArgType = config.safeFlags[potentialFlag]
            if (flagArgType === 'number' || flagArgType === 'string') {
              if (validateFlagArgument(potentialValue, flagArgType)) {
                i++
                continue
              } else {
                return false 
              }
            }
          }
        }
        if (flag.startsWith('-') && !flag.startsWith('--') && flag.length > 2) {
          for (let j = 1; j < flag.length; j++) {
            const singleFlag = '-' + flag[j]
            const flagType = config.safeFlags[singleFlag]
            if (!flagType) {
              return false 
            }
            if (flagType !== 'none') {
              return false 
            }
          }
          i++
          continue
        } else {
          return false 
        }
      }
      if (flagArgType === 'none') {
        if (hasEquals) {
          return false 
        }
        i++
      } else {
        let argValue: string
        if (hasEquals) {
          argValue = inlineValue
          i++
        } else {
          if (
            i + 1 >= tokens.length ||
            (tokens[i + 1] &&
              tokens[i + 1]!.startsWith('-') &&
              tokens[i + 1]!.length > 1 &&
              FLAG_PATTERN.test(tokens[i + 1]!))
          ) {
            return false 
          }
          argValue = tokens[i + 1] || ''
          i += 2
        }
        if (flagArgType === 'string' && argValue.startsWith('-')) {
          if (
            flag === '--sort' &&
            options?.commandName === 'git' &&
            argValue.match(/^-[a-zA-Z]/)
          ) {
          } else {
            return false
          }
        }
        if (!validateFlagArgument(argValue, flagArgType)) {
          return false
        }
      }
    } else {
      i++
    }
  }
  return true
}
