# Changelog

## 0.5.0 — 2026-10-15

- Add prompt-first fresh skill setup through a separately installed, signed-in Claude Code CLI.
- Review the generated brief, step contracts, facets, screens, references, assumptions, questions and expected test results before adding the draft.
- Preserve the original authoring prompt and model provenance in project backups and the local database.
- Require setup review and per-step confirmation before export; record confirmed setup answers as shared definitions.
- Keep all generated scenarios untested, with actual testing and observations remaining separate.
- Support refinement, cancellation, failure recovery, bounded structured output and manual blank authoring.
- Document the external Claude Code dependency, provider usage and applicable terms.

## 0.4.0 — 2026-10-15

- Move authoritative workspace persistence from browser storage to a local SQLite database.
- Include an empty, ready-to-use database template and a reproducible template generator.
- Preserve working databases across builds and restarts; expose configurable local data directories.
- Add transactional saves, bounded prior-state snapshots, and stale-write protection across browsers.
- Add explicit review and copying of earlier browser data without deleting its originals.
- Show acknowledged save status, failure/retry handling, and conflict recovery with backups.
- Label standalone-file use as a memory-only preview.
- Document storage, migrations, backup/transfer, runtime dependencies, licenses, and the local security model.

## 0.3.0

- Integrate the shared inline editor with Canvas, List, and Step-by-step views.
- Add insertion points, facet order controls, Markdown preview, and persisted input-change review.

## 0.2.0

- Add Projects → Skills → Fresh or Import navigation, independent skill storage, and project/workspace backups.
