# Coordinating design work across agents

Read this when the user requests a team or parallel work, or when the host's applicable instructions already authorize delegation. This reference does not grant permission to spawn agents or to change external systems. A small edit normally needs one agent.

## Choose independent work

Use the host's actual delegation mechanism. Do not invent tool names, emulate independent reviewers inside one conversation, or launch paid model requests merely because a role is listed here. If delegation is unavailable, do the work sequentially and disclose that limitation. Do not assume one provider's models, tools or effort settings exist on another host.

Useful bounded roles:

- **Design owner:** resolves the user's task, freezes shared visual tokens and the interaction contract, assigns file ownership, integrates changes, and owns the final result.
- **Implementer:** works on a named route or component using the supplied tokens and primitives. Receives an exclusive file list or isolated branch; returns code and the states it checked.
- **Interaction reviewer:** reads the relevant implementation and tests a concrete user journey without editing shared source. For dropdowns, checks the closed and expanded appearance, selected versus active state, keyboard behavior, dismissal and real committed value. For gestures, uses only the relevant motion checks from SKILL.md.

Do not assign multiple agents to edit the same stylesheet, token file or shared component. Have the owner establish those files first, or assign them to one implementer. Parallelize independent components or read-only reviews. If a prerequisite is still undecided, resolve it before dependent implementation.

## Handoff contract

Each assignment should state only what the agent needs:

```text
User goal and agreed scope:
Task and acceptance criteria:
Relevant skill sections and references:
Existing components / tokens / allowed files:
Constraints and authorization boundaries:
Required evidence and return format:
```

Provide the same product requirements to implementers. Give reviewers the user's requirements and current artifact, not a desired verdict or presumed bug. If requesting a skill/no-skill comparison, use isolated contexts where possible and disclose any shared context; don't label a review independent if it inherited the proposed answer.

Return file paths, changed behavior, checks actually performed, and unresolved issues. Keep screenshot evidence of expanded dropdowns when that UI changed. Distinguish screenshots from interaction evidence and real devices from viewport simulation.

## Integration

The owner reviews diffs, resolves token and ownership conflicts, then checks the integrated journey. A component passing alone does not prove that placement inside a dialog, iframe or narrow viewport works. Review the specific finding before applying a repair; don't merge conflicting suggestions mechanically.

Stop spawning agents when useful independent work is exhausted. Cancel obsolete assignments after scope changes. Keep one owner for deployment, release, messages, and other external side effects; delegation does not expand the user's authorization. Report which work was parallel, what was integrated, and any remaining verification gaps.
