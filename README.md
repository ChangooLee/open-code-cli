# Open Code CLI

> An open coding agent for your terminal — bring your own OpenAI‑compatible model.

**Open Code CLI** is an AI coding agent that lives in your terminal. It reads and
edits your codebase, runs commands, searches, plans, and drives multi‑step tasks
through an agentic tool loop — but instead of being tied to a single hosted model,
it talks to **any OpenAI‑compatible `/chat/completions` endpoint** (OpenRouter,
OpenAI, or a local OpenAI‑compatible server).

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

- **Node.js ≥ 20**

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
npm run build       # node scripts/build.mjs  (esbuild)
```

The build produces a bundle at `dist/cli.mjs`:

```bash
node dist/cli.mjs --version   # 0.1.0 (Open Code CLI)
node dist/cli.mjs --help      # prints usage
```

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
scripts/build.mjs Node/esbuild build
```
