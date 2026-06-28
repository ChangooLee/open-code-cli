# Open Code CLI

> An open coding agent for your terminal — bring your own OpenAI‑compatible model.

**Open Code CLI** is an AI coding agent that lives in your terminal. It reads and
edits your codebase, runs commands, searches, plans, and drives multi‑step tasks
through an agentic tool loop — but instead of being tied to a single hosted model,
it talks to **any OpenAI‑compatible `/chat/completions` endpoint** (OpenRouter,
OpenAI, or a local OpenAI‑compatible server).

> ⚠️ **Status: experimental.** This is a **new, independent project** still in
> early development. The ~200 internal source modules that were missing from this
> tree have been **reconstructed** (consumer‑driven inference), so the esbuild
> bundle now **builds and runs** for basic commands (`--version`, `--help`). Full
> `tsc --noEmit` does **not** yet pass (mostly pre‑existing implicit‑any and
> type‑mismatch errors plus reconstruction‑fidelity gaps — see
> [Status & known issues](#status--known-issues)). Reconstructed modules are
> best‑effort and their runtime behavior may differ from the original.

## What it does

The agent ships with a full agentic tool set (names as defined in `tools/`):

- **Shell**: `Bash`, `PowerShell`, `REPL`, `Sleep`
- **Files**: `FileRead`, `FileWrite`, `FileEdit`, `NotebookEdit`, `Glob`, `Grep`
- **Web**: `WebFetch`, `WebSearch`
- **Agents & tasks**: `Agent`, `Task*` (create/get/list/output/stop/update),
  `Team*`, `TodoWrite`, `EnterPlanMode` / `ExitPlanMode`, worktree tools
- **MCP**: `MCP`, `McpAuth`, `ListMcpResources`, `ReadMcpResource` — connect to
  [Model Context Protocol](https://modelcontextprotocol.io) servers
- **Skills**: `Skill` + a bundled skills system (`skills/`)
- **Extras**: `LSP`, `ScheduleCron`, `ToolSearch`, `Brief`, `Config`,
  `AskUserQuestion`, `SendMessage`, and more

Around the tools it provides:

- **~100 slash commands** (`commands/`) — e.g. `/commit`, `/compact`, `/context`,
  `/config`, `/doctor`, `/agents`, `/help`, `/login`, …
- **Hooks** (`hooks/`) and a **plugin system** (`plugins/`)
- **MCP client/server** integration (`services/mcp/`)
- An **Ink/React terminal UI** (interactive REPL) with a non‑interactive
  `-p/--print` mode

## Requirements

- **Node.js ≥ 20** (developed on Node 23)
- A **Bun** bundle path may exist in related tooling; this repo's primary build
  path is Node + esbuild (see [Build](#build)).

## Install & build

```bash
git clone https://github.com/ChangooLee/open-code-cli.git
cd open-code-cli
npm install
```

### Type‑check

```bash
npm run typecheck   # tsc --noEmit
```

### Build

```bash
npm run build       # node scripts/build.mjs  (esbuild, experimental)
```

The build now produces a bundle at `dist/cli.mjs` and runs basic commands:

```bash
node dist/cli.mjs --version   # 0.1.0 (Open Code CLI)
node dist/cli.mjs --help      # prints usage
```

> `npm run typecheck` still reports errors (it does not pass — see
> [Status](#status--known-issues)). The esbuild build does not type‑check, so
> the bundle builds despite those errors. The `bun:bundle`/`MACRO` macros are
> reproduced in `scripts/build.mjs` (build‑time `feature()` inlining + dead‑code
> elimination) so disabled/optional branches are dropped.

## Configuration (OpenAI‑compatible providers)

Open Code CLI sends requests to a single OpenAI‑compatible `/chat/completions`
endpoint. Configure it with environment variables:

```bash
export OPEN_CODE_CLI_API_KEY="..."                       # your provider API key
export OPEN_CODE_CLI_BASE_URL="https://openrouter.ai/api/v1"
export OPEN_CODE_CLI_MODEL="openai/gpt-4o-mini"
```

Resolution / defaults (see `services/api/openaiCompatible.ts`):

| Variable | Purpose | Default |
| --- | --- | --- |
| `OPEN_CODE_CLI_API_KEY` | Provider API key (required) | — |
| `OPEN_CODE_CLI_BASE_URL` | Base URL of the OpenAI‑compatible API | `https://openrouter.ai/api/v1` |
| `OPEN_CODE_CLI_PROVIDER_BASE_URL` | Overrides `BASE_URL` if set | — |
| `OPEN_CODE_CLI_MODEL` | Model id sent as `model` | falls back to request model |
| `OPEN_CODE_CLI_HTTP_REFERER` / `OPEN_CODE_CLI_SITE_URL` | OpenRouter `HTTP-Referer` header | — |
| `OPEN_CODE_CLI_TITLE` | OpenRouter `X-Title` header | — |

### Supported providers

- **OpenRouter** (default): `OPEN_CODE_CLI_BASE_URL=https://openrouter.ai/api/v1`,
  model ids like `openai/gpt-4o-mini`, `openai/gpt-4o`, etc.
- **OpenAI**: `OPEN_CODE_CLI_BASE_URL=https://api.openai.com/v1`, model ids like
  `gpt-4o-mini`.
- **Local / self‑hosted OpenAI‑compatible servers** (vLLM, Ollama's OpenAI shim,
  LM Studio, llama.cpp server, …): point `OPEN_CODE_CLI_BASE_URL` at your local
  endpoint, e.g. `http://localhost:11434/v1`.

Any backend that implements OpenAI's `/chat/completions` (including tool calls and
streaming) should work.

## Status & known issues

Many internal modules in this tree were **reconstructed** (consumer‑driven
inference). Verification was run with `tsc --noEmit`, `node scripts/build.mjs`,
and a runtime smoke test:

- **Build: passes.** `node scripts/build.mjs` produces `dist/cli.mjs`, and
  `node dist/cli.mjs --version` / `--help` run successfully. All previously
  missing module imports now resolve (esbuild "Could not resolve" count: 0).
- **Module reconstruction.** ~200 internal modules were recreated from how their
  consumers import/use them (exports, value‑vs‑type, signatures, shapes). The
  keystone type modules (`types/message.ts` — imported by ~180 files —
  `types/tools.ts`, `types/utils.ts`, `constants/querySource.ts`,
  `entrypoints/sdk/*`, `services/openCodeCliLimits.ts`) are derived from real
  call sites; many leaf modules are best‑effort stubs whose **runtime behavior
  may differ from the original** (some throw `not implemented`).
- **Type‑check does not pass yet.** `tsc --noEmit` still reports a large number
  of errors, dominated by **pre‑existing implicit‑any parameters** (`TS7006`,
  ~1.8k — the source predates strict `noImplicitAny`) plus property/export
  mismatches (`TS2339`/`TS2305`/`TS2345`/`TS2322`) where reconstructed type
  shapes don't yet match every consumer. `tsconfig.json` is kept strict
  (`strict: true`, `noImplicitAny` on, `skipLibCheck` on) — it was **not**
  loosened to fake a pass, and no `@ts-nocheck` was added.
- A handful of optional integrations rely on **private/native packages** not on
  npm (`@ant/*`, `@open-code-cli/sandbox-runtime`, `@open-code-cli/mcpb`,
  various `*-napi` addons, some `@aws-sdk`/`@opentelemetry` exporters). These are
  declared in `types/vendor-stubs.d.ts` for `tsc` and resolved to permissive
  empty stubs at bundle time in `scripts/build.mjs`; the features that use them
  are gated behind `feature()` flags / runtime checks (off by default).

In short: the project now **builds and starts**, but full type‑checking and the
fidelity of reconstructed leaf modules remain works in progress.

## Project layout (selected)

```
entrypoints/      CLI bootstrap (cli.tsx) and SDK entrypoints
services/api/     Provider layer — OpenAI-compatible /chat/completions path
tools/            Agent tools (Bash, FileEdit, Grep, Agent, WebFetch, …)
commands/         Slash commands
services/mcp/     MCP client/server
skills/ hooks/    Skills and lifecycle hooks
constants/        Product metadata, prompts, betas
types/            Shared types + build-macro / vendor shims
scripts/build.mjs Experimental Node/esbuild build (Bun fallback)
```
