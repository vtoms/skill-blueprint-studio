# Skill Blueprint Studio

A local visual authoring prototype for building reviewable Claude skills. Define a process as meaningful input-to-output steps, manage the functions and rules inside each step, and export a skill ZIP with Markdown instructions and supporting assets.

## Start with projects

The app always opens on **Projects**, including after a reload. Create a project or open an existing one to see its skills. A project starts empty and can contain multiple independent skills.

Choose **Add skill**, then **Create a fresh skill** or **Import an existing skill**. A fresh skill starts with **Start with a prompt**: describe its goal, inputs, outputs, rules, tools and exceptions, generate a draft through your local Claude Code CLI, review it, and open the editor. **Start blank** provides manual authoring. Imports open a proposed-workflow review before they are added. Adding a skill preserves existing skills.

Skills open on **Brief**. The editor follows seven directly accessible sections:

1. **Brief** — describe the skill, its overall input and final result, and instructions that apply throughout.
2. **Steps** — define the meaningful transformations and handoffs.
3. **Rules & files** — manage shared values, reference documents, supporting files, and original source.
4. **Input & output** — describe the input fields and result presentation; preview illustrative rows.
5. **Review & package** — resolve structural issues and required independent review, inspect generated instructions, then download.
6. **Test in Claude** — run the downloaded skill externally and record what actually happened.
7. **Improve** — ask Claude to propose a separate version, compare it with the frozen baseline, and review its decisions.

The numbered navigation and Previous/Next links suggest an order without locking sections. Mobile uses a section picker. Info buttons open contextual explanations in one accessible overlay; essential errors, review requirements, and provider transmission notices remain visible. See the [UX and Canvas guide](docs/UX.md).

Prompt-generated drafts include the brief, steps, inside items, reference documents, screen definitions and tests. **Review draft decisions** in Brief exposes assumptions and open questions. Answers become shared values. Each proposed step requires confirmation; tests begin **Not run yet**. See [prompt setup](docs/PROMPT_SETUP.md).

After import, choose **Add & improve a copy**, or open **Improve → Create improved version** later. AI can clarify instructions and propose reordered, combined or split steps in a separate draft. The original remains intact; frozen comparisons preserve the generated proposal even after later edits. Confirmations, independent review and actual test results must be obtained again. Disable resequencing to keep the current order. See [optimization and versions](docs/OPTIMIZATION.md).

**Steps** offers three views of the same skill:

| View | Primary job |
|---|---|
| Step by step | Focus on writing one step alongside an ordered navigation rail |
| List | Scan contracts and checks, filter steps needing attention, and adjust run order |
| Canvas | Understand and arrange the process as a two-dimensional connected flowchart |

Canvas has movable shapes, start/finish boundaries, labelled arrows, insertion points, pan, zoom, Fit, Focus step and Auto arrange. Layout is saved with the skill and included in backups. Dragging a shape changes its picture position; **Run earlier/later** changes execution order. Buttons and keyboard controls provide alternatives to dragging. A text outline exposes the ordered process. Canvas remains spatial on mobile, with the editor below it.

Edit **Needs → Does → Produces**, **Inside this step**, **Example**, and **Original source** for imported steps. Text changes save as you type; view switches preserve selection and expanded inside items. Inner rules, tools and files stay with their step. The process remains sequential: free graph connections and executable branches are not implemented.

When insertion, deletion or reordering changes a step's predecessor, **Check new input** records the earlier handoff and survives reload and backups. Review affected instructions and confirm the new input before download. Undo restores the order and review state. Layout-only changes do not alter skill revision, invalidate independent review, or make test results stale.

Use the project breadcrumb or **Project skills** to return to the skill list, and **Projects** to return to the directory. The demo remains an explicit **Explore the demo** option.

## Run locally

Requirements: Node.js 24.15 or later, Python 3.12 or later for source analysis, and a modern browser. No npm/pip package installation or API key is needed. The server uses Node's built-in SQLite module.

Prompt generation and AI optimization additionally require the native Claude Code CLI **2.1.299 or later**, signed in as the operating-system user running the server. Run `claude auth login` in that user's terminal. Drafting uses the CLI's configured account and model; account limits and provider billing apply. Set `STUDIO_CLAUDE_PATH` when the native executable is not detected and `STUDIO_CLAUDE_MODEL` to select a specific supported model or alias. Manual authoring and import remain available without Claude Code.

