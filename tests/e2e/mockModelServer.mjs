// Minimal OpenAI-compatible mock model server for e2e tests.
//
// Scenarios:
//  - 'verifyfail': the model makes 3 Write edits in the PARENT loop then
//    refuses to verify. Gate ON => the run fails; gate OFF => it completes.
//  - 'nested': the PARENT spawns a general-purpose SUBAGENT that makes 3 Write
//    edits; the subagent's delegated edits/verification-failure must reach the
//    PARENT gate. Gate ON => the run fails; gate OFF => it completes.
//
// A hard request cap guarantees the server can never drive an infinite loop.
import http from 'node:http'

const PORT = process.env.MOCK_PORT ? Number(process.env.MOCK_PORT) : 8099
const SCENARIO = process.env.MOCK_SCENARIO || 'verifyfail'
const SUBAGENT_MARKER = 'OCC_SUBAGENT_TASK'
const HARD_REQUEST_CAP = 60
let requestCount = 0

function send(res, obj) {
  res.write(`data: ${JSON.stringify(obj)}\n\n`)
}

function userMessagesText(messages) {
  return messages
    .filter(m => m.role === 'user')
    .map(m =>
      typeof m.content === 'string'
        ? m.content
        : Array.isArray(m.content)
          ? m.content.map(b => (typeof b?.text === 'string' ? b.text : '')).join('\n')
          : '',
    )
    .join('\n')
}

function countToolCalls(messages, name) {
  let n = 0
  for (const m of messages) {
    if (m.role === 'assistant' && Array.isArray(m.tool_calls)) {
      for (const tc of m.tool_calls) if (tc.function && tc.function.name === name) n++
    }
  }
  return n
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
    const base = { id: 'chatcmpl-mock', object: 'chat.completion.chunk', model }
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

    // Hard backstop: never allow an unbounded loop in the mock.
    if (requestCount > HARD_REQUEST_CAP) {
      emitText('stop')
      return done()
    }

    const writes = countToolCalls(messages, 'Write')

    if (SCENARIO === 'nested') {
      // A subagent request is identified by the marker appearing in a USER
      // message (the prompt the parent delegated). The parent only ever has
      // the marker inside an assistant tool_call, never a user message.
      const isSubagent = userMessagesText(messages).includes(SUBAGENT_MARKER)
      if (isSubagent) {
        if (writes < 3) {
          emitTool(`w${writes}`, 'Write', { file_path: `sub${writes + 1}.txt`, content: 'demo' })
        } else {
          emitText('subagent finished its edits')
        }
        return done()
      }
      // Parent: delegate to a subagent once, then try to finish.
      const spawnedAgent = countToolCalls(messages, 'Agent') > 0
      if (!spawnedAgent) {
        emitTool('a0', 'Agent', {
          description: 'delegate edits',
          subagent_type: 'general-purpose',
          prompt: `${SUBAGENT_MARKER}: write 3 files`,
        })
      } else {
        emitText('all done')
      }
      return done()
    }

    // 'verifyfail' (default): parent makes the edits directly.
    if (writes < 3) {
      emitTool(`w${writes}`, 'Write', { file_path: `gatefile${writes + 1}.txt`, content: 'demo' })
    } else {
      emitText('all done')
    }
    return done()
  })
})
server.listen(PORT, () => console.error(`[mock] listening on ${PORT} scenario=${SCENARIO}`))
