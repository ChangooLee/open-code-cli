# Open Code CLI

OpenAI-compatible terminal coding agent. Works with any `/chat/completions` endpoint (OpenRouter, OpenAI, local server).

## Features

### Agent & sessions

- Interactive REPL (default) and headless `-p` / `--print` mode
- Session persistence, resume (`--resume`, `--continue`), fork (`--fork-session`), rename, rewind
- Plan mode (`/plan`, EnterPlanMode / ExitPlanMode tools)
- Context compaction (`/compact`), file history, worktree sessions (`-w`, `--worktree`, `--tmux`)
- Custom agents (`--agent`, `--agents`, `/agents`) and subagents (`Agent` tool, `/fork`)
- Multi-agent swarms (`TeamCreate`, `TeamDelete`, `SendMessage`, `/peers`)
- Background tasks, cron triggers (`CronCreate`, `CronDelete`, `CronList`, `RemoteTrigger`)
- Session server (`open-code-cli server`), remote SSH (`open-code-cli ssh`), cc:// connect (`open-code-cli open`)
- Daemon / assistant bridge (`open-code-cli assistant`, `/remote-control`, `/brief`, `/assistant`)
- Ultraplan (`/ultraplan`) — remote multi-agent planning session

### Tools

- **Shell:** Bash, PowerShell
- **Files:** Read, Edit, Write, Glob, Grep, NotebookEdit
- **Web:** WebFetch, WebSearch, WebBrowser
- **Agent:** Agent (Task), TaskOutput, TaskStop, AskUserQuestion, TodoWrite
- **Tasks (v2):** TaskCreate, TaskGet, TaskUpdate, TaskList
- **Plan & workflow:** EnterPlanMode, ExitPlanMode, Workflow, VerifyPlanExecution
- **Skills & search:** Skill, ToolSearch, DiscoverSkills
- **MCP:** ListMcpResourcesTool, ReadMcpResourceTool, dynamic MCP tools
- **Other:** LSP, EnterWorktree, ExitWorktree, Snip, Sleep, Monitor, SendUserMessage, SendUserFile, TerminalCapture, CtxInspect, StructuredOutput, PushNotification, SubscribePR, ListPeers, REPL, Config, Tungsten, ReviewArtifact, OverflowTest
- Tool allow/deny lists (`--tools`, `--allowed-tools`, `--disallowed-tools`)

### Slash commands

`/add-dir` `/advisor` `/agents` `/branch` `/brief` `/btw` `/buddy` `/chrome` `/clear` `/color` `/compact` `/config` `/context` `/copy` `/cost` `/desktop` `/diff` `/doctor` `/effort` `/exit` `/export` `/fast` `/feedback` `/files` `/fork` `/help` `/hooks` `/ide` `/init` `/insights` `/install` `/install-github-app` `/install-slack-app` `/keybindings` `/login` `/logout` `/mcp` `/memory` `/mobile` `/model` `/output-style` `/passes` `/peers` `/permissions` `/plan` `/plugin` `/pr-comments` `/privacy-settings` `/rate-limit-options` `/reload-plugins` `/remote-control` `/remote-env` `/rename` `/resume` `/review` `/rewind` `/sandbox` `/security-review` `/session` `/skills` `/stats` `/status` `/statusline` `/stickers` `/tag` `/tasks` `/terminal-setup` `/theme` `/think-back` `/thinkback-play` `/torch` `/ultrareview` `/ultraplan` `/upgrade` `/usage` `/vim` `/voice` `/web-setup` `/workflows`

Plus user/project skills (`/skill-name`), plugin commands, workflow commands, and bundled skills (e.g. verify, openai-compatible-api).

### MCP integration

- Configure servers in settings or `.mcp.json` (`/mcp`, `open-code-cli mcp`)
- Transports: stdio, SSE, HTTP; OAuth auth; project approval flow
- CLI: `mcp serve|list|get|add-json|remove|add-from-open-code-desktop|reset-project-choices`
- `--mcp-config`, `--strict-mcp-config`, MCP skills and resources in the agent loop

