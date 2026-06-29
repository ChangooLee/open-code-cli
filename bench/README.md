# Capability benchmark

A reproducible, model-agnostic measure of how well open-code-cli actually
*solves* coding tasks — an objective task-success rate instead of a subjective
"how close to X" estimate.

Each task under `bench/tasks/<name>/` has:

- `task.json` — `{ name, description, prompt, allowedTools, maxTurns, check }`
- `files/` — starter files copied into a fresh temp workdir before the run

The agent runs in that workdir against the configured model. The task's `check`
command then runs in the same workdir; **exit code 0 means the agent solved
it.** No mock grading, no heuristics — the code either passes its test or not.

## Run against a real model

```sh
OPEN_CODE_CLI_BASE_URL=https://api.example/v1 \
OPEN_CODE_CLI_MODEL=your-model \
OPEN_CODE_CLI_API_KEY=sk-... \
npm run bench
```

Prints a scorecard and a machine-readable JSON summary (`{ passed, total, pct, rows }`)
on stdout. This is the honest capability number: harness × model on real tasks.

Build with ultracode-mechanism flags ON to measure their effect:

```sh
BENCH_FEATURES=VERIFY_IMPLEMENTATION_BEFORE_COMPLETION,BOUNDED_AUTONOMY npm run bench
```

## Self-test the harness (no real model)

A deterministic mock proves the harness scores correctly — a solved task as
PASS, an unsolved one as FAIL:

```sh
npm run bench:selftest
# solve mode => 2/2 pass ; noop mode => 0/2 pass
```

## Add a task

Create `bench/tasks/<name>/task.json` + `bench/tasks/<name>/files/`. The runner
auto-discovers any directory containing a `task.json`. Keep `check` fast and
self-contained (no network). For the `--mock` self-test to also cover the new
task, add its solution to `SOLUTIONS` in `benchMockServer.mjs`.
