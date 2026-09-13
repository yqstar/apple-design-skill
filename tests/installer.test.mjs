import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { pathToFileURL } from 'node:url';
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

function cliSandbox(t) {
  const directory = workspace(t);
  const userRoot = join(directory, 'user home');
  const project = join(directory, 'project');
  for (const path of [userRoot, project]) fs.mkdirSync(path);
  // Keep real CLI writes isolated without changing the user's HOME environment.
  const preload = join(directory, 'test-home.mjs');
  fs.writeFileSync(preload, `import os from 'node:os';
import { syncBuiltinESMExports } from 'node:module';
os.homedir = () => ${JSON.stringify(userRoot)};
syncBuiltinESMExports();
`);
  const run = args => JSON.parse(execFileSync(process.execPath,
    ['--import', pathToFileURL(preload).href, cli, ...args, '--json'],
    { cwd: project, encoding: 'utf8' }));
  return { userRoot, project, run };
}

test('default CLI is read-only help', t => {
  const work = workspace(t);
  const output = execFileSync(process.execPath, [cli], { cwd: work, encoding: 'utf8' });
  assert.match(output, /Usage:/); assert.deepEqual(fs.readdirSync(work), []);
});
test('CLI defaults to all three user installations without writing to the current project', t => {
  const { userRoot, project, run } = cliSandbox(t);
  const result = run(['install']);
  assert.equal(result.store, join(userRoot, '.apple-design-skill'));
  assert.deepEqual(result.targets.map(target => target.path),
    ['.agents', '.claude', '.cursor'].map(agent => join(userRoot, agent, 'skills', pkg.name)));
  for (const target of result.targets) {
    assert.equal(target.status, 'managed');
    assert.equal(treeHash(target.path), treeHash(join(root, 'skills', pkg.name)));
  }
  assert.deepEqual(fs.readdirSync(project), []);
});
test('CLI default dry run matches explicit global/all flags and performs no writes', t => {
  const { userRoot, project, run } = cliSandbox(t);
  assert.deepEqual(run(['install', '--dry-run']), run(['install', '--global', '--all', '--dry-run']));
  assert.deepEqual(fs.readdirSync(userRoot), []);
  assert.deepEqual(fs.readdirSync(project), []);
});
test('CLI explicit agents replace the default tools and deduplicate shared paths', t => {
  const { userRoot, project, run } = cliSandbox(t);
  for (const [agent, folder] of [['codex', '.agents'], ['claude', '.claude'], ['cursor', '.cursor'], ['universal', '.agents']]) {
    const result = run(['install', '--agent', agent, '--dry-run']);
    assert.deepEqual(result.targets.map(target => target.path), [join(userRoot, folder, 'skills', pkg.name)]);
  }
  const result = run(['install', '--agent', 'claude,codex', '--agent', 'universal,claude']);
  assert.deepEqual(result.targets.map(target => target.path),
    ['.claude', '.agents'].map(agent => join(userRoot, agent, 'skills', pkg.name)));
  assert.equal(fs.existsSync(join(userRoot, '.cursor')), false);
  assert.deepEqual(fs.readdirSync(project), []);
});
test('CLI project flag accepts omitted, relative and absolute paths without using the user scope', t => {
  const { userRoot, project, run } = cliSandbox(t);
  assert.deepEqual(run(['install', '--project', '--dry-run']), run(['install', '--project', '.', '--dry-run']));
  const result = run(['install', '--project']);
  assert.equal(result.store, join(project, '.apple-design-skill'));
  assert.deepEqual(result.targets.map(target => target.path),
    ['.agents', '.claude', '.cursor'].map(agent => join(project, agent, 'skills', pkg.name)));
  const nested = join(project, 'nested project');
  fs.mkdirSync(nested);
  const relative = run(['install', '--project', 'nested project', '--agent', 'claude']);
  assert.equal(relative.store, join(nested, '.apple-design-skill'));
  assert.deepEqual(relative.targets.map(target => target.path), [join(nested, '.claude', 'skills', pkg.name)]);
  const absolute = run(['list', '--project', nested, '--agent', 'claude']);
  assert.deepEqual(absolute.targets, relative.targets);
  assert.deepEqual(fs.readdirSync(userRoot), []);
});
test('CLI list, use and uninstall share the user default and keep project installations independent', t => {
  const { userRoot, project, run } = cliSandbox(t);
  const installed = run(['install']);
  const local = run(['install', '--project']);
  const listed = run(['list']);
  assert.equal(listed.store, join(userRoot, '.apple-design-skill'));
  assert.deepEqual(listed.versions, [pkg.version]);
  assert.deepEqual(listed.targets, installed.targets);
  assert.deepEqual(run(['use', pkg.version]).targets, installed.targets);
  const removed = run(['uninstall']);
  assert.equal(removed.backups.length, 3);
  assert.ok(removed.targets.every(target => target.status === 'absent'));
  const projectList = run(['list', '--project']);
  assert.equal(projectList.store, join(project, '.apple-design-skill'));
  assert.deepEqual(projectList.targets, local.targets);
  assert.deepEqual(run(['list']).versions, [pkg.version]);
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
  for (const flags of [['--project', work, '--global'], ['--global', '--project'], ['--project', '--global']]) {
    const bad = spawnSync(process.execPath, [cli, 'install', ...flags, '--dry-run'], { encoding:'utf8' });
    assert.notEqual(bad.status, 0); assert.match(bad.stderr, /Choose one/);
  }
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

function validationFixture(t) {
  const work = workspace(t);
  for (const file of ['package.json', 'package-lock.json', '.codex-plugin', '.claude-plugin', '.github', 'bin', 'lib', 'scripts', 'skills', 'docs', 'examples', 'README.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'LICENSE']) {
    fs.cpSync(join(root, file), join(work, file), { recursive: true });
  }
  fs.mkdirSync(join(work,'tests'));
  return work;
}

test('skill validation accepts CRLF source files from Windows checkouts', t => {
  const work = validationFixture(t);
  const skill = join(work,'skills/apple-design-skill/SKILL.md');
  fs.writeFileSync(skill, read(skill).replace(/\r?\n/g,'\r\n'));
  const output = execFileSync(process.execPath,[join(work,'scripts/check.mjs')],{encoding:'utf8'});
  assert.match(output,/Validated apple-design-skill/);
});

test('validation checks Markdown links across documentation and nested skill references', t => {
  const work = validationFixture(t);
  const check = () => spawnSync(process.execPath, [join(work, 'scripts/check.mjs')], { encoding: 'utf8' });
  const reference = join(work, 'skills/apple-design-skill/references');
  fs.mkdirSync(reference);
  fs.writeFileSync(join(reference, 'details.md'), '[Guide](../../../docs/local%20guide.md#details)\n');
  fs.writeFileSync(join(work, 'docs/local guide.md'), '# Details\n');
  fs.appendFileSync(join(work, 'README.md'), '\n[Local guide](docs/local%20guide.md#details)\n');
  assert.equal(check().status, 0);
  for (const file of ['README.md', 'docs/installation.md', 'examples/agent-learning-compare/README.md', 'skills/apple-design-skill/SKILL.md', 'skills/apple-design-skill/references/details.md']) {
    const path = join(work, file);
    const original = read(path);
    fs.appendFileSync(path, '\n[Removed file](missing.md)\n');
    const result = check();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid local link.*missing\.md/);
    fs.writeFileSync(path, original);
  }
});

test('validation rejects stale package-lock metadata', t => {
  const work = validationFixture(t);
  const path = join(work, 'package-lock.json');
  const original = read(path);
  for (const field of ['name', 'version']) {
    for (const nested of [false, true]) {
      const lock = JSON.parse(original);
      (nested ? lock.packages[''] : lock)[field] = field === 'name' ? 'another-package' : '99.0.0';
      fs.writeFileSync(path, JSON.stringify(lock));
      const result = spawnSync(process.execPath, [join(work, 'scripts/check.mjs')], { encoding: 'utf8' });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Package\/lockfile metadata mismatch/);
    }
  }
});

test('release guard only accepts the exact version tag from the publishing repository', () => {
  const check = join(root,'scripts/release-check.mjs');
  const env = {...process.env,GITHUB_REF:`refs/tags/v${pkg.version}`,GITHUB_REPOSITORY:'yqstar/apple-design-skill'};
  assert.equal(spawnSync(process.execPath,[check],{env}).status,0);
  for (const update of [{GITHUB_REF:'refs/heads/main'},{GITHUB_REF:'refs/tags/v99.0.0'},{GITHUB_REPOSITORY:'someone/fork'}]) {
    assert.notEqual(spawnSync(process.execPath,[check],{env:{...env,...update}}).status,0);
  }
});
