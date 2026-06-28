import ts from 'typescript';
import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const exts = new Map([
    ['.ts', ts.ScriptKind.TS],
    ['.tsx', ts.ScriptKind.TSX],
    ['.js', ts.ScriptKind.JS],
    ['.mjs', ts.ScriptKind.JS],
]);
const skip = new Set(['node_modules', 'dist', '.git']);
const printer = ts.createPrinter({
    removeComments: true,
    newLine: ts.NewLineKind.LineFeed,
});
async function walk(dir, files = []) {
    const entries = await readdir(dir);
    for (const name of entries) {
        if (skip.has(name))
            continue;
        const path = join(dir, name);
        const st = await stat(path);
        if (st.isDirectory())
            await walk(path, files);
        else if (exts.has(extname(name)))
            files.push(path);
    }
    return files;
}
let changed = 0;
const files = await walk(root);
for (const path of files) {
    const ext = extname(path);
    const scriptKind = exts.get(ext);
    if (!scriptKind)
        continue;
    const source = await readFile(path, 'utf8');
    if (!source.includes('//') && !source.includes('/*'))
        continue;
    const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, scriptKind);
    const stripped = printer.printNode(ts.EmitHint.Unspecified, sourceFile, sourceFile);
    if (stripped !== source) {
        await writeFile(path, stripped.endsWith('\n') ? stripped : `${stripped}\n`, 'utf8');
        changed++;
    }
}
console.log(`strip-comments: ${files.length} scanned, ${changed} updated`);