```sh
npm run build
npm start
```

Open http://127.0.0.1:8766. The server listens on loopback only. On first start it copies the supplied empty database template to `.local-data/workspace.sqlite`. All browsers using this server load that same database. Existing working databases survive builds and server restarts.

Set `STUDIO_PORT` to choose another port and `STUDIO_DATA_DIR` to select a writable database folder. Set `STUDIO_PYTHON` to a Python executable path if needed; otherwise the server uses `python` on Windows and `python3` elsewhere. Keep the data folder outside `studio/`, which is the server's static file root.

Opening `studio/dist/skill-blueprint-studio.html` directly provides an explicitly labelled memory-only preview. It does not save work to a browser or a database; download a backup before closing. Durable storage and source analysis require the local server.

## What you can do

- Organize multiple skills inside projects, with a project directory and skill list.
- Start a new skill from a natural-language prompt using the local Claude Code CLI, review its proposed contracts, and continue editing.
- Edit step contracts and inside items directly in Canvas, List, or Step-by-step views; insert and reorder steps with explicit inputs and outputs.
- Resolve a local rule override by using the shared value, updating the shared rule after reviewing its uses, or creating a separate rule.
- Define inner functions, decisions, tool contracts, exceptions, shared rules, and references.
- Specify input fields, output columns, presentation rules, and illustrative screen data.
- Import Markdown or a skill ZIP, retain complete original bytes, and review heading-based proposed steps.
- Generate a separate optimized version with optional resequencing, complete source/facet mapping, frozen comparisons and fresh review/test requirements.
- Draft English Markdown specifications from Python and HTML source without executing imported programs.
- Keep data and structural assets unchanged, with structural inventories for supported formats.
- Record acceptance scenarios and runtime observations.
- Resolve structural conflicts and export `SKILL.md`, Markdown references, and retained assets.
- Save and reopen an editable project backup.

**Explore the demo** opens an optional example project. Its skill intentionally contains one conflicting shared-rule override. Open **Review & package** to inspect it, then remove the override from **Read source data** to use the shared value.

## Light and dark appearance

Use the sun/moon **Light / Dark** button in the header to switch appearance. The initial appearance follows your device setting until you choose a mode. The choice is saved in the local SQLite workspace and used by other browsers connected to that server after reload. It does not use browser storage or change skill instructions, review status, or test results.

Both themes cover the editor, spatial Canvas, forms, previews, dialogs, and info overlays. Standalone-file preview keeps the choice only for that tab. A preference is shared by the local workspace; separate servers have independent preferences.

## Saving and backups

Projects and skills autosave to the local SQLite database through the server. **Saved to local database** appears after the server acknowledges a committed write. **Saving**, **Changes not saved**, and **Save conflict** distinguish pending or failed writes. Text edits are grouped into saves; avoid closing while a save is pending.

**Back up project** downloads every skill in the selected project as a `.blueprint.json` file. **Back up projects** on the directory downloads the whole workspace. **Back up this skill** in Review & package keeps the individual `.agentic.json` format. Backups include the current working copy, so unsaved changes can be preserved after a connection failure or conflict.

**Restore project** accepts a project, workspace, or older single-skill backup and adds recovered projects without overwriting existing ones. **Restore a skill backup** adds an individual backup to the current project. When earlier browser data exists, **Review browser data** lets you inspect and copy it into the database. It is never imported automatically, and its original browser copy is retained. The old version may have saved an untouched demo; copying it is optional.

Concurrent browser sessions use revision checks. A stale session cannot overwrite newer saved data: back up its unsaved changes, then **Reload database** to use the current saved projects. Failed writes retain the working copy for retry or backup. A failed initial database load cannot overwrite saved projects with an empty workspace.

Git distributes application code and the empty database template. It does not sync working projects between computers. Use workspace backup/restore to move projects, or transfer the complete data folder while the server is stopped. The working database and journal files are ignored by Git. Read the [storage and migration guide](docs/STORAGE.md) for database location, snapshots, recovery, and transfer details.

## Independent review of imports

Imported skills require a current independent adversarial review before normal export. Download a review packet, have a separate reviewer inspect the original source and converted draft in a fresh context, and import their completed JSON report.

The report must cover all required topics, establish permission for the intended use, match the current SHA-256 snapshot, and have no unresolved critical, high, or medium findings. Edits to reviewed specifications invalidate the pass. Static indicators and resource approvals cannot replace this review.

