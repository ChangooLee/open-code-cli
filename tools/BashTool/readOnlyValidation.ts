import type { z } from 'zod/v4'
import { getOriginalCwd } from '../../bootstrap/state.js'
import {
  extractOutputRedirections,
  splitCommand_DEPRECATED,
} from '../../utils/bash/commands.js'
import { tryParseShellCommand } from '../../utils/bash/shellQuote.js'
import { getCwd } from '../../utils/cwd.js'
import { isCurrentDirectoryBareGitRepo } from '../../utils/git.js'
import type { PermissionResult } from '../../utils/permissions/PermissionResult.js'
import { getPlatform } from '../../utils/platform.js'
import { SandboxManager } from '../../utils/sandbox/sandbox-adapter.js'
import {
  containsVulnerableUncPath,
  DOCKER_READ_ONLY_COMMANDS,
  EXTERNAL_READONLY_COMMANDS,
  type FlagArgType,
  GH_READ_ONLY_COMMANDS,
  GIT_READ_ONLY_COMMANDS,
  PYRIGHT_READ_ONLY_COMMANDS,
  RIPGREP_READ_ONLY_COMMANDS,
  validateFlags,
} from '../../utils/shell/readOnlyCommandValidation.js'
import type { BashTool } from './BashTool.js'
import { isNormalizedGitCommand } from './bashPermissions.js'
import { bashCommandIsSafe_DEPRECATED } from './bashSecurity.js'
import {
  COMMAND_OPERATION_TYPE,
  PATH_EXTRACTORS,
  type PathCommand,
} from './pathValidation.js'
import { sedCommandIsAllowedByAllowlist } from './sedValidation.js'
type CommandConfig = {
  safeFlags: Record<string, FlagArgType>
  regex?: RegExp
  additionalCommandIsDangerousCallback?: (
    rawCommand: string,
    args: string[],
  ) => boolean
  respectsDoubleDash?: boolean
}
const FD_SAFE_FLAGS: Record<string, FlagArgType> = {
  '-h': 'none',
  '--help': 'none',
  '-V': 'none',
  '--version': 'none',
  '-H': 'none',
  '--hidden': 'none',
  '-I': 'none',
  '--no-ignore': 'none',
  '--no-ignore-vcs': 'none',
  '--no-ignore-parent': 'none',
  '-s': 'none',
  '--case-sensitive': 'none',
  '-i': 'none',
  '--ignore-case': 'none',
  '-g': 'none',
  '--glob': 'none',
  '--regex': 'none',
  '-F': 'none',
  '--fixed-strings': 'none',
  '-a': 'none',
  '--absolute-path': 'none',
  '-L': 'none',
  '--follow': 'none',
  '-p': 'none',
  '--full-path': 'none',
  '-0': 'none',
  '--print0': 'none',
  '-d': 'number',
  '--max-depth': 'number',
  '--min-depth': 'number',
  '--exact-depth': 'number',
  '-t': 'string',
  '--type': 'string',
  '-e': 'string',
  '--extension': 'string',
  '-S': 'string',
  '--size': 'string',
  '--changed-within': 'string',
  '--changed-before': 'string',
  '-o': 'string',
  '--owner': 'string',
  '-E': 'string',
  '--exclude': 'string',
  '--ignore-file': 'string',
  '-c': 'string',
  '--color': 'string',
  '-j': 'number',
  '--threads': 'number',
  '--max-buffer-time': 'string',
  '--max-results': 'number',
  '-1': 'none',
  '-q': 'none',
  '--quiet': 'none',
  '--show-errors': 'none',
  '--strip-cwd-prefix': 'none',
  '--one-file-system': 'none',
  '--prune': 'none',
  '--search-path': 'string',
  '--base-directory': 'string',
  '--path-separator': 'string',
  '--batch-size': 'number',
  '--no-require-git': 'none',
  '--hyperlink': 'string',
  '--and': 'string',
  '--format': 'string',
}
const COMMAND_ALLOWLIST: Record<string, CommandConfig> = {
  xargs: {
    safeFlags: {
      '-I': '{}',
      '-n': 'number',
      '-P': 'number',
      '-L': 'number',
      '-s': 'number',
      '-E': 'EOF', // POSIX, MANDATORY separate arg — validator & xargs agree
      '-0': 'none',
      '-t': 'none',
      '-r': 'none',
      '-x': 'none',
      '-d': 'char',
    },
  },
  ...GIT_READ_ONLY_COMMANDS,
  file: {
    safeFlags: {
      '--brief': 'none',
      '-b': 'none',
      '--mime': 'none',
      '-i': 'none',
      '--mime-type': 'none',
      '--mime-encoding': 'none',
      '--apple': 'none',
      '--check-encoding': 'none',
      '-c': 'none',
      '--exclude': 'string',
      '--exclude-quiet': 'string',
      '--print0': 'none',
      '-0': 'none',
      '-f': 'string',
      '-F': 'string',
      '--separator': 'string',
      '--help': 'none',
      '--version': 'none',
      '-v': 'none',
      '--no-dereference': 'none',
      '-h': 'none',
      '--dereference': 'none',
      '-L': 'none',
      '--magic-file': 'string',
      '-m': 'string',
      '--keep-going': 'none',
      '-k': 'none',
      '--list': 'none',
      '-l': 'none',
      '--no-buffer': 'none',
      '-n': 'none',
      '--preserve-date': 'none',
      '-p': 'none',
      '--raw': 'none',
      '-r': 'none',
      '-s': 'none',
      '--special-files': 'none',
      '--uncompress': 'none',
      '-z': 'none',
    },
  },
  sed: {
    safeFlags: {
      '--expression': 'string',
      '-e': 'string',
      '--quiet': 'none',
      '--silent': 'none',
      '-n': 'none',
      '--regexp-extended': 'none',
      '-r': 'none',
      '--posix': 'none',
      '-E': 'none',
      '--line-length': 'number',
      '-l': 'number',
      '--zero-terminated': 'none',
      '-z': 'none',
      '--separate': 'none',
      '-s': 'none',
      '--unbuffered': 'none',
      '-u': 'none',
      '--debug': 'none',
      '--help': 'none',
      '--version': 'none',
    },
    additionalCommandIsDangerousCallback: (
      rawCommand: string,
      _args: string[],
    ) => !sedCommandIsAllowedByAllowlist(rawCommand),
  },
  sort: {
    safeFlags: {
      '--ignore-leading-blanks': 'none',
      '-b': 'none',
      '--dictionary-order': 'none',
      '-d': 'none',
      '--ignore-case': 'none',
      '-f': 'none',
      '--general-numeric-sort': 'none',
      '-g': 'none',
      '--human-numeric-sort': 'none',
      '-h': 'none',
      '--ignore-nonprinting': 'none',
      '-i': 'none',
      '--month-sort': 'none',
      '-M': 'none',
      '--numeric-sort': 'none',
      '-n': 'none',
      '--random-sort': 'none',
      '-R': 'none',
      '--reverse': 'none',
      '-r': 'none',
      '--sort': 'string',
      '--stable': 'none',
      '-s': 'none',
      '--unique': 'none',
      '-u': 'none',
      '--version-sort': 'none',
      '-V': 'none',
      '--zero-terminated': 'none',
      '-z': 'none',
      '--key': 'string',
      '-k': 'string',
      '--field-separator': 'string',
      '-t': 'string',
      '--check': 'none',
      '-c': 'none',
      '--check-char-order': 'none',
      '-C': 'none',
      '--merge': 'none',
      '-m': 'none',
      '--buffer-size': 'string',
      '-S': 'string',
      '--parallel': 'number',
      '--batch-size': 'number',
      '--help': 'none',
      '--version': 'none',
    },
  },
  man: {
    safeFlags: {
      '-a': 'none', // Display all manual pages
      '--all': 'none', // Same as -a
      '-d': 'none', // Debug mode
      '-f': 'none', // Emulate whatis
      '--whatis': 'none', // Same as -f
      '-h': 'none', // Help
      '-k': 'none', // Emulate apropos
      '--apropos': 'none', // Same as -k
      '-l': 'string', // Local file (safe for reading, Linux only)
      '-w': 'none', // Display location instead of content
      '-S': 'string', // Restrict manual sections
      '-s': 'string', // Same as -S for whatis/apropos mode
    },
  },
  help: {
    safeFlags: {
      '-d': 'none', // Output short description for each topic
      '-m': 'none', // Display usage in pseudo-manpage format
      '-s': 'none', // Output only a short usage synopsis
    },
  },
  netstat: {
    safeFlags: {
      '-a': 'none', // Show all sockets
      '-L': 'none', // Show listen queue sizes
      '-l': 'none', // Print full IPv6 address
      '-n': 'none', // Show network addresses as numbers
      '-f': 'string', // Address family (inet, inet6, unix, vsock)
      '-g': 'none', // Show multicast group membership
      '-i': 'none', // Show interface state
      '-I': 'string', // Specific interface
      '-s': 'none', // Show per-protocol statistics
      '-r': 'none', // Show routing tables
      '-m': 'none', // Show memory management statistics
      '-v': 'none', // Increase verbosity
    },
  },
  ps: {
    safeFlags: {
      '-e': 'none', // Select all processes
      '-A': 'none', // Select all processes (same as -e)
      '-a': 'none', // Select all with tty except session leaders
      '-d': 'none', // Select all except session leaders
      '-N': 'none', // Negate selection
      '--deselect': 'none',
      '-f': 'none', // Full format
      '-F': 'none', // Extra full format
      '-l': 'none', // Long format
      '-j': 'none', // Jobs format
      '-y': 'none', // Don't show flags
      '-w': 'none', // Wide output
      '-ww': 'none', // Unlimited width
      '--width': 'number',
      '-c': 'none', // Show scheduler info
      '-H': 'none', // Show process hierarchy
      '--forest': 'none',
      '--headers': 'none',
      '--no-headers': 'none',
      '-n': 'string', // Set namelist file
      '--sort': 'string',
      '-L': 'none', // Show threads
      '-T': 'none', // Show threads
      '-m': 'none', // Show threads after processes
      '-C': 'string', // By command name
      '-G': 'string', // By real group ID
      '-g': 'string', // By session or effective group
      '-p': 'string', // By PID
      '--pid': 'string',
      '-q': 'string', // Quick mode by PID
      '--quick-pid': 'string',
      '-s': 'string', // By session ID
      '--sid': 'string',
      '-t': 'string', // By tty
      '--tty': 'string',
      '-U': 'string', // By real user ID
      '-u': 'string', // By effective user ID
      '--user': 'string',
      '--help': 'none',
      '--info': 'none',
      '-V': 'none',
      '--version': 'none',
    },
    additionalCommandIsDangerousCallback: (
      _rawCommand: string,
      args: string[],
    ) => {
      return args.some(
        a => !a.startsWith('-') && /^[a-zA-Z]*e[a-zA-Z]*$/.test(a),
      )
    },
  },
  base64: {
    respectsDoubleDash: false, // macOS base64 does not respect POSIX --
    safeFlags: {
      '-d': 'none', // Decode
      '-D': 'none', // Decode (macOS)
      '--decode': 'none', // Decode
      '-b': 'number', // Break lines at num (macOS)
      '--break': 'number', // Break lines at num (macOS)
      '-w': 'number', // Wrap lines at COLS (Linux)
      '--wrap': 'number', // Wrap lines at COLS (Linux)
      '-i': 'string', // Input file (safe for reading)
      '--input': 'string', // Input file (safe for reading)
      '--ignore-garbage': 'none', // Ignore non-alphabet chars when decoding (Linux)
      '-h': 'none', // Help
      '--help': 'none', // Help
      '--version': 'none', // Version
    },
  },
  grep: {
    safeFlags: {
      '-e': 'string', // Pattern
      '--regexp': 'string',
      '-f': 'string', // File with patterns
      '--file': 'string',
      '-F': 'none', // Fixed strings
      '--fixed-strings': 'none',
      '-G': 'none', // Basic regexp (default)
      '--basic-regexp': 'none',
      '-E': 'none', // Extended regexp
      '--extended-regexp': 'none',
      '-P': 'none', // Perl regexp
      '--perl-regexp': 'none',
      '-i': 'none', // Ignore case
      '--ignore-case': 'none',
      '--no-ignore-case': 'none',
      '-v': 'none', // Invert match
      '--invert-match': 'none',
      '-w': 'none', // Word regexp
      '--word-regexp': 'none',
      '-x': 'none', // Line regexp
      '--line-regexp': 'none',
      '-c': 'none', // Count
      '--count': 'none',
      '--color': 'string',
      '--colour': 'string',
      '-L': 'none', // Files without match
      '--files-without-match': 'none',
      '-l': 'none', // Files with matches
      '--files-with-matches': 'none',
      '-m': 'number', // Max count
      '--max-count': 'number',
      '-o': 'none', // Only matching
      '--only-matching': 'none',
      '-q': 'none', // Quiet
      '--quiet': 'none',
      '--silent': 'none',
      '-s': 'none', // No messages
      '--no-messages': 'none',
      '-b': 'none', // Byte offset
      '--byte-offset': 'none',
      '-H': 'none', // With filename
      '--with-filename': 'none',
      '-h': 'none', // No filename
      '--no-filename': 'none',
      '--label': 'string',
      '-n': 'none', // Line number
      '--line-number': 'none',
      '-T': 'none', // Initial tab
      '--initial-tab': 'none',
      '-u': 'none', // Unix byte offsets
      '--unix-byte-offsets': 'none',
      '-Z': 'none', // Null after filename
      '--null': 'none',
      '-z': 'none', // Null data
      '--null-data': 'none',
      '-A': 'number', // After context
      '--after-context': 'number',
      '-B': 'number', // Before context
      '--before-context': 'number',
      '-C': 'number', // Context
      '--context': 'number',
      '--group-separator': 'string',
      '--no-group-separator': 'none',
      '-a': 'none', // Text (process binary as text)
      '--text': 'none',
      '--binary-files': 'string',
      '-D': 'string', // Devices
      '--devices': 'string',
      '-d': 'string', // Directories
      '--directories': 'string',
      '--exclude': 'string',
      '--exclude-from': 'string',
      '--exclude-dir': 'string',
      '--include': 'string',
      '-r': 'none', // Recursive
      '--recursive': 'none',
      '-R': 'none', // Dereference-recursive
      '--dereference-recursive': 'none',
      '--line-buffered': 'none',
      '-U': 'none', // Binary
      '--binary': 'none',
      '--help': 'none',
      '-V': 'none',
      '--version': 'none',
    },
  },
  ...RIPGREP_READ_ONLY_COMMANDS,
  sha256sum: {
    safeFlags: {
      '-b': 'none', // Binary mode
      '--binary': 'none',
      '-t': 'none', // Text mode
      '--text': 'none',
      '-c': 'none', // Verify checksums from file
      '--check': 'none',
      '--ignore-missing': 'none', // Ignore missing files during check
      '--quiet': 'none', // Quiet mode during check
      '--status': 'none', // Don't output, exit code shows success
      '--strict': 'none', // Exit non-zero for improperly formatted lines
      '-w': 'none', // Warn about improperly formatted lines
      '--warn': 'none',
      '--tag': 'none', // BSD-style output
      '-z': 'none', // End output lines with NUL
      '--zero': 'none',
      '--help': 'none',
      '--version': 'none',
    },
  },
  sha1sum: {
    safeFlags: {
      '-b': 'none', // Binary mode
      '--binary': 'none',
      '-t': 'none', // Text mode
      '--text': 'none',
      '-c': 'none', // Verify checksums from file
      '--check': 'none',
      '--ignore-missing': 'none', // Ignore missing files during check
      '--quiet': 'none', // Quiet mode during check
      '--status': 'none', // Don't output, exit code shows success
      '--strict': 'none', // Exit non-zero for improperly formatted lines
      '-w': 'none', // Warn about improperly formatted lines
      '--warn': 'none',
      '--tag': 'none', // BSD-style output
      '-z': 'none', // End output lines with NUL
      '--zero': 'none',
      '--help': 'none',
      '--version': 'none',
    },
  },
  md5sum: {
    safeFlags: {
      '-b': 'none', // Binary mode
      '--binary': 'none',
      '-t': 'none', // Text mode
      '--text': 'none',
      '-c': 'none', // Verify checksums from file
      '--check': 'none',
      '--ignore-missing': 'none', // Ignore missing files during check
      '--quiet': 'none', // Quiet mode during check
      '--status': 'none', // Don't output, exit code shows success
      '--strict': 'none', // Exit non-zero for improperly formatted lines
      '-w': 'none', // Warn about improperly formatted lines
      '--warn': 'none',
      '--tag': 'none', // BSD-style output
      '-z': 'none', // End output lines with NUL
      '--zero': 'none',
      '--help': 'none',
      '--version': 'none',
    },
  },
  tree: {
    safeFlags: {
      '-a': 'none', // All files
      '-d': 'none', // Directories only
      '-l': 'none', // Follow symlinks
      '-f': 'none', // Full path prefix
      '-x': 'none', // Stay on current filesystem
      '-L': 'number', // Max depth
      '-P': 'string', // Include pattern
      '-I': 'string', // Exclude pattern
      '--gitignore': 'none',
      '--gitfile': 'string',
      '--ignore-case': 'none',
      '--matchdirs': 'none',
      '--metafirst': 'none',
      '--prune': 'none',
      '--info': 'none',
      '--infofile': 'string',
      '--noreport': 'none',
      '--charset': 'string',
      '--filelimit': 'number',
      '-q': 'none', // Non-printable as ?
      '-N': 'none', // Non-printable as-is
      '-Q': 'none', // Quote filenames
      '-p': 'none', // Protections
      '-u': 'none', // Owner
      '-g': 'none', // Group
      '-s': 'none', // Size bytes
      '-h': 'none', // Human-readable sizes
      '--si': 'none',
      '--du': 'none',
      '-D': 'none', // Last modification time
      '--timefmt': 'string',
      '-F': 'none', // Append indicator
      '--inodes': 'none',
      '--device': 'none',
      '-v': 'none', // Version sort
      '-t': 'none', // Sort by mtime
      '-c': 'none', // Sort by ctime
      '-U': 'none', // Unsorted
      '-r': 'none', // Reverse sort
      '--dirsfirst': 'none',
      '--filesfirst': 'none',
      '--sort': 'string',
      '-i': 'none', // No indentation lines
      '-A': 'none', // ANSI line graphics
      '-S': 'none', // CP437 line graphics
      '-n': 'none', // No color
      '-C': 'none', // Color
      '-X': 'none', // XML output
      '-J': 'none', // JSON output
      '-H': 'string', // HTML output with base HREF
      '--nolinks': 'none',
      '--hintro': 'string',
      '--houtro': 'string',
      '-T': 'string', // HTML title
      '--hyperlink': 'none',
      '--scheme': 'string',
      '--authority': 'string',
      '--fromfile': 'none',
      '--fromtabfile': 'none',
      '--fflinks': 'none',
      '--help': 'none',
      '--version': 'none',
    },
  },
  date: {
    safeFlags: {
      '-d': 'string', // --date=STRING - display time described by STRING
      '--date': 'string',
      '-r': 'string', // --reference=FILE - display file's modification time
      '--reference': 'string',
      '-u': 'none', // --utc - use UTC
      '--utc': 'none',
      '--universal': 'none',
      '-I': 'none', // --iso-8601 (can have optional argument, but none type handles bare flag)
      '--iso-8601': 'string',
      '-R': 'none', // --rfc-email
      '--rfc-email': 'none',
      '--rfc-3339': 'string',
      '--debug': 'none',
      '--help': 'none',
      '--version': 'none',
    },
    additionalCommandIsDangerousCallback: (
      _rawCommand: string,
      args: string[],
    ) => {
      const flagsWithArgs = new Set([
        '-d',
        '--date',
        '-r',
        '--reference',
        '--iso-8601',
        '--rfc-3339',
      ])
      let i = 0
      while (i < args.length) {
        const token = args[i]!
        if (token.startsWith('--') && token.includes('=')) {
          i++
        } else if (token.startsWith('-')) {
          if (flagsWithArgs.has(token)) {
            i += 2 
          } else {
            i++ 
          }
        } else {
          if (!token.startsWith('+')) {
            return true 
          }
          i++
        }
      }
      return false 
    },
  },
  hostname: {
    safeFlags: {
      '-f': 'none', // --fqdn - display FQDN
      '--fqdn': 'none',
      '--long': 'none',
      '-s': 'none', // --short - display short name
      '--short': 'none',
      '-i': 'none', // --ip-address
      '--ip-address': 'none',
      '-I': 'none', // --all-ip-addresses
      '--all-ip-addresses': 'none',
      '-a': 'none', // --alias
      '--alias': 'none',
      '-d': 'none', // --domain
      '--domain': 'none',
      '-A': 'none', // --all-fqdns
      '--all-fqdns': 'none',
      '-v': 'none', // --verbose
      '--verbose': 'none',
      '-h': 'none', // --help
      '--help': 'none',
      '-V': 'none', // --version
      '--version': 'none',
    },
    regex: /^hostname(?:\s+(?:-[a-zA-Z]|--[a-zA-Z-]+))*\s*$/,
  },
  info: {
    safeFlags: {
      '-f': 'string', // --file - specify manual file to read
      '--file': 'string',
      '-d': 'string', // --directory - search path
      '--directory': 'string',
      '-n': 'string', // --node - specify node
      '--node': 'string',
      '-a': 'none', // --all
      '--all': 'none',
      '-k': 'string', // --apropos - search
      '--apropos': 'string',
      '-w': 'none', // --where - show location
      '--where': 'none',
      '--location': 'none',
      '--show-options': 'none',
      '--vi-keys': 'none',
      '--subnodes': 'none',
      '-h': 'none',
      '--help': 'none',
      '--usage': 'none',
      '--version': 'none',
    },
  },
  lsof: {
    safeFlags: {
      '-?': 'none',
      '-h': 'none',
      '-v': 'none',
      '-a': 'none',
      '-b': 'none',
      '-C': 'none',
      '-l': 'none',
      '-n': 'none',
      '-N': 'none',
      '-O': 'none',
      '-P': 'none',
      '-Q': 'none',
      '-R': 'none',
      '-t': 'none',
      '-U': 'none',
      '-V': 'none',
      '-X': 'none',
      '-H': 'none',
      '-E': 'none',
      '-F': 'none',
      '-g': 'none',
      '-i': 'none',
      '-K': 'none',
      '-L': 'none',
      '-o': 'none',
      '-r': 'none',
      '-s': 'none',
      '-S': 'none',
      '-T': 'none',
      '-x': 'none',
      '-A': 'string',
      '-c': 'string',
      '-d': 'string',
      '-e': 'string',
      '-k': 'string',
      '-p': 'string',
      '-u': 'string',
    },
    additionalCommandIsDangerousCallback: (_rawCommand, args) =>
      args.some(a => a === '+m' || a.startsWith('+m')),
  },
  pgrep: {
    safeFlags: {
      '-d': 'string',
      '--delimiter': 'string',
      '-l': 'none',
      '--list-name': 'none',
      '-a': 'none',
      '--list-full': 'none',
      '-v': 'none',
      '--inverse': 'none',
      '-w': 'none',
      '--lightweight': 'none',
      '-c': 'none',
      '--count': 'none',
      '-f': 'none',
      '--full': 'none',
      '-g': 'string',
      '--pgroup': 'string',
      '-G': 'string',
      '--group': 'string',
      '-i': 'none',
      '--ignore-case': 'none',
      '-n': 'none',
      '--newest': 'none',
      '-o': 'none',
      '--oldest': 'none',
      '-O': 'string',
      '--older': 'string',
      '-P': 'string',
      '--parent': 'string',
      '-s': 'string',
      '--session': 'string',
      '-t': 'string',
      '--terminal': 'string',
      '-u': 'string',
      '--euid': 'string',
      '-U': 'string',
      '--uid': 'string',
      '-x': 'none',
      '--exact': 'none',
      '-F': 'string',
      '--pidfile': 'string',
      '-L': 'none',
      '--logpidfile': 'none',
      '-r': 'string',
      '--runstates': 'string',
      '--ns': 'string',
      '--nslist': 'string',
      '--help': 'none',
      '-V': 'none',
      '--version': 'none',
    },
  },
  tput: {
    safeFlags: {
      '-T': 'string',
      '-V': 'none',
      '-x': 'none',
    },
    additionalCommandIsDangerousCallback: (
      _rawCommand: string,
      args: string[],
    ) => {
      const DANGEROUS_CAPABILITIES = new Set([
        'init',
        'reset',
        'rs1',
        'rs2',
        'rs3',
        'is1',
        'is2',
        'is3',
        'iprog',
        'if',
        'rf',
        'clear',
        'flash',
        'mc0',
        'mc4',
        'mc5',
        'mc5i',
        'mc5p',
        'pfkey',
        'pfloc',
        'pfx',
        'pfxl',
        'smcup',
        'rmcup',
      ])
      const flagsWithArgs = new Set(['-T'])
      let i = 0
      let afterDoubleDash = false
      while (i < args.length) {
        const token = args[i]!
        if (token === '--') {
          afterDoubleDash = true
          i++
        } else if (!afterDoubleDash && token.startsWith('-')) {
          if (token === '-S') return true
          if (
            !token.startsWith('--') &&
            token.length > 2 &&
            token.includes('S')
          )
            return true
          if (flagsWithArgs.has(token)) {
            i += 2
          } else {
            i++
          }
        } else {
          if (DANGEROUS_CAPABILITIES.has(token)) return true
          i++
        }
      }
      return false
    },
  },
  ss: {
    safeFlags: {
      '-h': 'none',
      '--help': 'none',
      '-V': 'none',
      '--version': 'none',
      '-n': 'none',
      '--numeric': 'none',
      '-r': 'none',
      '--resolve': 'none',
      '-a': 'none',
      '--all': 'none',
      '-l': 'none',
      '--listening': 'none',
      '-o': 'none',
      '--options': 'none',
      '-e': 'none',
      '--extended': 'none',
      '-m': 'none',
      '--memory': 'none',
      '-p': 'none',
      '--processes': 'none',
      '-i': 'none',
      '--info': 'none',
      '-s': 'none',
      '--summary': 'none',
      '-4': 'none',
      '--ipv4': 'none',
      '-6': 'none',
      '--ipv6': 'none',
      '-0': 'none',
      '--packet': 'none',
      '-t': 'none',
      '--tcp': 'none',
      '-M': 'none',
      '--mptcp': 'none',
      '-S': 'none',
      '--sctp': 'none',
      '-u': 'none',
      '--udp': 'none',
      '-d': 'none',
      '--dccp': 'none',
      '-w': 'none',
      '--raw': 'none',
      '-x': 'none',
      '--unix': 'none',
      '--tipc': 'none',
      '--vsock': 'none',
      '-f': 'string',
      '--family': 'string',
      '-A': 'string',
      '--query': 'string',
      '--socket': 'string',
      '-Z': 'none',
      '--context': 'none',
      '-z': 'none',
      '--contexts': 'none',
      '-b': 'none',
      '--bpf': 'none',
      '-E': 'none',
      '--events': 'none',
      '-H': 'none',
      '--no-header': 'none',
      '-O': 'none',
      '--oneline': 'none',
      '--tipcinfo': 'none',
      '--tos': 'none',
      '--cgroup': 'none',
      '--inet-sockopt': 'none',
    },
  },
  fd: { safeFlags: { ...FD_SAFE_FLAGS } },
  fdfind: { safeFlags: { ...FD_SAFE_FLAGS } },
  ...PYRIGHT_READ_ONLY_COMMANDS,
  ...DOCKER_READ_ONLY_COMMANDS,
}
const ANT_ONLY_COMMAND_ALLOWLIST: Record<string, CommandConfig> = {
  ...GH_READ_ONLY_COMMANDS,
  aki: {
    safeFlags: {
      '-h': 'none',
      '--help': 'none',
      '-k': 'none',
      '--keyword': 'none',
      '-s': 'none',
      '--semantic': 'none',
      '--no-adaptive': 'none',
      '-n': 'number',
      '--limit': 'number',
      '-o': 'number',
      '--offset': 'number',
      '--source': 'string',
      '--exclude-source': 'string',
      '-a': 'string',
      '--after': 'string',
      '-b': 'string',
      '--before': 'string',
      '--collection': 'string',
      '--drive': 'string',
      '--folder': 'string',
      '--descendants': 'none',
      '-m': 'string',
      '--meta': 'string',
      '-t': 'string',
      '--threshold': 'string',
      '--kw-weight': 'string',
      '--sem-weight': 'string',
      '-j': 'none',
      '--json': 'none',
      '-c': 'none',
      '--chunk': 'none',
      '--preview': 'none',
      '-d': 'none',
      '--full-doc': 'none',
      '-v': 'none',
      '--verbose': 'none',
      '--stats': 'none',
      '-S': 'number',
      '--summarize': 'number',
      '--explain': 'none',
      '--examine': 'string',
      '--url': 'string',
      '--multi-turn': 'number',
      '--multi-turn-model': 'string',
      '--multi-turn-context': 'string',
      '--no-rerank': 'none',
      '--audit': 'none',
      '--local': 'none',
      '--staging': 'none',
    },
  },
}
function getCommandAllowlist(): Record<string, CommandConfig> {
  let allowlist: Record<string, CommandConfig> = COMMAND_ALLOWLIST
  if (getPlatform() === 'windows') {
    const { xargs: _, ...rest } = allowlist
    allowlist = rest
  }
  if (process.env.USER_TYPE === 'ant') {
    return { ...allowlist, ...ANT_ONLY_COMMAND_ALLOWLIST }
  }
  return allowlist
}
const SAFE_TARGET_COMMANDS_FOR_XARGS = [
  'echo', // Output only, no dangerous flags
  'printf', // xargs runs /usr/bin/printf (binary), not bash builtin — no -v support
  'wc', // Read-only counting, no dangerous flags
  'grep', // Read-only search, no dangerous flags
  'head', // Read-only, no dangerous flags
  'tail', // Read-only (including -f follow), no dangerous flags
]
export function isCommandSafeViaFlagParsing(command: string): boolean {
  const parseResult = tryParseShellCommand(command, env => `$${env}`)
  if (!parseResult.success) return false
  const parsed = parseResult.tokens.map(token => {
    if (typeof token !== 'string') {
      token = token as { op: 'glob'; pattern: string }
      if (token.op === 'glob') {
        return token.pattern
      }
    }
    return token
  })
  const hasOperators = parsed.some(token => typeof token !== 'string')
  if (hasOperators) {
    return false
  }
  const tokens = parsed as string[]
  if (tokens.length === 0) {
    return false
  }
  let commandConfig: CommandConfig | undefined
  let commandTokens: number = 0
  const allowlist = getCommandAllowlist()
  for (const [cmdPattern] of Object.entries(allowlist)) {
    const cmdTokens = cmdPattern.split(' ')
    if (tokens.length >= cmdTokens.length) {
      let matches = true
      for (let i = 0; i < cmdTokens.length; i++) {
        if (tokens[i] !== cmdTokens[i]) {
          matches = false
          break
        }
      }
      if (matches) {
        commandConfig = allowlist[cmdPattern]
        commandTokens = cmdTokens.length
        break
      }
    }
  }
  if (!commandConfig) {
    return false 
  }
  if (tokens[0] === 'git' && tokens[1] === 'ls-remote') {
    for (let i = 2; i < tokens.length; i++) {
      const token = tokens[i]
      if (token && !token.startsWith('-')) {
        if (token.includes('://')) {
          return false
        }
        if (token.includes('@') || token.includes(':')) {
          return false
        }
        if (token.includes('$')) {
          return false
        }
      }
    }
  }
  for (let i = commandTokens; i < tokens.length; i++) {
    const token = tokens[i]
    if (!token) continue
    if (token.includes('$')) {
      return false
    }
    if (token.includes('{') && (token.includes(',') || token.includes('..'))) {
      return false
    }
  }
  if (
    !validateFlags(tokens, commandTokens, commandConfig, {
      commandName: tokens[0],
      rawCommand: command,
      xargsTargetCommands:
        tokens[0] === 'xargs' ? SAFE_TARGET_COMMANDS_FOR_XARGS : undefined,
    })
  ) {
    return false
  }
  if (commandConfig.regex && !commandConfig.regex.test(command)) {
    return false
  }
  if (!commandConfig.regex && /`/.test(command)) {
    return false
  }
  if (
    !commandConfig.regex &&
    (tokens[0] === 'rg' || tokens[0] === 'grep') &&
    /[\n\r]/.test(command)
  ) {
    return false
  }
  if (
    commandConfig.additionalCommandIsDangerousCallback &&
    commandConfig.additionalCommandIsDangerousCallback(
      command,
      tokens.slice(commandTokens),
    )
  ) {
    return false
  }
  return true
}
function makeRegexForSafeCommand(command: string): RegExp {
  return new RegExp(`^${command}(?:\\s|$)[^<>()$\`|{}&;\\n\\r]*$`)
}
const READONLY_COMMANDS = [
  ...EXTERNAL_READONLY_COMMANDS,
  'cal',
  'uptime',
  'cat',
  'head',
  'tail',
  'wc',
  'stat',
  'strings',
  'hexdump',
  'od',
  'nl',
  'id',
  'uname',
  'free',
  'df',
  'du',
  'locale',
  'groups',
  'nproc',
  'basename',
  'dirname',
  'realpath',
  'cut',
  'paste',
  'tr',
  'column',
  'tac', // Reverse cat — displays file contents in reverse line order
  'rev', // Reverse characters in each line
  'fold', // Wrap lines to specified width
  'expand', // Convert tabs to spaces
  'unexpand', // Convert spaces to tabs
  'fmt', // Simple text formatter — output to stdout only
  'comm', // Compare sorted files line by line
  'cmp', // Byte-by-byte file comparison
  'numfmt', // Number format conversion
  'readlink', // Resolve symlinks — displays target of symbolic link
  'diff',
  'true',
  'false',
  'sleep',
  'which',
  'type',
  'expr', // Evaluate expressions (arithmetic, string matching)
  'test', // Conditional evaluation (file checks, comparisons)
  'getconf', // Get system configuration values
  'seq', // Generate number sequences
  'tsort', // Topological sort
  'pr', // Paginate files for printing
]
const READONLY_COMMAND_REGEXES = new Set([
  ...READONLY_COMMANDS.map(makeRegexForSafeCommand),
  /^echo(?:\s+(?:'[^']*'|"[^"$<>\n\r]*"|[^|;&`$(){}><#\\!"'\s]+))*(?:\s+2>&1)?\s*$/,
  /^open-code-cli -h$/,
  /^open-code-cli --help$/,
  /^uniq(?:\s+(?:-[a-zA-Z]+|--[a-zA-Z-]+(?:=\S+)?|-[fsw]\s+\d+))*(?:\s|$)\s*$/, // Only allow flags, no input/output files
  /^pwd$/,
  /^whoami$/,
  /^node -v$/,
  /^node --version$/,
  /^python --version$/,
  /^python3 --version$/,
  /^history(?:\s+\d+)?\s*$/, // Only allow bare history or history with numeric argument - prevents file writing
  /^alias$/,
  /^arch(?:\s+(?:--help|-h))?\s*$/, // Only allow arch with help flags or no arguments
  /^ip addr$/, // Only allow "ip addr" with no additional arguments
  /^ifconfig(?:\s+[a-zA-Z][a-zA-Z0-9_-]*)?\s*$/, // Allow ifconfig with interface name only (must start with letter)
  /^jq(?!\s+.*(?:-f\b|--from-file|--rawfile|--slurpfile|--run-tests|-L\b|--library-path|\benv\b|\$ENV\b))(?:\s+(?:-[a-zA-Z]+|--[a-zA-Z-]+(?:=\S+)?))*(?:\s+'[^'`]*'|\s+"[^"`]*"|\s+[^-\s'"][^\s]*)+\s*$/,
  /^cd(?:\s+(?:'[^']*'|"[^"]*"|[^\s;|&`$(){}><#\\]+))?$/,
  /^ls(?:\s+[^<>()$`|{}&;\n\r]*)?$/,
  /^find(?:\s+(?:\\[()]|(?!-delete\b|-exec\b|-execdir\b|-ok\b|-okdir\b|-fprint0?\b|-fls\b|-fprintf\b)[^<>()$`|{}&;\n\r\s]|\s)+)?$/,
])
function containsUnquotedExpansion(command: string): boolean {
  let inSingleQuote = false
  let inDoubleQuote = false
  let escaped = false
  for (let i = 0; i < command.length; i++) {
    const currentChar = command[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (currentChar === '\\' && !inSingleQuote) {
      escaped = true
      continue
    }
    if (currentChar === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      continue
    }
    if (currentChar === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      continue
    }
    if (inSingleQuote) {
      continue
    }
    if (currentChar === '$') {
      const next = command[i + 1]
      if (next && /[A-Za-z_@*#?!$0-9-]/.test(next)) {
        return true
      }
    }
    if (inDoubleQuote) {
      continue
    }
    if (currentChar && /[?*[\]]/.test(currentChar)) {
      return true
    }
  }
  return false
}
function isCommandReadOnly(command: string): boolean {
  let testCommand = command.trim()
  if (testCommand.endsWith(' 2>&1')) {
    testCommand = testCommand.slice(0, -5).trim()
  }
  if (containsVulnerableUncPath(testCommand)) {
    return false
  }
  if (containsUnquotedExpansion(testCommand)) {
    return false
  }
  if (isCommandSafeViaFlagParsing(testCommand)) {
    return true
  }
  for (const regex of READONLY_COMMAND_REGEXES) {
    if (regex.test(testCommand)) {
      if (testCommand.includes('git') && /\s-c[\s=]/.test(testCommand)) {
        return false
      }
      if (
        testCommand.includes('git') &&
        /\s--exec-path[\s=]/.test(testCommand)
      ) {
        return false
      }
      if (
        testCommand.includes('git') &&
        /\s--config-env[\s=]/.test(testCommand)
      ) {
        return false
      }
      return true
    }
  }
  return false
}
function commandHasAnyGit(command: string): boolean {
  return splitCommand_DEPRECATED(command).some(subcmd =>
    isNormalizedGitCommand(subcmd.trim()),
  )
}
const GIT_INTERNAL_PATTERNS = [
  /^HEAD$/,
  /^objects(?:\/|$)/,
  /^refs(?:\/|$)/,
  /^hooks(?:\/|$)/,
]
function isGitInternalPath(path: string): boolean {
  const normalized = path.replace(/^\.?\//, '')
  return GIT_INTERNAL_PATTERNS.some(pattern => pattern.test(normalized))
}
const NON_CREATING_WRITE_COMMANDS = new Set(['rm', 'rmdir', 'sed'])
function extractWritePathsFromSubcommand(subcommand: string): string[] {
  const parseResult = tryParseShellCommand(subcommand, env => `$${env}`)
  if (!parseResult.success) return []
  const tokens = parseResult.tokens.filter(
    (t): t is string => typeof t === 'string',
  )
  if (tokens.length === 0) return []
  const baseCmd = tokens[0]
  if (!baseCmd) return []
  if (!(baseCmd in COMMAND_OPERATION_TYPE)) {
    return []
  }
  const opType = COMMAND_OPERATION_TYPE[baseCmd as PathCommand]
  if (
    (opType !== 'write' && opType !== 'create') ||
    NON_CREATING_WRITE_COMMANDS.has(baseCmd)
  ) {
    return []
  }
  const extractor = PATH_EXTRACTORS[baseCmd as PathCommand]
  if (!extractor) return []
  return extractor(tokens.slice(1))
}
function commandWritesToGitInternalPaths(command: string): boolean {
  const subcommands = splitCommand_DEPRECATED(command)
  for (const subcmd of subcommands) {
    const trimmed = subcmd.trim()
    const writePaths = extractWritePathsFromSubcommand(trimmed)
    for (const path of writePaths) {
      if (isGitInternalPath(path)) {
        return true
      }
    }
    const { redirections } = extractOutputRedirections(trimmed)
    for (const { target } of redirections) {
      if (isGitInternalPath(target)) {
        return true
      }
    }
  }
  return false
}
export function checkReadOnlyConstraints(
  input: z.infer<typeof BashTool.inputSchema>,
  compoundCommandHasCd: boolean,
): PermissionResult {
  const { command } = input
  const result = tryParseShellCommand(command, env => `$${env}`)
  if (!result.success) {
    return {
      behavior: 'passthrough',
      message: 'Command cannot be parsed, requires further permission checks',
    }
  }
  if (bashCommandIsSafe_DEPRECATED(command).behavior !== 'passthrough') {
    return {
      behavior: 'passthrough',
      message: 'Command is not read-only, requires further permission checks',
    }
  }
  if (containsVulnerableUncPath(command)) {
    return {
      behavior: 'ask',
      message:
        'Command contains Windows UNC path that could be vulnerable to WebDAV attacks',
    }
  }
  const hasGitCommand = commandHasAnyGit(command)
  if (compoundCommandHasCd && hasGitCommand) {
    return {
      behavior: 'passthrough',
      message:
        'Compound commands with cd and git require permission checks for enhanced security',
    }
  }
  if (hasGitCommand && isCurrentDirectoryBareGitRepo()) {
    return {
      behavior: 'passthrough',
      message:
        'Git commands in directories with bare repository structure require permission checks for enhanced security',
    }
  }
  if (hasGitCommand && commandWritesToGitInternalPaths(command)) {
    return {
      behavior: 'passthrough',
      message:
        'Compound commands that create git internal files and run git require permission checks for enhanced security',
    }
  }
  if (
    hasGitCommand &&
    SandboxManager.isSandboxingEnabled() &&
    getCwd() !== getOriginalCwd()
  ) {
    return {
      behavior: 'passthrough',
      message:
        'Git commands outside the original working directory require permission checks when sandbox is enabled',
    }
  }
  const allSubcommandsReadOnly = splitCommand_DEPRECATED(command).every(
    subcmd => {
      if (bashCommandIsSafe_DEPRECATED(subcmd).behavior !== 'passthrough') {
        return false
      }
      return isCommandReadOnly(subcmd)
    },
  )
  if (allSubcommandsReadOnly) {
    return {
      behavior: 'allow',
      updatedInput: input,
    }
  }
  return {
    behavior: 'passthrough',
    message: 'Command is not read-only, requires further permission checks',
  }
}
