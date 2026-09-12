import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../examples/agent-learning-compare/', import.meta.url));
const resources = readdirSync(join(root, 'dist'));
const screenshots = readdirSync(join(root, 'screenshots'));

function localFile(base, name) {
  const file = resolve(base, name);
  assert.ok(file.startsWith(resolve(root) + sep), `Asset outside example: ${name}`);
  assert.ok(statSync(file).isFile(), `Missing asset: ${name}`);
  return file;
}

for (const name of ['index.html', 'baseline.html', 'apple.html']) {
  localFile(join(root, 'dist'), name);
}

for (const name of screenshots) {
  const bytes = readFileSync(localFile(join(root, 'screenshots'), name));
  assert.ok(name.endsWith('.jpg') && bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])), `Expected JPEG screenshot: ${name}`);
}

for (const name of resources) {
  const file = localFile(join(root, 'dist'), name);
  if (name.endsWith('.js')) execFileSync(process.execPath, ['--check', file]);
  if (!name.endsWith('.html')) continue;
  const html = readFileSync(file, 'utf8');
  for (const [, link] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (link.startsWith('#')) continue;
    assert.ok(!/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(link), `Expected local example asset: ${link}`);
    localFile(dirname(file), decodeURIComponent(link.split(/[?#]/)[0]));
  }
}

console.log(`Verified Agent Lab: 3 entrypoints, ${resources.length} resources, ${screenshots.length} screenshots, local HTML assets and JavaScript syntax.`);
