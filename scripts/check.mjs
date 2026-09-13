import { readFileSync, readdirSync, lstatSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { validateVersion, treeHash } from '../lib/installer.mjs';
const root = resolve(import.meta.dirname, '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
validateVersion(pkg.version);
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
if ([lock, lock.packages?.['']].some(metadata => metadata?.name !== pkg.name || metadata?.version !== pkg.version)) throw new Error('Package/lockfile metadata mismatch');
for (const directory of ['bin', 'lib', 'scripts', 'tests']) {
  for (const file of readdirSync(join(root, directory))) {
    if (file.endsWith('.mjs')) execFileSync(process.execPath, ['--check', join(root, directory, file)]);
  }
}
for (const file of ['.codex-plugin/plugin.json', '.claude-plugin/plugin.json']) {
  const plugin = JSON.parse(readFileSync(join(root, file), 'utf8'));
  if (plugin.version !== pkg.version || plugin.name !== pkg.name) throw new Error(`Package/plugin metadata mismatch: ${file}`);
}
const skillRoot = join(root, 'skills', pkg.name);
const skill = readFileSync(join(skillRoot, 'SKILL.md'), 'utf8').replaceAll('\r\n', '\n');
if (!skill.startsWith('---\nname: apple-design-skill\n') || !/^description: /m.test(skill)) throw new Error('Invalid skill frontmatter');
if (/\[TODO:|TODO\s*PLACEHOLDER/.test(skill)) throw new Error('Unfinished skill placeholder');
function checkMarkdown(file) {
  const markdown = readFileSync(file, 'utf8').replace(/^(`{3,}|~{3,})[^\n]*\r?\n[\s\S]*?^\1\s*$/gm, '');
  for (const [, link] of markdown.matchAll(/\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    if (/^(?:#|[a-z][a-z\d+.-]*:|\/\/)/i.test(link)) continue;
    const target = resolve(dirname(file), decodeURIComponent(link.split(/[?#]/)[0]));
    const rel = relative(root, target);
    if (rel === '..' || rel.startsWith(`..${sep}`) || !existsSync(target)) throw new Error(`Invalid local link in ${relative(root, file)}: ${link}`);
  }
}
function checkMarkdownDirectory(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) checkMarkdownDirectory(file);
    else if (entry.isFile() && entry.name.endsWith('.md')) checkMarkdown(file);
  }
}
for (const file of readdirSync(root).filter(file => file.endsWith('.md'))) checkMarkdown(join(root, file));
for (const directory of ['docs', 'skills', 'examples']) checkMarkdownDirectory(join(root, directory));
treeHash(skillRoot);
if (!lstatSync(join(root, 'bin', 'apple-design-skill.mjs')).isFile()) throw new Error('Missing CLI');
console.log(`Validated ${pkg.name}@${pkg.version}: scripts, local Markdown links, lockfile, manifests, and payload.`);
