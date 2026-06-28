# Open Code CLI

OpenAI-compatible terminal coding agent. Works with any `/chat/completions` endpoint (OpenRouter, OpenAI, local server).

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

```bash
export OPEN_CODE_CLI_API_KEY="..."
export OPEN_CODE_CLI_BASE_URL="https://openrouter.ai/api/v1"
export OPEN_CODE_CLI_MODEL="openai/gpt-4o-mini"
```

## Usage

```bash
node dist/cli.mjs
node dist/cli.mjs -p "Explain this project"
```
