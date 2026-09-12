import { readFileSync, writeFileSync } from 'node:fs';
import { validateVersion } from '../lib/installer.mjs';
const version = process.argv[2];
validateVersion(version);
for (const file of ['package.json', 'package-lock.json', '.codex-plugin/plugin.json', '.claude-plugin/plugin.json']) {
  const url = new URL(`../${file}`, import.meta.url);
  const object = JSON.parse(readFileSync(url, 'utf8'));
  object.version = version;
  if (file === 'package-lock.json') object.packages[''].version = version;
  writeFileSync(url, `${JSON.stringify(object, null, 2)}\n`);
}
console.log(`Updated package, lockfile and plugin manifests to ${version}`);