See [the internal review rule](studio/INDEPENDENT_REVIEW_RULE.md). This prototype accepts externally completed reports; it does not invoke a model reviewer. Reviewer identity is declared rather than authenticated, and local project files are editable.

## Tests and build

Application startup and builds use Node/Python standard libraries and need no package installation. To run the complete development checks:

```sh
npm ci --ignore-scripts
npx playwright install chromium
npm run build
npm test
npm run test:analyzer
npm run test:browser
```

Playwright and its pinned Chromium are development tools only. On Linux, `npx playwright install --with-deps chromium` also installs required browser system libraries. Set `STUDIO_PYTHON` if Python is not on PATH. `npm run test:all` runs build, Node, Python and browser checks after the tools are installed.

The browser tests are published in `tests/browser/`. Each uses a separate temporary SQLite workspace and disables real provider execution. They cover projects, prompt/import flows, editing and export, diagram interaction, help, themes, independent-review gates, optimization versions and save conflicts. Screenshots go to ignored `test-results/browser/`. An optional `STUDIO_BROWSER_EXECUTABLE` selects an existing browser for local development; CI uses the pinned Chromium.

GitHub Actions runs Node/Python checks on Windows and Linux, and browser journeys on Linux, for pushes and pull requests to `main`. It also verifies the committed build and empty database template. Tests use self-authored generic inputs; no private skill, working database, credentials or Claude account is needed. See [hardening and validation](docs/HARDENING.md) for limits and the module map.

`npm run examples` produces a generic example ZIP and editable project in `studio/dist/`. Example exports pass structural validation; they do not assert successful model execution.

## Current limits

This is an authoring prototype, not a workflow execution service. It does not provide model chat, live tool connections, authenticated review jobs, or a branching execution engine. Screen previews use illustrative values.

Imports propose steps from Markdown headings. Source analysis drafts behavior contracts; parsing coverage does not prove semantic equivalence. HTML layout, styling, interactions, dynamic library behavior, and embedded native or macro code can require manual specifications and review. Structural asset inventories do not infer domain meaning or recalculate workbooks.

Projects are stored in a local database. This release is a local single-workspace application; it does not provide accounts, cloud sync, collaborative merging, or shared storage between separate servers. Reload to see another browser's saved changes. Archive input is limited to 120 entries, 2 MB per file, and 8 MB total. Individual skill backups are limited to 32 MB, project backups to 64 MB, and workspace backups to 128 MB.

Source analysis processes one request at a time: up to 120 files, 8 MB of decoded input and a 12 MB JSON upload. Workbook contents are capped at 500 internal entries and 32 MB expanded, with 4 MB per XML part. Requests that exceed limits leave original files available for manual specification. See [the full limits](docs/HARDENING.md).

## Code and license

The application UI, workflow model, SVG flowchart and gesture controls, contextual help, compiler, ZIP handling, analyzer, review gate, database, drafting and optimization adapters, server, and build tooling were authored for this project. An external Claude Design assessment and published UX guidance informed the redesign; its prototype code and support files are not included. There are no npm/pip application runtime dependencies or vendored UI components. Playwright is a development-only dependency under Apache-2.0; see the inventory below. Node provides the SQLite engine; SQLite's deliverable code is public domain. Prompt generation and optimization invoke a separately installed Claude Code CLI, governed by Anthropic's terms; its executable code is not distributed here. The browser, Node.js, and Python provide the other platform APIs.

The application is licensed under [MIT](LICENSE). See [the provenance and runtime inventory](studio/THIRD_PARTY_APPLICATION.md). Runtime binaries are not distributed with this repository.

## Development and validation

Run `npm test` for the workflow, review, database, persistence, and HTTP tests. Run `npm run test:analyzer` for Python analyzer tests (`python3` may be required on some systems). Set `STUDIO_PYTHON` before running `npm test` when Python is not on PATH. `npm run db:template` regenerates only the empty database template; ordinary builds never touch the working database. See [contributing](CONTRIBUTING.md), [security](SECURITY.md), and the [changelog](CHANGELOG.md).

For solo import review, combined step confirmation, administrator-provided tool identifiers, startup behavior and runtime acceptance criteria, see [consultant checks and platform integration](docs/CONSULTANT_CHECKS.md).
