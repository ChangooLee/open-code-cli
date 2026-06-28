import ts from 'typescript'
import { readdir, readFile, writeFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const skipDirs = new Set(['node_modules', 'dist', '.git'])

function scriptKindFor(filePath) {
  if (filePath.endsWith('.tsx')) return ts.ScriptKind.TSX
  if (filePath.endsWith('.ts')) return ts.ScriptKind.TS
  return ts.ScriptKind.JS
}

function stripComments(source, filePath) {
  if (!source.includes('//') && !source.includes('/*')) return source

  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFor(filePath),
  )

  const ranges = []
  const seen = new Set()
  const addRange = (pos, end) => {
    const key = `${pos}:${end}`
    if (seen.has(key)) return
    seen.add(key)
    ranges.push({ pos, end })
  }

  const visit = node => {
    ts.forEachLeadingCommentRange(source, node.getFullStart(), addRange)
    ts.forEachTrailingCommentRange(source, node.getEnd(), addRange)
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  if (ranges.length === 0) return source

  ranges.sort((a, b) => b.pos - a.pos)
  let output = source
  for (const range of ranges) {
    output = output.slice(0, range.pos) + output.slice(range.end)
  }

  output = output.replace(/^[ \t]*\r?\n/gm, '')
  if (output.length > 0 && !output.endsWith('\n')) output += '\n'
  return output
}

function stripOrphanComments(source) {
  let output = source.replace(/^[ \t]*\/\/[^\n]*\n/gm, '')
  output = output.replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*\n/gm, '')
  output = output.replace(/\/\*[\s\S]*?\*\//g, '')
  output = output.replace(/\n{3,}/g, '\n\n')
  if (output.length > 0 && !output.endsWith('\n')) output += '\n'
  return output
}

function stripAllComments(source, filePath) {
  return stripOrphanComments(stripComments(source, filePath))
}

async function walk(dir, files = []) {
  for (const name of await readdir(dir)) {
    if (skipDirs.has(name)) continue
    const path = join(dir, name)
    const info = await stat(path)
    if (info.isDirectory()) {
      await walk(path, files)
      continue
    }
    if (!/\.(ts|tsx|mjs|js)$/.test(name)) continue
    files.push(path)
  }
  return files
}

const files = await walk(root)
let changed = 0

for (const filePath of files) {
  const source = await readFile(filePath, 'utf8')
  const stripped = stripAllComments(source, filePath)
  if (stripped !== source) {
    await writeFile(filePath, stripped, 'utf8')
    changed++
  }
}

console.log(`strip-comments: ${changed}/${files.length} files updated`)
