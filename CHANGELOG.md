# Changelog

## 0.0.2

- Remove multi-agent collaboration guidance and related package and plugin descriptions.
- Reorganize the README around a real before/after example, quick start, use cases and repository structure.
- Add installation, release and contribution guides, with dated references to established Skill repositories.
- Include the final Agent Lab pages and three screenshots; check example resources in CI while keeping them outside the npm package.

## 0.0.1

- First non-prerelease version, published through the GitHub Actions OIDC workflow.
- Accept CRLF skill sources during validation and keep repository text files consistently LF across platforms.
- Extend regression coverage for Windows checkout line endings and release tag validation.
- Retain the candidate version for exact-version installation, rollback and side-by-side comparison.

## 1.0.0-rc.1

- Package the existing Apple design guidance as a portable Agent Skill.
- Support project and user installations for Codex, Claude Code, Cursor and the shared Agent Skills directory.
- Add immutable local version snapshots, offline activation, named side-by-side installations, dry runs, backups and recoverable uninstall.
- Add optional multi-agent collaboration guidance while preserving host permissions and single-agent workflows.
- Add Codex and Claude plugin manifests, cross-platform CI, and tag-triggered npm trusted publishing.

This release candidate bootstraps the npm package before configuring its GitHub Actions trusted publisher. A stable release follows verification of the automated publishing path.
