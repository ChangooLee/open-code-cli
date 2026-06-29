# Open Code CLI

OpenAI-compatible terminal coding agent. Works with any `/chat/completions` endpoint (OpenRouter, OpenAI, local server).

It runs an interactive REPL or a headless `-p` agent loop, drives a full tool suite (shell, files, web, subagents, MCP), and ships an **opt-in autonomy & verification layer** that adds bounded-autonomy limits, loop detection, a token/wall-clock budget, multi-agent join barriers, and a completion gate that requires non-trivial work to be independently verified before the agent may report success. Every one of those mechanisms is **off by default** and compiled in only when explicitly enabled, so the default build behaves exactly like the base agent.

## Features

### Agent & sessions

- Interactive REPL (default) and headless `-p` / `--print` mode
- Session persistence, resume (`--resume`, `--continue`), branch, rename, rewind
- Plan mode (`/plan`, EnterPlanMode / ExitPlanMode tools)
- Context compaction (`/compact`), file history, worktree sessions (`-w`, `--worktree`, `--tmux`)
- Custom agents (`--agent`, `--agents`, `/agents`) and subagents (`Agent` tool, `/branch`)
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

`/add-dir` `/advisor` `/agents` `/branch` `/brief` `/btw` `/buddy` `/chrome` `/clear` `/color` `/compact` `/config` `/context` `/copy` `/cost` `/desktop` `/diff` `/doctor` `/effort` `/exit` `/export` `/fast` `/feedback` `/files` `/help` `/hooks` `/ide` `/init` `/insights` `/install` `/install-github-app` `/install-slack-app` `/keybindings` `/login` `/logout` `/mcp` `/memory` `/mobile` `/model` `/output-style` `/passes` `/peers` `/permissions` `/plan` `/plugin` `/pr-comments` `/privacy-settings` `/rate-limit-options` `/reload-plugins` `/remote-control` `/remote-env` `/rename` `/resume` `/review` `/rewind` `/sandbox` `/security-review` `/session` `/skills` `/stats` `/status` `/statusline` `/stickers` `/tag` `/tasks` `/terminal-setup` `/theme` `/think-back` `/thinkback-play` `/torch` `/ultrareview` `/ultraplan` `/upgrade` `/usage` `/vim` `/voice` `/web-setup` `/workflows`

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

### Autonomy & verification (opt-in)

