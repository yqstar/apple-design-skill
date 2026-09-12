import { readFileSync, readdirSync, lstatSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { validateVersion, treeHash } from '../lib/installer.mjs';
const root = resolve(import.meta.dirname, '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
validateVersion(pkg.version);
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
for (const match of skill.matchAll(/\]\((references\/[^)#]+)(?:#[^)]*)?\)/g)) {
  if (!existsSync(join(skillRoot, match[1]))) throw new Error(`Missing skill reference: ${match[1]}`);
}
treeHash(skillRoot);
if (!lstatSync(join(root, 'bin', 'apple-design-skill.mjs')).isFile()) throw new Error('Missing CLI');
console.log(`Validated ${pkg.name}@${pkg.version}: scripts, skill references, manifests, and payload.`);
