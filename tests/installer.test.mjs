import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { execute, resolveTargets, treeHash, validateVersion } from '../lib/installer.mjs';

const root = resolve(import.meta.dirname, '..');
const cli = join(root, 'bin/apple-design-skill.mjs');
const pkg = JSON.parse(fs.readFileSync(join(root, 'package.json'), 'utf8'));
function workspace(t) {
  const directory = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'apple-design-test-')));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}
function fixture(t, version, body = version) {
  const directory = workspace(t);
  const skill = join(directory, 'skills/apple-design-skill');
  fs.mkdirSync(join(skill, 'agents'), { recursive: true });
  fs.writeFileSync(join(directory, 'package.json'), JSON.stringify({ name: pkg.name, version }));
  fs.writeFileSync(join(skill, 'SKILL.md'), `---\nname: apple-design-skill\ndescription: Design interfaces\n---\n${body}\n`);
  fs.writeFileSync(join(skill, 'agents/openai.yaml'), 'interface:\n  default_prompt: "Use $apple-design-skill"\n');
  return directory;
}
function options(scopeRoot, overrides = {}) {
  const name = overrides.name || pkg.name;
  return { command: 'install', version: pkg.version, packageRoot: root, scopeRoot, name, targets: resolveTargets(scopeRoot, ['codex'], name), ...overrides };
}
const read = path => fs.readFileSync(path, 'utf8');

