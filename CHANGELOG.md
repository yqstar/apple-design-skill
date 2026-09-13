# Changelog

## Unreleased

- Remove the example's experimental WebMCP adapter, unused public methods and duplicate filter notification; keep the interactive comparison pages and screenshots.
- Remove the one-off repository research note and ignore local self-installation copies.
- Validate local Markdown links and lockfile metadata alongside package and plugin manifests.

## 0.0.4

- Require whole-page visual inspection across supported layouts and relevant themes, including representative pages affected by shared component or token changes.
- Clarify completion and handoff: finish the requested work and relevant checks, then summarize results and limitations in the final response without extra delivery artifacts by default.
- Verify expanded dropdown appearance through direct visual inspection or temporary captures, without requiring retained screenshots; clean up task-created temporary files.

## 0.0.3

- Default all CLI commands to user scope and the Codex, Claude Code and Cursor targets; keep `--global` and `--all` as explicit equivalents.
- Support `--project` for the current project and `--project PATH` for a specific project, with `--agent` limiting the selected tools in either scope.
- Document the default change from 0.0.2 and earlier, and verify user/project isolation across installation, activation, listing and uninstall.

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
