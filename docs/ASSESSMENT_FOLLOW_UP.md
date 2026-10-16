# 0.10.1 alignment follow-up

Date: 2026-10-16. Reviewed baseline: `d36d6dd` (0.10.0). The second Argon assessment found the core aligned; independent reproduction confirmed the targeted follow-up below. The source and visual assessments were advisory: the reviewer did not execute the application or certify real target-system behavior.

| Verified finding | Implemented correction | Evidence |
|---|---|---|
| Canvas labels covered card contracts | Bound and position labels in free space; hide only a decorative label when a custom arrangement leaves no safe space. Full handoffs remain in nodes/editor. | Geometry controls and real DOM rectangle intersections at full scale. |
| Overview titles were squeezed by invisible rows | Remove hidden contract/status rows from layout; reserve space for two title lines. | Browser checks actual title height against line height for 20 shapes. |
| Mobile Canvas was mostly below the viewport | Compact repeated chrome and bring the workbench into view when changing views/panes. Keep zoom, fit, focus, pan and help accessible. | Touch-enabled 390×844 browser measures at least 300 visible diagram pixels on view entry. |
| Mobile switches did nothing in Guided/List | Apply the same overview/editor pane state in all three views. | Visibility assertions for both panes in Guided, List and Canvas. |
| Restore existed in only one source presentation | Both source entry points share eligibility/actions, including Markdown restoration. Restoring Markdown stays in its editor rather than running asset analysis. | Domain and real import/edit/rename/remove/restore journeys. |
| Inside counts and preparation guidance differed | Count bound files with inside items, fix singular chapter counts, clarify management links, and show actual preparation state and next action. | Count/guidance controls and existing review/export journeys. |
| Duplicate unreachable dialog branches and unused helper | Remove them; preserve real handlers, review-step focus and engine checks. | Bundle syntax/freshness and full browser regressions. |
| Removing a category's final file left an empty filter | Allow populated-category selection again after that removal. | Existing attachment lifecycle and source inspection; deliberate manual empty-category browsing remains supported. |
| START could be placed below the first step | Prefer a free upper or side lane before falling back to collision displacement. | Normal/reverse geometry controls preserve order and avoid shape overlap. |
| Standalone Markdown had no retained original/review association | Preserve exact UTF-8 bytes, source association across edits/renames, distinct history on repeated imports, atomic selection rejection and restore. Gate active external references and inherited baselines; block missing associated originals. | BOM/CRLF byte comparisons; malformed/duplicate selection controls; stale report, backup, source history and derived-version tests; actual UI import/restoration. |

The full local release run passed **115 Node tests, 12 Python analyzer tests and 18 browser journeys** (145 total), with no failures or skipped tests. Browser fixtures use temporary databases and synthetic provider responses. The new lifecycle journey exposed an unintended asset-analysis redirect after restoring Markdown; this was corrected before the passing run. A pre-existing journey assertion also caught removal of the explicit runtime-testing limitation; that visible message was restored. These development failures are not counted as passes. Subsequent copy-only refinements receive focused checks before review.

The standalone bundle was regenerated. Node/Python baseline, Playwright lockfile versions, SQLite physical schema/template and review-policy version are unchanged. No third-party implementation or runtime package was added; the new code remains MIT. Known-authored skills stay authored when attaching external references. Old references whose bytes were never retained need re-import; provenance is not invented retrospectively.

### Independent re-review and second correction pass
+
+The exact `gemini-4-argon` model assessed candidate `8246fbe`: the source verdict was **Aligned** and the visual verdict **Substantially aligned**. The API received all **113** tracked files and **25** fresh isolated captures. Its source prose incorrectly counted 93 files; the saved manifest and request are authoritative about what was supplied. The reviewer did not run tests or use a live browser.
+
+Reproduction confirmed misleading active-history labels after reimport/path collisions, Back to workflow scrolling past the mobile controls, missing legacy byte-size display and singular attention wording. These were corrected. Both source presentations now distinguish **In skill** from **Path in use**, explaining how to restore a historical version without replacing a different document. Legacy sizes derive from retained bytes without changing historical records. Editor padding allows management links to scroll clear of transient notices. Insertion buttons are hidden when a custom arrangement leaves them overlapping a shape; Add step remains available. A reference named `SKILL.md` no longer relabels a known authored skill as a whole import, while independent review remains required. Generated source-history paths are checked before mutation.
+
+The optimizer already preserved current references, source associations and originals in its context, derived skill and frozen baseline; byte/metadata assertions now verify renamed references explicitly. A runtime skill ZIP intentionally contains current instructions, while editable backups and original-file archives retain source history. The review's headline claim that Improve drops provenance was not reproduced. Its narrower request for clearer source-association instructions and derived-review wording was adopted. The alleged persistent Fit mode was ordinary pointer hover (cleared when the pointer moved); the alleged sliced FINISH text was a viewport crop (the node extended below the screenshot and already had a two-line clamp). No application change was warranted for those two claims.
+
+After this pass, the full local suite passed **116 Node tests, 12 analyzer tests and 18 browser journeys** (146 total), with zero failures/skips. A final path-length guard receives focused lifecycle/build checks before the next review. The revised tests cover historical identity vs. occupied paths, retained optimization provenance, legacy metadata, reference naming, tight insertion geometry, mobile Back behavior and scroll clearance. The existing database's revision and logical payload digest remained unchanged.
+
+A further source/image review of the corrected candidate and hosted CI are pending; their final outcomes will be recorded before completion.

On another computer: back up work, preserve its private branch/custom launcher, merge the public update, rebuild and restart against the existing database. Retest launcher discovery, private tool hints in both editor paths, both themes, Canvas, Improve, backups and the review flow. An exported skill still needs its exact revision tested through authorized real connections to final output and failure cases. Do not replace a working database with the empty template or publish private rules/test data.

---

# 0.10.0 assessment follow-up and test outcome

Date: 2026-10-16. Assessed baseline: `4cc0c20` (0.9.2). Initial implementation: 0.10.0, [commit 1ba77ba](https://github.com/vtoms/skill-blueprint-studio/commit/1ba77ba0fbc551e830bb7848a5da410ec39e72c8).

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
| A follow-up CI run exposed intermittent rapid-edit failure after adding a step | Reproduced a delayed animation-frame callback stealing focus back to the title. Focus the inserted step synchronously; subsequent edits keep their active field. Mobile Canvas insertion opens its editor before focusing. | Projects journey forces a delayed browser frame, checks active-field preservation and title contents, and waits for synchronized views before counting. |
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
| Hosted CI for initial implementation commit | **Passed**: Windows Node/Python, Linux Node/Python, Linux browser journeys and generated-artifact drift checks. [Run 38882767981](https://github.com/vtoms/skill-blueprint-studio/actions/runs/38882767981). |
| Module boundaries | Static scan of 48 non-test modules / 107 local import-re-export edges found no cycles. This is not a parser or runtime proof. |
| Existing working database | Revision and logical payload digest unchanged by application testing; tests used separate data folders |

The [CI workflow](../.github/workflows/ci.yml) repeats Node/Python checks on Windows and Linux, browser journeys on Linux, and committed-artifact drift checks for every push. Consult the workflow run for the release commit for hosted results. Live provider responses are intentionally excluded from automated CI.

The regression run caught dialog routing, mobile view-state, in-flight save timer and stale test expectations during implementation. A later hosted run exposed an intermittent Projects failure: a deterministic delayed-frame probe reproduced focus theft after inserting a step. Synchronous focus and a regression were added before the final passing local run. Earlier failed development runs are not counted as release passes.

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
