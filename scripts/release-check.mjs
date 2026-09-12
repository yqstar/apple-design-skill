import { readFileSync } from 'node:fs';
import { validateVersion } from '../lib/installer.mjs';
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
validateVersion(pkg.version);
const ref = process.env.GITHUB_REF;
if (!ref || ref !== `refs/tags/v${pkg.version}`) throw new Error(`Release ref must be refs/tags/v${pkg.version}; received ${ref || '(none)'}`);
if (process.env.GITHUB_REPOSITORY !== 'yqstar/apple-design-skill') throw new Error('Unexpected publishing repository');
console.log(`Release validated: ${pkg.name}@${pkg.version}`);