A layer of long-horizon-autonomy mechanisms, all **default-off** and compiled in only via build-time feature flags (see [Autonomy & verification mechanisms](#autonomy--verification-mechanisms)). They make the agent safer to run unattended and harder to let report unverified work:

- **Completion verification gate** — non-trivial work (≥ N file edits, or any subagent that self-reports failure) cannot be reported as complete until an independent verification subagent runs build/test commands and returns a `VERDICT: PASS`. Spoof-resistant: markers are correlated to genuine `Agent`/verifier tool-call ids.
- **Bounded autonomy** — a default turn cap, a wall-clock deadline, and a token budget (main loop and subagents) so a run always terminates.
- **Loop detection** — stops identical-call loops, A/B oscillation, and near-duplicate calls (volatile fields normalized).
- **Multi-agent join & abort** — an await-join barrier reaps in-flight background subagents before the parent reports completion; parent abort chains to children; recursion depth is capped.
- **Capability benchmark** — a reproducible, model-agnostic task-success harness (`npm run bench`).

## Install & build

```bash
git clone https://github.com/ChangooLee/open-code-cli.git
cd open-code-cli
npm install
npm run build
```

The default build (no feature flags) is the safety baseline: every `feature('FLAG')` call is folded to `false` and dead-stripped, so the autonomy/verification code is not present at all. To compile a build with selected mechanisms enabled, set `OPEN_CODE_CLI_FEATURES` (comma-separated) at build time:

```bash
# Example: completion gate + bounded autonomy + loop detection + async join
OPEN_CODE_CLI_FEATURES=VERIFY_IMPLEMENTATION_BEFORE_COMPLETION,VERIFICATION_AGENT,BOUNDED_AUTONOMY,AGENT_LOOP_DETECTION,ASYNC_AGENT_JOIN \
  npm run build
```

## Configuration

| Variable | Required | Default |
| --- | --- | --- |
| `OPEN_CODE_CLI_API_KEY` | yes | — |
| `OPEN_CODE_CLI_BASE_URL` | no | `https://openrouter.ai/api/v1` |
| `OPEN_CODE_CLI_MODEL` | no | request model |
| `OPEN_CODE_CLI_NONTRIVIAL_EDIT_THRESHOLD` | no | `3` (gate strictness; needs `CONFIGURABLE_EDIT_THRESHOLD`) |
| `OPEN_CODE_CLI_FEATURES` | no (build-time) | none |

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

## Autonomy & verification mechanisms

These are compiled in only when their flag is listed in `OPEN_CODE_CLI_FEATURES` at build time. Unset, they are dead-stripped and the agent behaves identically to the base build.

| Flag | What it adds |
| --- | --- |
| `VERIFY_IMPLEMENTATION_BEFORE_COMPLETION` | Completion gate: blocks reporting success on non-trivial work until an independent verifier returns `VERDICT: PASS`; after a bounded number of re-prompts it fails the run explicitly rather than completing unverified. Counts edit-tool calls **and** file-mutating Bash (`sed -i`, redirects, `cp`/`mv`, …). |
| `VERIFICATION_AGENT` | Enables the verification subagent type the gate delegates to. |
| `CONFIGURABLE_EDIT_THRESHOLD` | Lets `OPEN_CODE_CLI_NONTRIVIAL_EDIT_THRESHOLD` tune how many edits count as "non-trivial" (floor of 1 — the gate can never be configured to ignore every edit). |
| `BOUNDED_AUTONOMY` | A default max-turn cap (model-call counted at a single site, so continuation paths can't bypass it). |
| `WALL_CLOCK_DEADLINE` | A wall-clock deadline that terminates a runaway long-running session. |
| `TOKEN_BUDGET` / `SUBAGENT_TOKEN_BUDGET` | Token budgets for the main loop and for subagents. |
| `AGENT_LOOP_DETECTION` | Stops after N identical tool calls. |
| `AGENT_LOOP_DETECTION_OSCILLATION` | Also stops A/B/A/B oscillation loops. |
| `AGENT_LOOP_DETECTION_NORMALIZE` | Normalizes volatile input fields so near-duplicate calls are detected. |
| `ASYNC_AGENT_JOIN` | Await-join barrier: reaps in-flight background subagents (and their unverified edits / failures) before the parent's completion gate runs. |
| `SUBAGENT_RECURSION_DEPTH_CAP` | Caps how deep subagents may spawn subagents. |
| `MULTI_AGENT_CHILD_ABORT` | Chains a parent abort to its child agents. |
| `MID_TOOL_ABORT_CHECKPOINT` | Honors abort during long in-tool waits (e.g. MCP readiness polling). |
| `COORDINATOR_WAIT_FOR_AGENTS_HINT` | Adds a `WaitForAgents` structural-join hint to the coordinator prompt. |
| `REACTIVE_COMPACT_SAFE` | Hardens the experimental reactive-compaction stub so enabling it cannot crash the loop. |
| `STRICT_TOOL_IO` | Stricter tool input/output validation. |

The default test build runs with the core mechanisms on so the gated logic is exercised (see `scripts/test.mjs`).

## Testing & benchmarks

```bash
npm run typecheck      # tsc --noEmit
npm test               # unit tests (bundled with mechanism flags ON)
npm run test:e2e       # builds the real CLI + a mock model server; asserts the gate end-to-end
npm run bench:selftest # self-test the capability benchmark harness (solve => all pass, noop => none)
```

### Capability benchmark

`npm run bench` measures an objective, reproducible **task-success rate** instead of a subjective estimate: each task under `bench/tasks/<name>/` ships starter files and a `check` command whose exit code (0 = solved) is the verdict. Point it at any OpenAI-compatible model:

```bash
OPEN_CODE_CLI_BASE_URL=https://api.example/v1 \
OPEN_CODE_CLI_MODEL=your-model \
OPEN_CODE_CLI_API_KEY=sk-... \
npm run bench
```

Build the CLI with mechanism flags on to measure their effect on the success rate:

```bash
BENCH_FEATURES=VERIFY_IMPLEMENTATION_BEFORE_COMPLETION,BOUNDED_AUTONOMY npm run bench
```

See [`bench/README.md`](bench/README.md) for adding tasks and the self-test details.

## Architecture notes

- **Build:** esbuild bundle (`scripts/build.mjs`). The `feature('FLAG')` macro is inlined from `OPEN_CODE_CLI_FEATURES` and false branches are dead-code-eliminated, so disabled mechanisms add zero bytes and zero behavior to the default build.
- **Agent loop:** `query.ts` (the `query()` async generator) consumed by `QueryEngine`, with subagents spawned via `runAgent.ts` / the `Agent` tool.
- **Verification gate:** `query/verificationGate.ts` is the single composition point — edit/Bash counting, background-signal aggregation, the await-join barrier, and the allow/block/fail decision.
