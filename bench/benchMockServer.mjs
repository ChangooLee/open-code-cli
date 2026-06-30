// Deterministic OpenAI-compatible mock model for benchmark self-validation.
//
// BENCH_BEHAVIOR=solve : writes the correct solution files, so every task's
//   check command passes — proving the harness scores a solved task as PASS.
// BENCH_BEHAVIOR=noop  : never edits anything, just declares it is done —
//   proving the harness scores an unsolved task as FAIL.
//
// This is NOT a model. It exists only to prove the benchmark measures
// pass/fail correctly. Real capability numbers come from pointing the
// benchmark at an actual model via OPEN_CODE_CLI_BASE_URL/MODEL.
import http from 'node:http'

const PORT = process.env.MOCK_PORT ? Number(process.env.MOCK_PORT) : 8242
const BEHAVIOR = process.env.BENCH_BEHAVIOR || 'solve'
const HARD_REQUEST_CAP = 60
let requestCount = 0

const SOLUTIONS = [
  { file: 'add.js', content: 'function add(a, b) {\n  return a + b;\n}\nmodule.exports = { add };\n' },
  { file: 'sum.js', content: 'function sum(arr) {\n  return arr.reduce((a, b) => a + b, 0);\n}\nmodule.exports = { sum };\n' },
]

function send(res, obj) {
  res.write(`data: ${JSON.stringify(obj)}\n\n`)
}

function countToolCalls(messages, names) {
  const set = Array.isArray(names) ? new Set(names) : new Set([names])
  let n = 0
  for (const m of messages) {
    if (m.role === 'assistant' && Array.isArray(m.tool_calls)) {
      for (const tc of m.tool_calls) if (tc.function && set.has(tc.function.name)) n++
    }
  }
  return n
}

// The CLI's Write tool requires an existing file to be Read first, so each
// solution is applied as a Read-then-Write pair.
const STEPS = []
for (const sol of SOLUTIONS) {
  STEPS.push({ tool: 'Read', args: { file_path: sol.file } })
  STEPS.push({ tool: 'Write', args: { file_path: sol.file, content: sol.content } })
}

const server = http.createServer((req, res) => {
  let body = ''
  req.on('data', c => (body += c))
  req.on('end', () => {
    requestCount++
    let parsed = {}
    try {
      parsed = JSON.parse(body || '{}')
    } catch {}
    const model = parsed.model || 'mock'
    const messages = parsed.messages || []
    const base = { id: 'chatcmpl-bench', object: 'chat.completion.chunk', model }
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    })
    send(res, { ...base, choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] })

    const emitText = t => {
      send(res, { ...base, choices: [{ index: 0, delta: { content: t }, finish_reason: null }] })
      send(res, {
        ...base,
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
        usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
      })
    }
    const emitTool = (id, name, args) => {
      send(res, {
        ...base,
        choices: [
          { index: 0, delta: { tool_calls: [{ index: 0, id, type: 'function', function: { name, arguments: '' } }] }, finish_reason: null },
        ],
      })
      send(res, {
        ...base,
        choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: JSON.stringify(args) } }] }, finish_reason: null }],
      })
      send(res, {
        ...base,
        choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }],
        usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
      })
    }
    const done = () => {
      res.write('data: [DONE]\n\n')
      res.end()
    }

    if (requestCount > HARD_REQUEST_CAP) {
      emitText('stop')
      return done()
    }

    if (BEHAVIOR === 'noop') {
      emitText('I believe the task is already complete.')
      return done()
    }

    // 'solve': Read-then-Write each known solution file, then finish.
    const stepIdx = countToolCalls(messages, ['Read', 'Write', 'Edit'])
    if (stepIdx < STEPS.length) {
      const step = STEPS[stepIdx]
      emitTool(`s${stepIdx}`, step.tool, step.args)
    } else {
      emitText('Done — implemented and ready for the test.')
    }
    return done()
  })
})
server.listen(PORT, () => console.error(`[bench-mock] listening on ${PORT} behavior=${BEHAVIOR}`))
