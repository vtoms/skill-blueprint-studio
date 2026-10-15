# Changelog

## 0.7.0 — 2026-10-15

- Reorganize skill editing into Brief, Steps, Rules & files, Input & output, Review & package, Test in Claude, and Improve; keep every section directly accessible.
- Add an inline autosaving brief, factual chapter status, mobile section picker, contextual info overlays and persistent errors.
- Give Step by step, List and Canvas distinct jobs; add attention filtering and accessible inspector tabs and hints.
- Replace the card grid with a spatial SVG flowchart: movable shapes, labelled connectors, insertion, pan/zoom/fit/focus, automatic arrangement, text outline and keyboard/click/tap controls.
- Store diagram coordinates in SQLite and backups without changing execution order, semantic revision, independent review evidence or test freshness.
- Keep run-order changes explicit and retain changed-input review. Reset layout for improved versions with fresh step identities while preserving the frozen source layout.
- Move improvement controls and draft decisions into their relevant sections; clarify package checks, external testing and version resets.
- Preserve all import, source, export, optimization and database gates. Add layout, review-integrity and honest-status regression coverage.
- Document researched UX decisions and provenance. No runtime package or copied prototype component was added.

## 0.6.0 — 2026-10-15

- Add AI optimization after import and in the workflow editor through the existing optional Claude Code CLI.
- Create separate derived drafts with a frozen baseline, original/proposed comparison, source/facet mappings and model provenance.
- Allow step reordering, merging and splitting, or enforce the exact existing sequence.
- Preserve source bytes, asset/reference bindings, shared rules, tool settings, screens and expected scenarios; reset approvals and test observations.
- Carry unresolved decisions forward and require optimization setup review, step confirmation and fresh independent import review.
- Reject incomplete coverage, invalid metadata, corrupted baseline evidence, stale sources and cancelled requests; preserve unsaved drafts on database conflicts.
- Escape dynamic form labels and keep dialog actions visible while long comparisons scroll.
- Document version storage, privacy, scope, external runtime terms and validation limits.

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