### Permissions & sandbox

- Permission modes: default, plan, acceptEdits, dontAsk, bypassPermissions, auto
- Allow / deny / ask rules (`/permissions`, settings `permissions.*`)
- Interactive tool approval; `--dangerously-skip-permissions`, `--allow-dangerously-skip-permissions`
- Sandbox (`/sandbox`): network isolation, auto-allow bash, unsandboxed fallback
- `--bare` minimal mode (skips hooks, LSP, plugins sync, auto-memory)

### Hooks

- Lifecycle hooks: PreToolUse, PostToolUse, PostToolUseFailure, PermissionRequest, UserPromptSubmit, SessionStart, PreCompact, PostCompact, Notification, Stop
- Hook types: shell command, LLM prompt, agent
- View config via `/hooks`; `--include-hook-events` in stream-json output

### Skills & plugins

- Skills from bundled, user (`~/.open-code-cli/skills`), project (`.open-code-cli/skills`), plugins (`/skills`)
- Plugin marketplaces: install, enable, disable, update (`/plugin`, `open-code-cli plugin`)
- `--plugin-dir`, `/reload-plugins`

### Provider & auth

- OpenAI-compatible API via `OPEN_CODE_CLI_API_KEY`, `OPEN_CODE_CLI_BASE_URL`, `OPEN_CODE_CLI_MODEL`
- Providers: OpenRouter (default), OpenAI, any local `/chat/completions` server
- OAuth login (`/login`, `open-code-cli auth`), API key helper, setup-token
- Model aliases, effort levels (`/effort`), fallback model (`--fallback-model`), `--betas`

### Integrations

- IDE connect (`/ide`, `--ide`), Open Code in Chrome (`/chrome`, `--chrome`)
- Desktop & mobile remote control (`/desktop`, `/mobile`, `/session`)
- Voice mode (`/voice`)
- GitHub / Slack app install commands
- Vim mode (`/vim`), keybindings (`/keybindings`), themes (`/theme`), output style, status line
- Memory (`/memory`), advisor, proactive mode, think-back playback

### Headless & SDK

- `-p "prompt"` with `--output-format text|json|stream-json`
- `--input-format stream-json`, structured output (`--json-schema`)
- `--max-turns`, `--max-budget-usd`, `--no-session-persistence`, `--rewind-files`
- Agent SDK daemon, remote control bridge, hook events in NDJSON streams

### Privacy & telemetry

- Opt-in product improvement telemetry (`/privacy-settings`, Grove)
- Usage and cost tracking (`/usage`, `/cost`, `/stats`, `/passes`)

## Install & build

```bash
git clone https://github.com/ChangooLee/open-code-cli.git
cd open-code-cli
npm install
npm run build
```

## Configuration

| Variable | Required | Default |
| --- | --- | --- |
| `OPEN_CODE_CLI_API_KEY` | yes | — |
| `OPEN_CODE_CLI_BASE_URL` | no | `https://openrouter.ai/api/v1` |
| `OPEN_CODE_CLI_MODEL` | no | request model |

Settings files: `~/.open-code-cli/settings.json`, `.open-code-cli/settings.json`, `.open-code-cli/settings.local.json`.

```bash
export OPEN_CODE_CLI_API_KEY="..."
export OPEN_CODE_CLI_BASE_URL="https://openrouter.ai/api/v1"
export OPEN_CODE_CLI_MODEL="openai/gpt-4o-mini"
```

## Usage

Interactive session:

```bash
node dist/cli.mjs
open-code-cli
```

Non-interactive (pipes, scripts, CI):

```bash
node dist/cli.mjs -p "Explain this project"
open-code-cli -p "Fix the failing test" --output-format json
open-code-cli --continue -p "Keep going"
```

Common flags: `--model`, `--agent`, `--permission-mode`, `--settings`, `--add-dir`, `--resume`, `--worktree`, `--mcp-config`, `--debug`.
