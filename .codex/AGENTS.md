# ECC for Codex CLI

This supplements the root `AGENTS.md` with a repo-local ECC baseline.

## Repo Skill

- Repo-generated Codex skill: `.agents/skills/my-second-brain/SKILL.md`
- Claude-facing companion skill: `.claude/skills/my-second-brain/SKILL.md`
- Keep user-specific credentials and private MCPs in `~/.codex/config.toml`, not in this repo.

## MCP Baseline

Treat `.codex/config.toml` as the default ECC-safe baseline for work in this repository.
The generated baseline enables GitHub, Context7, Exa, Memory, Playwright, and Sequential Thinking.

## Multi-Agent Support

- Explorer: read-only evidence gathering
- Reviewer: correctness, security, and regression review
- Docs researcher: API and release-note verification

## Workflow Files

- `.claude/commands/database-migration.md`
- `.claude/commands/feature-development.md`
- `.claude/commands/test-driven-development.md`

Use these workflow files as reusable task scaffolds when the detected repository workflows recur.

## OpenSpec

- OpenSpec is the default spec-driven planning layer for this repository.
- Keep behavior contracts in `openspec/specs/` and proposed work in `openspec/changes/`.
- For non-trivial work, create or update an OpenSpec change before editing code.
- Use the OpenSpec loop: `/opsx:propose`, `/opsx:apply`, `/opsx:archive`.
- Prefer behavior-first specs and keep implementation detail out of `spec.md`.
- Do not add private backend implementation details to public-facing specs or docs.
