// Dependency-free repository checks. This does not replace browser testing.
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const excluded = new Set(['.git', '.venv', 'venv', 'node_modules', '__pycache__']);
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (excluded.has(entry.name) || entry.isSymbolicLink()) continue;
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}
const files = await walk(root);
for (const path of files.filter(p => ['.js', '.mjs'].includes(extname(p)))) {
  const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || `Syntax check failed: ${path}`);
}

const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8'));
if (manifest.manifest_version !== 3) throw new Error('Expected Manifest V3');
const expectedPermissions = ['activeTab', 'scripting', 'storage'];
if (JSON.stringify([...manifest.permissions].sort()) !== JSON.stringify(expectedPermissions)) throw new Error('Review permission changes before publishing');
const assets = [manifest.action.default_popup, ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon)];
for (const script of manifest.content_scripts) {
  if (script.matches.some(match => !['https://hotstar.com/*', 'https://*.hotstar.com/*'].includes(match))) throw new Error('Unexpected content-script host access');
  assets.push(...script.js, ...(script.css || []));
}
for (const asset of assets) {
  const path = resolve(root, asset);
  if (isAbsolute(asset) || !path.startsWith(root + sep) || !(await stat(path)).isFile()) throw new Error(`Invalid manifest asset: ${asset}`);
}

// Report only locations/types, never print a possible credential's value.
const patterns = [
  ['private key', /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/],
  ['AWS access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/],
  ['OpenAI-style key', /\bsk-[A-Za-z0-9_-]{24,}\b/],
  ['assigned credential', /(?:api[_-]?key|client[_-]?secret|password|access[_-]?token)\s*[:=]\s*["'][^"'\s]{8,}["']/i]
];
for (const path of files.filter(p => ['.js', '.mjs', '.json', '.html', '.css', '.md', '.py', '.yml', '.yaml', '.svg'].includes(extname(p)))) {
  const text = await readFile(path, 'utf8');
  for (const [kind, pattern] of patterns) {
    if (pattern.test(text)) throw new Error(`Possible ${kind} in ${path.slice(root.length + 1)}; review locally before publishing`);
  }
}
console.log('Passed: JavaScript syntax, manifest permissions/assets and common credential patterns.');
console.log('This pattern scan is not a guarantee; review the Git file list before publishing. Browser fixtures must be run separately.');
