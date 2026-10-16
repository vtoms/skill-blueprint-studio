# 0.10.0 assessment follow-up and test outcome

Date: 2026-10-16. Assessed baseline: `4cc0c20` (0.9.2). Implementation: 0.10.0, [commit 1ba77ba](https://github.com/vtoms/skill-blueprint-studio/commit/1ba77ba0fbc551e830bb7848a5da410ec39e72c8).

The external Argon source and screenshot assessments were checked against source, isolated browser probes and analyzer controls before implementation. This report records the accepted changes and their validation. External recommendations were treated as claims to verify, rather than instructions to apply indiscriminately.

## Delivered changes

| Verified problem | Delivered behavior | Regression evidence |
|---|---|---|
| Python definitions inside conditions/error-handling blocks could be omitted without a gap | Inventory nested conditional, loop, context-manager, exception/finalization and match-case definitions with enclosing conditions, lexical names and source lines. Unsupported syntax retains a readable unresolved description. Sources are never executed. | Python analyzer controls cover unconditional, conditional/nested alternatives, try/except/else/finally, loops, managed resources and match cases. |
| Supporting files could not be detached; a fresh data attachment misleadingly looked like an imported skill | Remove from skill displays step/dependency impact, clears active bindings and affected confirmations, and keeps original bytes. Undo/redo and Use in skill restore the editable file. Known authored origin is distinguished from imported/unknown legacy origin. Active external resources and imported/inherited baselines retain independent review. | Attachment domain tests and a browser detach/undo/redo/restore journey; existing import/source-integrity and gate tests. |
| Independent review was presented before local fixes and required awkward report handling | Local checks appear first. Run fresh AI review invokes a separate tool-disabled Claude Code session; the complete source/draft revision and digest are checked before and after. Results are displayed before explicit recording. Another-reviewer controls offer packet, copied instructions, fenced JSON paste and file loading. All report schema problems are shown together. | Review request/CLI schema, race, cancellation, size and gate tests; browser inspection-before-recording, unknown-rights blocker, JSON errors, passing synthetic fixture and later staleness. |
| Prose naming a tag could be rejected as embedded HTML | A single bare tag token in inline backticks can be an English identifier. Attributes, markup bodies and Python/HTML source fences remain blocked. | Content-policy tests retain both positive prose and negative source controls. |
| Repeated full redraws and serialization while typing | Coalesce stage/controller updates after 180 ms and reuse validation for that refresh. Serialize workspace data at the save debounce/flush, preserving fixed in-flight snapshots, queued edits, stale-write rejection and retry. Clear overlapping retry timers. | Browser 20-step typing probe limits stage replacement; persistence tests cover deferred serialization, edits during a pending write, failure, retry, conflict and recovery. No broad latency/memory improvement is claimed. |
| Canvas/navigation clutter and difficult large/mobile navigation | Named step jump with full-scale focus, compact overview below 45% zoom, boundary collision avoidance, separate mobile overview/editor panes, larger reorder targets, sticky inspector actions, fewer duplicate controls and optional instructions behind the info layer. Both themes remain supported. | Geometry tests and desktop/mobile browser journeys cover selection, movement, keyboard/pointer/pinch controls, review/test freshness, search/jump, themes and viewport width. |
| Empty initial file category and misleading inside count | Supporting files starts on a populated category; inside-step counts include bound references/resources and the file section states its count. | Browser data-file discovery and attachment test. |
| Notifications could intercept interaction; repeated navigation/copy | Pointer-transparent corner notifications; Projects-first landing with Continue editing; duplicate Restore and Canvas order actions consolidated; singular/plural issue wording corrected. Essential errors remain persistent. | Browser interaction, Projects, mobile and appearance suites. |
| Dangling preview fallback and locally stale standalone output risk | Use the existing screen default helper. Expose a pure build function, normalize line endings and fail local tests when committed standalone output differs from source. | Screen-preview journeys, module syntax check and source-to-artifact comparison; CI rebuild/diff remains enabled. |

Review request/report rendering and attachment operations have separate modules. The existing Node/SQLite/Python architecture, single-user boundaries, original-byte preservation, separate optimization baseline and sequential execution model remain in place. There is no new runtime dependency or database schema/template change. New implementation and tests are project-authored MIT code; see [the application dependency and provenance inventory](../studio/THIRD_PARTY_APPLICATION.md).

## Validation outcome

The complete `npm run test:all` release run passed on Windows using Node.js 24.19.0, Python 3.12.14 and the locked Playwright/Chromium tooling:

| Layer | Outcome |
|---|---|
| Standalone build | Generated successfully; current-source comparison and module syntax checks passed |
| Node suite | **109 passed**, zero failed/skipped |
| Python source analyzer | **12 passed**, zero failed |
| Browser journeys | **16 passed**, zero failed/skipped, using isolated temporary databases and synthetic provider fixtures |
| Visual inspection | Reviewed generated light/dark desktop Canvas and dark mobile editor captures; mobile width/navigation and contrast controls are additionally exercised by the browser suite |
| Live Claude Code adapter smoke | Claude Code 2.1.299 / `claude-opus-5-5`, one small self-authored generic review fixture. Returned all 10 topics, **changes required**, five findings, licensing unknown; no report automatically recorded. This is a successful adapter/negative-gate exercise, not a passing skill assessment. |
| Hosted CI for implementation commit | **Passed**: Windows Node/Python, Linux Node/Python, Linux browser journeys and generated-artifact drift checks. [Run 38882767981](https://github.com/vtoms/skill-blueprint-studio/actions/runs/38882767981). |
| Module boundaries | Static scan of 48 non-test modules / 107 local import-re-export edges found no cycles. This is not a parser or runtime proof. |
| Existing working database | Revision and logical payload digest unchanged by application testing; tests used separate data folders |

The [CI workflow](../.github/workflows/ci.yml) repeats Node/Python checks on Windows and Linux, browser journeys on Linux, and committed-artifact drift checks for every push. Consult the workflow run for the release commit for hosted results. Live provider responses are intentionally excluded from automated CI.

The regression run caught dialog routing, mobile view-state, in-flight save timer and stale test expectations during implementation; these were corrected before the passing release run. Earlier failed development runs are not counted as release passes.

## Findings qualified or not adopted

- Import was already available in Add a skill. The visible Describe dialog was a later branch of that journey.
- Lower inspector controls were scrollable and reachable. Sticky actions improve discovery; missing controls were not reproduced.
- Start/finish already opened Brief. Their collision/truncation handling was improved without replacing that navigation.
- First/last order buttons already enforced disabled boundaries; visual/touch affordances were improved.
- Normal screen preview worked. The undefined fallback was cleaned up without claiming a reproduced normal-path crash.
- The cited suspicious markup was an intentionally escaped adversarial test fixture. Escaping/source evidence remains intact.
- Existing focus-visible behavior was retained. Durable storage remains SQLite; it was not IndexedDB.
- The analyzer already supported the checked elif and set examples. The narrower conditional-definition omission was the confirmed defect fixed here.

## Deliberately separate work

This is an instruction-authoring tool, not a hosted execution engine. A framework rewrite, branching execution graph, shared cloud/multiuser coordination, full obstacle-avoiding connector routing, storage normalization and broad virtualization were not justified by the verified findings. Larger-workspace latency/memory benchmarking and further controller/CSS simplification remain follow-up architecture work. No representative-user usability study or complete assistive-technology certification is claimed.

Automated application tests and the live review-adapter smoke do not establish that any particular generated skill works against a real target system. That requires the exact exported revision, authorized working connections, controlled data, final-output checks and missing-input/tool-failure cases in the intended test environment.

## What needs attention on the other laptop

1. Back up its projects/workspace and preserve its private branch and customized launcher before merging this public release. Keep internal platform rules and private skill/test files out of the public repository.
2. Merge public updates into that branch, resolve shared editor/launcher changes, rebuild and restart. Reuse its existing data directory; do not replace its database with the empty template.
3. Retest its portable startup/readiness behavior, native/npm Claude discovery and customized tool hints in both editor paths. This repository cannot verify a portable distribution on another computer.
4. Retest both themes, Canvas, Improve, backup/restore and the new review flow there. Run the intended exported skill through its real connections to the final output and failure cases. A first-screen check alone remains partial acceptance.

See [consultant/platform checks](CONSULTANT_CHECKS.md), [review policy](../studio/INDEPENDENT_REVIEW_RULE.md), [storage](STORAGE.md) and [UX decisions](UX.md).
