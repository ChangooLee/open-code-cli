import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const exts =  new Set([".ts", ".tsx", ".js", ".mjs"]);
const skip =  new Set(["node_modules", "dist", ".git"]);
const builtins =  new Set([
  "assert",
  "buffer",
  "child_process",
  "crypto",
  "fs",
  "http",
  "https",
  "net",
  "os",
  "path",
  "process",
  "stream",
  "tty",
  "url",
  "util",
  "zlib",
  "async_hooks",
  "worker_threads",
  "readline",
  "dns",
  "events",
  "module",
  "perf_hooks",
  "timers",
  "v8",
  "vm"
]);
const importRe = /(?:from|import)\s+['"]([@a-z][^'"]+)['"]|require\s*\(\s*['"]([@a-z][^'"]+)['"]\s*\)/g;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue;
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) walk(path);
    else if (exts.has(extname(name))) files.push(path);
  }
}
const files = [];
walk(root);
const pkgs =  new Set();
for (const file of files) {
  const source = readFileSync(file, "utf8");
  for (const m of source.matchAll(importRe)) {
    const raw = m[1] ?? m[2];
    if (!raw || raw.startsWith(".") || raw.startsWith("bun:")) continue;
    let p = raw.split("/")[0];
    if (raw.startsWith("@")) {
      const parts = raw.split("/");
      p = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0];
    }
    if (builtins.has(p)) continue;
    if (!/^(@[a-z0-9-]+\/[a-z0-9-]+|[a-z0-9-]+)$/i.test(p)) continue;
    pkgs.add(p);
  }
}
console.log([...pkgs].sort().join("\n"));
