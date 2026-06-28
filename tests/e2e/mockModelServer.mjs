// Minimal OpenAI-compatible mock model server for e2e tests.
// Scenario 'verifyfail': the model makes 3 Write edits then always tries to
// finish WITHOUT ever spawning the verification agent. With the verification
// gate flag on, completion must be refused (task fails); with it off, the run
// completes successfully.
import http from 'node:http'

const PORT = process.env.MOCK_PORT ? Number(process.env.MOCK_PORT) : 8099
const SCENARIO = process.env.MOCK_SCENARIO || 'verifyfail'

function send(res, obj) {
  res.write(`data: ${JSON.stringify(obj)}\n\n`)
}

const server = http.createServer((req, res) => {
  let body = ''
  req.on('data', c => (body += c))
  req.on('end', () => {
    let parsed = {}
    try {
      parsed = JSON.parse(body || '{}')
    } catch {}
    const model = parsed.model || 'mock'
    const messages = parsed.messages || []
    let countWrites = 0
    for (const m of messages) {
      if (m.role === 'assistant' && Array.isArray(m.tool_calls)) {
        for (const tc of m.tool_calls) {
          if (tc.function && tc.function.name === 'Write') countWrites++
        }
      }
    }
    const base = { id: 'chatcmpl-mock', object: 'chat.completion.chunk', model }
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    })
    send(res, {
      ...base,
      choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }],
    })
    if (SCENARIO === 'verifyfail' && countWrites < 3) {
      const args = JSON.stringify({
        file_path: `gatefile${countWrites + 1}.txt`,
        content: 'demo',
      })
      send(res, {
        ...base,
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [
                { index: 0, id: `w${countWrites}`, type: 'function', function: { name: 'Write', arguments: '' } },
              ],
            },
            finish_reason: null,
          },
        ],
      })
      send(res, {
        ...base,
        choices: [
          { index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: args } }] }, finish_reason: null },
        ],
      })
      send(res, {
        ...base,
        choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }],
        usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
      })
    } else {
      send(res, {
        ...base,
        choices: [{ index: 0, delta: { content: 'All done!' }, finish_reason: null }],
      })
      send(res, {
        ...base,
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
        usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
      })
    }
    res.write('data: [DONE]\n\n')
    res.end()
  })
})
server.listen(PORT, () => console.error(`[mock] listening on ${PORT} scenario=${SCENARIO}`))
