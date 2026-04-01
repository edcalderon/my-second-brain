---
name: ecc-bundle-addition
description: Workflow command scaffold for ecc-bundle-addition in my-second-brain.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /ecc-bundle-addition

Use this workflow when working on **ecc-bundle-addition** in `my-second-brain`.

## Goal

Adds or updates an ECC (Extended Cognitive Component) bundle for 'my-second-brain', including skills, agents, commands, instincts, and config files.

## Common Files

- `.agents/skills/my-second-brain/SKILL.md`
- `.agents/skills/my-second-brain/agents/openai.yaml`
- `.claude/skills/my-second-brain/SKILL.md`
- `.claude/commands/database-migration.md`
- `.claude/commands/feature-development.md`
- `.claude/commands/test-driven-development.md`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Add or update .agents/skills/my-second-brain/SKILL.md
- Add or update .agents/skills/my-second-brain/agents/openai.yaml
- Add or update .claude/skills/my-second-brain/SKILL.md
- Add or update .claude/commands/database-migration.md
- Add or update .claude/commands/feature-development.md

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.