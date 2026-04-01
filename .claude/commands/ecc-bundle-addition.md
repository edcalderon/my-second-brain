---
name: ecc-bundle-addition
description: Workflow command scaffold for ecc-bundle-addition in my-second-brain.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /ecc-bundle-addition

Use this workflow when working on **ecc-bundle-addition** in `my-second-brain`.

## Goal

Adds or updates the my-second-brain ECC bundle, including skills, commands, instincts, agent configs, and related metadata for Claude and Codex agents.

## Common Files

- `.agents/skills/my-second-brain/SKILL.md`
- `.agents/skills/my-second-brain/agents/openai.yaml`
- `.claude/skills/my-second-brain/SKILL.md`
- `.claude/commands/feature-development.md`
- `.claude/commands/test-driven-development.md`
- `.claude/commands/database-migration.md`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Add or update SKILL.md and agent YAML files under .agents/skills/my-second-brain/
- Add or update SKILL.md under .claude/skills/my-second-brain/
- Add or update command markdown files under .claude/commands/ (feature-development, test-driven-development, database-migration)
- Add or update instincts YAML under .claude/homunculus/instincts/inherited/
- Update .claude/ecc-tools.json and .claude/identity.json

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.