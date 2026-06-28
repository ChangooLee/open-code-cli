#!/usr/bin/env node
// Local mock OpenAI-compatible server for verifying open-code-cli's runtime
// request -> response parsing -> (optional) tool round-trip path WITHOUT any
// real provider, network egress, or API key.
//
// Usage:
//   MOCK_PORT=8765 MOCK_MODE=text node scripts/mock-openai-server.mjs
//   MOCK_MODE can be: text | tool
//
// It logs every received /chat/completions payload (model, messages, tools,
// stream flag, auth header) to stderr so the caller can inspect what the CLI
// actually sent.

import http from 'node:http'

const PORT = Number(process.env.MOCK_PORT || 8765)
const MODE = process.env.MOCK_MODE || 'text'

function log(...args) {
  process.stderr.write(`[mock] ${args.join(' ')}\n`)
}

function sendNonStreaming(res, message) {
  const body = {
    id: 'chatcmpl-mock-1',
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'mock-model',
    choices: [
      {
        index: 0,
        finish_reason: message.tool_calls ? 'tool_calls' : 'stop',
        message,
      },
    ],
    usage: { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 },
  }
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}

function sendStreaming(res, message) {
  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
  })
  const write = obj => res.write(`data: ${JSON.stringify(obj)}\n\n`)
  const base = {
    id: 'chatcmpl-mock-1',
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'mock-model',
  }

  if (message.tool_calls) {
    // role chunk
    write({ ...base, choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] })
    message.tool_calls.forEach((tc, i) => {
      write({
        ...base,
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [
                {
                  index: i,
                  id: tc.id,
                  type: 'function',
                  function: { name: tc.function.name, arguments: '' },
                },
              ],
            },
            finish_reason: null,
          },
        ],
      })
      // stream the arguments in two pieces to exercise incremental json
      const args = tc.function.arguments
      const mid = Math.ceil(args.length / 2)
      for (const piece of [args.slice(0, mid), args.slice(mid)]) {
        write({
          ...base,
          choices: [
            {
              index: 0,
              delta: { tool_calls: [{ index: i, function: { arguments: piece } }] },
              finish_reason: null,
            },
          ],
        })
      }
    })
    write({ ...base, choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] })
  } else {
    write({ ...base, choices: [{ index: 0, delta: { role: 'assistant', content: '' }, finish_reason: null }] })
    for (const piece of String(message.content || '').match(/.{1,8}/gs) || ['']) {
      write({ ...base, choices: [{ index: 0, delta: { content: piece }, finish_reason: null }] })
    }
    write({ ...base, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })
  }
  write({ ...base, choices: [], usage: { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 } })
  res.write('data: [DONE]\n\n')
  res.end()
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || !req.url.includes('/chat/completions')) {
    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: { message: 'not found' } }))
    return
  }

  let raw = ''
  req.on('data', c => (raw += c))
  req.on('end', () => {
    let payload = {}
    try {
      payload = JSON.parse(raw)
    } catch (e) {
      log('failed to parse body:', e.message)
    }

    const toolNames = (payload.tools || []).map(t => t?.function?.name).filter(Boolean)
    const roles = (payload.messages || []).map(m => m.role)
    const hasToolResult = roles.includes('tool')
    log('--- request ---')
    log('auth:', req.headers['authorization'] || '(none)')
    log('model:', payload.model)
    log('stream:', String(!!payload.stream))
    log('message roles:', JSON.stringify(roles))
    log('tool count:', String(toolNames.length), 'names:', JSON.stringify(toolNames.slice(0, 40)))
    log('has tool result in messages:', String(hasToolResult))

    let message
    if (MODE === 'tool' && !hasToolResult) {
      // Pick a safe read-only tool the CLI advertised, build valid-ish args.
      let name = null
      let args = {}
      if (toolNames.includes('LS')) {
        name = 'LS'
        args = { path: process.cwd() }
      } else if (toolNames.includes('Glob')) {
        name = 'Glob'
        args = { pattern: '*.json' }
      } else if (toolNames.includes('Read')) {
        name = 'Read'
        args = { file_path: `${process.cwd()}/package.json` }
      }
      if (name) {
        message = {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: 'call_mock_1',
              type: 'function',
              function: { name, arguments: JSON.stringify(args) },
            },
          ],
        }
        log('responding with tool_call:', name, JSON.stringify(args))
      } else {
        message = { role: 'assistant', content: 'No safe read-only tool was advertised; returning text instead.' }
        log('no safe tool advertised, returning text')
      }
    } else {
      message = {
        role: 'assistant',
        content: hasToolResult
          ? 'Tool round-trip complete: I received the tool result and finished.'
          : 'Hello from the mock server. Runtime path works.',
      }
      log('responding with text')
    }

    if (payload.stream) sendStreaming(res, message)
    else sendNonStreaming(res, message)
  })
})

server.listen(PORT, '127.0.0.1', () => {
  log(`listening on http://127.0.0.1:${PORT} mode=${MODE}`)
})
