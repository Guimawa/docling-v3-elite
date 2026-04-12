# .planning — Safe Usage

This directory is kept for workflow tools that need machine-readable planning state and historical phase context.

## What Is Authoritative

- Project/session truth: `JOURNAL.md`
- Human planning/specs: `docs/workflow/`
- Agent workflow continuity: `.planning/STATE.md` and `.planning/ROADMAP.md`

## Cleanup Policy (Non-Breaking)

- Do not delete `phases/**` summaries/plans by default.
- Keep `STATE.md` with a single valid YAML frontmatter block.
- Keep `ROADMAP.md` consistent with latest known phase progress.
- Prefer additive cleanup (clarify/normalize) over destructive cleanup (delete/move).

## If You Need Deeper Archiving

Before moving old artifacts to an archive folder:

1. Verify no active docs/scripts reference the target files.
2. Keep placeholders or redirect notes for moved files.
3. Update `docs/PLAN-ACTION-RESTE-A-FAIRE.md` references when needed.