test('default CLI is read-only help', t => {
  const work = workspace(t);
  const output = execFileSync(process.execPath, [cli], { cwd: work, encoding: 'utf8' });
  assert.match(output, /Usage:/); assert.deepEqual(fs.readdirSync(work), []);
});
test('agent mapping deduplicates shared roots and rejects unknown names', t => {
  const work = workspace(t);
  const paths = resolveTargets(work, ['codex','universal','claude','cursor'], pkg.name);
  assert.equal(paths.length, 3); assert.ok(paths.some(p => p.includes('.claude')));
  assert.throws(() => resolveTargets(work, ['bogus'], pkg.name), /Unsupported agent/);
});
test('install real payload into all three hosts, outside version snapshots', t => {
  const work = workspace(t);
  const config = options(work, { targets: resolveTargets(work, ['codex','claude','cursor'], pkg.name) });
  const result = execute(config);
  assert.equal(result.targets.length, 3);
  for (const target of result.targets) {
    assert.equal(target.status, 'managed'); assert.equal(target.version, pkg.version);
    assert.equal(treeHash(target.path), treeHash(join(root, 'skills', pkg.name)));
  }
  assert.ok(fs.existsSync(join(work, '.apple-design-skill/versions', pkg.version, 'SKILL.md')));
  assert.ok(!fs.existsSync(join(work, '.agents/skills/.apple-design-skill')));
});
test('dry run performs no writes', t => {
  const work = workspace(t); execute(options(work, { dryRun: true }));
  assert.deepEqual(fs.readdirSync(work), []);
});
test('two versions coexist in cache; use rolls back offline', t => {
  const work = workspace(t);
  const first = fixture(t, '1.2.3', 'first');
  const second = fixture(t, '2.0.0', 'second');
  execute(options(work, { version: '1.2.3', packageRoot: first }));
  execute(options(work, { version: '2.0.0', packageRoot: second }));
  const result = execute(options(work, { command: 'use', version: '1.2.3', packageRoot: '/not-used' }));
  assert.match(read(join(result.targets[0].path, 'SKILL.md')), /first/);
  assert.deepEqual(execute(options(work, { command: 'list' })).versions, ['1.2.3','2.0.0']);
});
test('alias installation preserves both versions and changes invocation metadata', t => {
  const work = workspace(t);
  const first = fixture(t, '1.0.0');
  const second = fixture(t, '2.0.0');
  const one = execute(options(work, { version: '1.0.0', packageRoot: first, name: 'apple-design-v1' }));
  const two = execute(options(work, { version: '2.0.0', packageRoot: second, name: 'apple-design-v2' }));
  assert.match(read(join(one.targets[0].path, 'SKILL.md')), /^name: apple-design-v1$/m);
  assert.match(read(join(one.targets[0].path, 'agents/openai.yaml')), /\$apple-design-v1/);
  assert.equal(two.targets[0].version, '2.0.0');
  assert.ok(fs.existsSync(one.targets[0].path));
});
test('same version cannot silently change its payload', t => {
  const work = workspace(t);
  execute(options(work, { version: '1.0.0', packageRoot: fixture(t, '1.0.0', 'original') }));
  assert.throws(() => execute(options(work, { version: '1.0.0', packageRoot: fixture(t, '1.0.0', 'different'), force: true })), /different content/);
});
test('preflight protects all destinations when one contains unmanaged work', t => {
  const work = workspace(t);
  const targets = resolveTargets(work, ['codex', 'claude'], pkg.name);
  fs.mkdirSync(targets[1], { recursive: true }); fs.writeFileSync(join(targets[1], 'mine.txt'), 'keep me');
  assert.throws(() => execute(options(work, { targets })), /unmanaged/);
  assert.equal(fs.existsSync(targets[0]), false);
  assert.equal(read(join(targets[1], 'mine.txt')), 'keep me');
});
test('local edits require --force and are preserved in a backup', t => {
  const work = workspace(t); const config = options(work);
  execute(config); const source = join(config.targets[0], 'SKILL.md');
  fs.appendFileSync(source, '\nlocal edit');
  assert.throws(() => execute(config), /modified/);
  const result = execute({ ...config, force: true });
  assert.equal(result.backups.length, 1);
  assert.match(read(join(result.backups[0], 'SKILL.md')), /local edit/);
  assert.doesNotMatch(read(source), /local edit/);
});
test('force replacement of an unmanaged directory keeps original files', t => {
  const work = workspace(t); const config = options(work);
  fs.mkdirSync(config.targets[0], { recursive: true }); fs.writeFileSync(join(config.targets[0], 'notes.txt'), 'notes');
  const result = execute({ ...config, force: true });
  assert.equal(read(join(result.backups[0], 'notes.txt')), 'notes');
});
test('uninstall is recoverable and leaves cached versions intact', t => {
  const work = workspace(t); execute(options(work));
  const result = execute(options(work, { command: 'uninstall' }));
  assert.equal(result.targets[0].status, 'absent'); assert.equal(result.backups.length, 1);
  assert.ok(fs.existsSync(join(result.backups[0], 'SKILL.md')));
  assert.deepEqual(execute(options(work, { command: 'list' })).versions, [pkg.version]);
});
test('uninstall refuses unmanaged directories even with force', t => {
  const work = workspace(t); const config = options(work);
  fs.mkdirSync(config.targets[0], { recursive: true });
  assert.throws(() => execute({ ...config, command: 'uninstall', force: true }), /unmanaged/);
});
test('uninstall an absent skill is a no-op', t => {
  const work = workspace(t); execute(options(work, { command: 'uninstall' }));
  assert.deepEqual(fs.readdirSync(work), []);
});
test('path traversal names and versions are rejected', t => {
  const work = workspace(t);
  for (const name of ['../evil', 'a/b', 'MixedCase', '', 'a'.repeat(65)]) assert.throws(() => resolveTargets(work, ['codex'], name));
  for (const version of ['../1.0.0','01.0.0','1.0','1.0.0-01','latest']) assert.throws(() => validateVersion(version));
  for (const version of ['0.0.0','1.0.0-rc.1','1.0.0+build.5']) validateVersion(version);
});
test('symlinked agent roots and cache parents are rejected without touching their target', t => {
  for (const relative of ['.agents', '.apple-design-skill/transactions']) {
    const work = workspace(t); const outside = workspace(t);
    const link = join(work, relative); fs.mkdirSync(resolve(link, '..'), { recursive: true });
    fs.symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(() => execute(options(work, { force: true })), /symlink/);
    assert.deepEqual(fs.readdirSync(outside), []);
  }
});
test('corrupted cache is rejected before activating it', t => {
  const work = workspace(t); const config = options(work); execute(config);
  fs.appendFileSync(join(work, '.apple-design-skill/versions', pkg.version, 'SKILL.md'), 'tampered');
  const before = treeHash(config.targets[0]);
  assert.throws(() => execute({ ...config, command: 'use' }), /damaged/);
  assert.equal(treeHash(config.targets[0]), before);
});
test('failed second activation restores every previous installation', t => {
  const work = workspace(t); const targets = resolveTargets(work, ['codex','claude'], pkg.name);
  execute(options(work, { targets, version: '1.0.0', packageRoot: fixture(t, '1.0.0') }));
  const before = targets.map(treeHash);
  const original = fs.renameSync;
  fs.renameSync = (from, to) => {
    if (String(from).includes('new-1') && to === targets[1]) throw new Error('simulated activation failure');
    return original(from, to);
  };
  syncBuiltinESMExports();
  try {
    assert.throws(() => execute(options(work, { targets, version: '2.0.0', packageRoot: fixture(t, '2.0.0') })), /simulated activation failure/);
  } finally { fs.renameSync = original; syncBuiltinESMExports(); }
  assert.deepEqual(targets.map(treeHash), before);
  assert.equal(fs.existsSync(join(work, '.apple-design-skill/lock')), false);
});
test('scope lock prevents competing writes', t => {
  const work = workspace(t); fs.mkdirSync(join(work, '.apple-design-skill/lock'), { recursive: true });
  assert.throws(() => execute(options(work)), /Another installation/);
  assert.equal(fs.existsSync(options(work).targets[0]), false);
});
test('CLI install and list emit usable JSON and reject conflicting scopes', t => {
  const work = workspace(t);
  const result = JSON.parse(execFileSync(process.execPath, [cli,'install','--all','--project',work,'--json'], { encoding:'utf8' }));
  assert.equal(result.targets.length, 3);
  const listed = JSON.parse(execFileSync(process.execPath, [cli,'list','--project',work,'--json'], { encoding:'utf8' }));
  assert.deepEqual(listed.versions, [pkg.version]);
  const bad = spawnSync(process.execPath, [cli,'install','--project',work,'--global'], { encoding:'utf8' });
  assert.notEqual(bad.status, 0); assert.match(bad.stderr, /Choose one/);
});
test('npm tarball contains portable payload and a runnable installer', { skip: !process.env.npm_execpath }, t => {
  const work = workspace(t);
  const [pack] = JSON.parse(execFileSync(process.execPath, [process.env.npm_execpath,'pack',root,'--ignore-scripts','--pack-destination',work,'--json'], { encoding:'utf8' }));
  const files = pack.files.map(f => f.path);
  for (const file of ['bin/apple-design-skill.mjs','lib/installer.mjs','skills/apple-design-skill/SKILL.md','skills/apple-design-skill/agents/openai.yaml','.codex-plugin/plugin.json','.claude-plugin/plugin.json']) assert.ok(files.includes(file), file);
  assert.ok(!files.some(f => /^(examples|docs)\//.test(f)), 'Repository examples and documentation stay outside the npm payload');
  assert.ok(!files.some(f => /(^|\/)(\.DS_Store|\.npmrc|\.env|node_modules)(\/|$)/.test(f)));
  execFileSync('tar', ['-xzf',join(work,pack.filename),'-C',work]);
  const target = workspace(t);
  const output = JSON.parse(execFileSync(process.execPath, [join(work,'package/bin/apple-design-skill.mjs'),'install','--project',target,'--json'], {encoding:'utf8'}));
  assert.equal(output.targets[0].version, pkg.version);
});

test('skill validation accepts CRLF source files from Windows checkouts', t => {
  const work = workspace(t);
  for (const file of ['package.json','.codex-plugin','.claude-plugin','bin','lib','scripts','skills']) fs.cpSync(join(root,file),join(work,file),{recursive:true});
  fs.mkdirSync(join(work,'tests'));
  const skill = join(work,'skills/apple-design-skill/SKILL.md');
  fs.writeFileSync(skill, read(skill).replace(/\r?\n/g,'\r\n'));
  const output = execFileSync(process.execPath,[join(work,'scripts/check.mjs')],{encoding:'utf8'});
  assert.match(output,/Validated apple-design-skill/);
});

test('release guard only accepts the exact version tag from the publishing repository', () => {
  const check = join(root,'scripts/release-check.mjs');
  const env = {...process.env,GITHUB_REF:`refs/tags/v${pkg.version}`,GITHUB_REPOSITORY:'yqstar/apple-design-skill'};
  assert.equal(spawnSync(process.execPath,[check],{env}).status,0);
  for (const update of [{GITHUB_REF:'refs/heads/main'},{GITHUB_REF:'refs/tags/v99.0.0'},{GITHUB_REPOSITORY:'someone/fork'}]) {
    assert.notEqual(spawnSync(process.execPath,[check],{env:{...env,...update}}).status,0);
  }
});
