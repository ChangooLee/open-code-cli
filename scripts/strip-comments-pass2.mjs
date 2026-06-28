import strip from 'strip-comments'
import { readFile, writeFile, readdir, stat } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const exts = new Set(['.ts', '.tsx', '.js', '.mjs'])
const skip = new Set(['node_modules', 'dist', '.git'])

async function walk(dir, files = []) {
  const entries = await readdir(dir)
  for (const name of entries) {
    if (skip.has(name)) continue
    const path = join(dir, name)
    const st = await stat(path)
    if (st.isDirectory()) await walk(path, files)
    else if (exts.has(extname(name))) files.push(path)
  }
  return files
}

let changed = 0
const files = await walk(root)

for (let i = 0; i < files.length; i++) {
  const path = files[i]
  const source = await readFile(path, 'utf8')
  const stripped = strip(source, { preserveNewlines: true })
  if (stripped !== source) {
    await writeFile(path, stripped, 'utf8')
    changed++
  }
  if ((i + 1) % 500 === 0) {
    console.log(`strip-comments: ${i + 1}/${files.length}...`)
  }
}

console.log(`strip-comments: ${files.length} scanned, ${changed} updated`)
