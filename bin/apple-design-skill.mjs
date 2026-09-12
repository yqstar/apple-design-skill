#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execute, resolveTargets, validateName, validateVersion } from '../lib/installer.mjs';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const defaultAgents = ['codex', 'claude', 'cursor'];
const help = `apple-design-skill ${pkg.version}

Usage:
  apple-design-skill install [options]    Install this npm package's skill version
  apple-design-skill use VERSION [options] Activate a previously installed version, offline
  apple-design-skill list [options]       List cached versions and selected installations
  apple-design-skill uninstall [options]  Remove a managed active copy; keep version history

Options:
  --agent NAME[,NAME]  codex, claude, cursor, universal (repeatable)
  --all               Codex + Claude Code + Cursor (default)
  --global            User scope, in your home directory (default)
  --project [PATH]    Project scope; omit PATH to use the current directory
  --name NAME         Skill name; use a distinct name for side-by-side versions
  --force             Back up and replace existing or locally modified files
  --dry-run           Show planned changes without writing files
  --json              Emit machine-readable results
  -v, --version       Print npm package version
  -h, --help          Show help

Default: install for Codex, Claude Code and Cursor in your home directory.
  Codex:       ~/.agents/skills
  Claude Code: ~/.claude/skills
  Cursor:      ~/.cursor/skills
Use --agent to select tools, or --agent universal for only .agents/skills.
All commands use the same scope and target defaults; use --project for project copies.
No files are installed by npm postinstall; run the install command explicitly.

Examples:
  npx apple-design-skill@${pkg.version} install
  npx apple-design-skill@${pkg.version} install --agent claude
  npx apple-design-skill@${pkg.version} install --project
  npx apple-design-skill@${pkg.version} install --agent codex --project ./my-project
  npx apple-design-skill@${pkg.version} install --name apple-design-pinned
  npx apple-design-skill@latest use ${pkg.version} --all
`;

try {
  const argv = process.argv.slice(2);
  if (!argv.length || argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(help); process.exit(0);
  }
  if (argv.length === 1 && ['--version', '-v'].includes(argv[0])) {
    process.stdout.write(`${pkg.version}\n`); process.exit(0);
  }
  const command = argv.shift();
  if (!['install', 'use', 'list', 'uninstall'].includes(command)) throw new Error(`Unknown command: ${command}`);
  const requestedVersion = command === 'use' ? argv.shift() : pkg.version;
  if (command === 'use') validateVersion(requestedVersion);
  let scopeRoot = homedir();
  let scopeFlag;
  const agents = [];
  const options = { command, packageRoot, version: requestedVersion, name: 'apple-design-skill', force: false, dryRun: false };
  let json = false;
  const next = (flag, i) => {
    if (!argv[i + 1] || argv[i + 1].startsWith('-')) throw new Error(`${flag} requires a value`);
    return argv[i + 1];
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--agent') { agents.push(...next(arg, i++).split(',')); }
    else if (arg === '--all') { agents.push(...defaultAgents); }
    else if (arg === '--project' || arg === '--global') {
      if (scopeFlag) throw new Error('Choose one of --project or --global');
      scopeFlag = arg;
      if (arg === '--project') {
        const path = argv[i + 1] && !argv[i + 1].startsWith('-') ? argv[++i] : '.';
        scopeRoot = resolve(path);
      } else scopeRoot = homedir();
    } else if (arg === '--name') { options.name = next(arg, i++); }
    else if (arg === '--force') options.force = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--json') json = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  validateName(options.name);
  options.scopeRoot = resolve(scopeRoot);
  options.targets = resolveTargets(options.scopeRoot, agents.length ? agents : defaultAgents, options.name);
  const result = execute(options);
  if (json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else {
    if (result.versions) process.stdout.write(`Cached versions: ${result.versions.join(', ') || '(none)'}\n`);
    for (const entry of result.targets) process.stdout.write(`${entry.status}: ${entry.path}${entry.version ? ` (${entry.version})` : ''}\n`);
    if (result.backups?.length) process.stdout.write(`Preserved backups:\n${result.backups.join('\n')}\n`);
    if (options.dryRun) process.stdout.write('Dry run; no files changed.\n');
    else if (['install', 'use'].includes(command)) process.stdout.write('Open a new agent session if the skill is not discovered immediately.\n');
  }
} catch (error) {
  process.stderr.write(`apple-design-skill: ${error.message}\n`);
  process.exitCode = 1;
}
