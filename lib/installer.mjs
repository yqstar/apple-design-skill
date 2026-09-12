import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, join, relative, resolve, sep } from 'node:path';

const PACKAGE = 'apple-design-skill';
const META = '.apple-design-skill-install.json';
const roots = { codex: '.agents', universal: '.agents', claude: '.claude', cursor: '.cursor' };
export function validateName(value) {
  if (typeof value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value.length > 64) throw new Error('Skill name must be 1–64 lowercase letters, digits and single hyphens');
}
export function validateVersion(value) {
  const match = typeof value === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(value);
  if (!match || match[4]?.split('.').some(part => /^\d+$/.test(part) && part.length > 1 && part[0] === '0')) throw new Error(`Invalid exact semantic version: ${value}`);
}
function stat(path) { try { return lstatSync(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } }
function json(path) { return JSON.parse(readFileSync(path, 'utf8')); }
function writeJson(path, value) { writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' }); }

export function resolveTargets(scopeRoot, agents, name) {
  validateName(name);
  return [...new Set(agents.map(agent => {
    if (!Object.hasOwn(roots, agent)) throw new Error(`Unsupported agent: ${agent}. Choose codex, claude, cursor or universal.`);
    return join(resolve(scopeRoot), roots[agent], 'skills', name);
  }))];
}

// Do not follow symlinks within managed paths, even with --force.
function assertSafe(scopeRoot, path) {
  const rel = relative(scopeRoot, path);
  if (rel === '..' || rel.startsWith(`..${sep}`) || resolve(scopeRoot, rel) !== resolve(path)) throw new Error(`Path is outside installation scope: ${path}`);
  let current = scopeRoot;
  for (const part of rel.split(sep).filter(Boolean)) {
    current = join(current, part);
    const value = stat(current);
    if (value?.isSymbolicLink()) throw new Error(`Refusing symlink in managed path: ${current}`);
    if (value && !value.isDirectory()) throw new Error(`Expected a directory: ${current}`);
  }
}

export function treeHash(root) {
  const hash = createHash('sha256');
  function walk(directory, prefix = '') {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      if (!prefix && entry.name === META) continue;
      const name = `${prefix}${entry.name}`;
      if (entry.isSymbolicLink()) throw new Error(`Symlink is not allowed in skill content: ${name}`);
      if (entry.isDirectory()) { hash.update(`dir:${name}\0`); walk(join(directory, entry.name), `${name}/`); }
      else if (entry.isFile()) {
        const bytes = readFileSync(join(directory, entry.name));
        hash.update(`file:${name}\0${bytes.length}\0`); hash.update(bytes);
      } else throw new Error(`Unsupported file type: ${name}`);
    }
  }
  walk(root);
  return hash.digest('hex');
}

function installed(path) {
  if (!stat(path)) return { status: 'absent', path };
  try {
    const m = json(join(path, META));
    if (m.schema !== 1 || m.package !== PACKAGE || typeof m.hash !== 'string') return { status: 'unmanaged', path };
    validateVersion(m.version);
    return { status: treeHash(path) === m.hash ? 'managed' : 'modified', path, version: m.version };
  } catch { return { status: 'unmanaged', path }; }
}
function inspectCache(path, version) {
  const metadata = json(join(path, META));
  if (metadata.schema !== 1 || metadata.package !== PACKAGE || metadata.version !== version || metadata.hash !== treeHash(path)) throw new Error(`Cached version is damaged: ${version}`);
  return metadata;
}
function renderAlias(path, name) {
  if (name === PACKAGE) return;
  const skill = join(path, 'SKILL.md');
  const text = readFileSync(skill, 'utf8');
  if (!/^---\r?\n[\s\S]*?\r?\n---/.test(text) || !/^name: apple-design-skill$/m.test(text)) throw new Error('Packaged skill has an unexpected name');
  writeFileSync(skill, text.replace(/^name: apple-design-skill$/m, `name: ${name}`));
  const ui = join(path, 'agents', 'openai.yaml');
  if (existsSync(ui)) writeFileSync(ui, readFileSync(ui, 'utf8').replaceAll('$apple-design-skill', `$${name}`));
}

export function execute(options) {
  const { command, name, force = false, dryRun = false, version, packageRoot } = options;
  validateName(name);
  if (!['install', 'use', 'list', 'uninstall'].includes(command)) throw new Error('Unsupported command');
  if (!stat(options.scopeRoot)?.isDirectory()) throw new Error(`Scope directory does not exist: ${options.scopeRoot}`);
  const scopeRoot = realpathSync(options.scopeRoot);
  const targets = options.targets.map(path => join(scopeRoot, relative(options.scopeRoot, path)));
  const store = join(scopeRoot, '.apple-design-skill');
  assertSafe(scopeRoot, store);
  for (const child of ['versions', 'transactions', 'backups']) assertSafe(scopeRoot, join(store, child));
  targets.forEach(path => assertSafe(scopeRoot, path));
  if (command === 'list') {
    const versionsPath = join(store, 'versions');
    assertSafe(scopeRoot, versionsPath);
    const versions = stat(versionsPath) ? readdirSync(versionsPath).filter(v => { try { validateVersion(v); return stat(join(versionsPath, v))?.isDirectory(); } catch { return false; } }).sort() : [];
    return { command, store, versions, targets: targets.map(installed) };
  }
  if (command !== 'uninstall') validateVersion(version);
  const states = targets.map(installed);
  for (const state of states) {
    if (command === 'uninstall' && state.status === 'unmanaged') throw new Error(`Refusing to uninstall an unmanaged directory: ${state.path}`);
    if (['modified', 'unmanaged'].includes(state.status) && !force) throw new Error(`Existing ${state.status} files at ${state.path}; use --force to preserve a backup and replace them`);
  }
  let source;
  let sourceHash;
  const versionPath = command === 'uninstall' ? null : join(store, 'versions', version);
  if (versionPath) assertSafe(scopeRoot, versionPath);
  if (command === 'install') {
    const pkg = json(join(packageRoot, 'package.json'));
    if (pkg.name !== PACKAGE || pkg.version !== version) throw new Error('Package version does not match requested installation');
    source = join(packageRoot, 'skills', PACKAGE);
    if (!stat(join(source, 'SKILL.md'))?.isFile()) throw new Error('Packaged SKILL.md is missing');
    sourceHash = treeHash(source);
    if (stat(versionPath) && inspectCache(versionPath, version).hash !== sourceHash) throw new Error(`Version ${version} already exists with different content; publish a new version`);
  } else if (command === 'use') {
    if (!stat(versionPath)) throw new Error(`Version ${version} is not cached. Install it first with npx apple-design-skill@${version} install.`);
    inspectCache(versionPath, version); source = versionPath;
  }
  const plan = { command, store, targets: states.map(s => ({ ...s, status: command === 'uninstall' ? (s.status === 'absent' ? 'absent' : 'remove') : 'install', ...(command === 'uninstall' ? {} : { version }) })) };
  if (dryRun) return plan;
  if (command === 'uninstall' && states.every(s => s.status === 'absent')) return { ...plan, targets: states, backups: [] };
  mkdirSync(store, { recursive: true });
  const lock = join(store, 'lock');
  try { mkdirSync(lock); } catch (error) { if (error.code === 'EEXIST') throw new Error(`Another installation is active, or an interrupted lock remains: ${lock}. Check for a running installer before removing the lock.`); throw error; }
  const transaction = join(store, 'transactions', randomUUID());
  const entries = [];
  const backups = [];
  let finished = false;
  try {
    // Recheck after acquiring the per-scope lock; another invocation may have finished.
    states.forEach(s => {
      assertSafe(scopeRoot, s.path);
      const now = installed(s.path);
      if (JSON.stringify(now) !== JSON.stringify(s)) throw new Error(`Installation changed during preflight: ${s.path}. Retry.`);
    });
    mkdirSync(transaction, { recursive: true });
    if (command === 'install') {
      if (stat(versionPath)) {
        if (inspectCache(versionPath, version).hash !== sourceHash) throw new Error('Version cache changed during preflight');
      } else {
        const cacheStage = join(transaction, 'cache');
        cpSync(source, cacheStage, { recursive: true, errorOnExist: true, force: false });
        writeJson(join(cacheStage, META), { schema: 1, package: PACKAGE, version, hash: sourceHash });
        mkdirSync(dirname(versionPath), { recursive: true });
        renameSync(cacheStage, versionPath);
      }
      source = versionPath;
    }
    if (source) inspectCache(source, version);
    for (const [index, state] of states.entries()) {
      const staged = join(transaction, `new-${index}`);
      if (command !== 'uninstall') {
        cpSync(source, staged, { recursive: true, errorOnExist: true, force: false });
        rmSync(join(staged, META));
        renderAlias(staged, name);
        writeJson(join(staged, META), { schema: 1, package: PACKAGE, version, name, hash: treeHash(staged) });
      }
      entries.push({ ...state, staged, old: join(transaction, `old-${index}`), movedOld: false, movedNew: false });
    }
    for (const entry of entries) {
      mkdirSync(dirname(entry.path), { recursive: true });
      if (stat(entry.path)) { renameSync(entry.path, entry.old); entry.movedOld = true; }
      if (command !== 'uninstall') { renameSync(entry.staged, entry.path); entry.movedNew = true; }
    }
    // Keep replaced local work and all uninstalls recoverable, outside discovery directories.
    for (const entry of entries) {
      if (entry.movedOld && (command === 'uninstall' || ['unmanaged', 'modified'].includes(entry.status))) {
        const backup = join(store, 'backups', `${Date.now()}-${randomUUID()}`);
        mkdirSync(dirname(backup), { recursive: true }); renameSync(entry.old, backup);
        entry.old = backup; backups.push(backup);
      }
    }
    finished = true;
    return { ...plan, backups, targets: targets.map(installed) };
  } catch (error) {
    const failures = [];
    for (const entry of entries.toReversed()) {
      try {
        if (entry.movedNew) rmSync(entry.path, { recursive: true });
        if (entry.movedOld) renameSync(entry.old, entry.path);
      } catch (rollbackError) { failures.push(rollbackError.message); }
    }
    if (failures.length) throw new Error(`${error.message}; recovery files retained in ${transaction}: ${failures.join('; ')}`);
    finished = true;
    throw error;
  } finally {
    if (finished) rmSync(transaction, { recursive: true, force: true });
    rmSync(lock, { recursive: true, force: true });
  }
}
