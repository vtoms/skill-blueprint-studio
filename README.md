# Skill Blueprint Studio

A local visual authoring prototype for building reviewable Claude skills. Define a process as meaningful input-to-output steps, manage the functions and rules inside each step, and export a skill ZIP with Markdown instructions and supporting assets.

## Start with projects

The app always opens on **Projects**, including after a reload. Create a project or open an existing one to see its skills. A project starts empty and can contain multiple independent skills.

Choose **Add skill**, then **Create a fresh skill** or **Import an existing skill**. A fresh skill starts with **Start with a prompt**: describe its goal, inputs, outputs, rules, tools and exceptions, generate a draft through your local Claude Code CLI, review it, and open the editor. **Start blank** provides manual authoring. Imports open a proposed-workflow review before they are added. Adding a skill preserves existing skills.

Prompt-generated drafts include the brief, workflow steps, inner facets, Markdown references, screen definitions and test scenarios. **Review prompt setup** exposes assumptions and open questions. Confirmed answers become shared definitions. Each generated step requires separate confirmation, and test scenarios start as **Not tested**. See the [prompt setup guide](docs/PROMPT_SETUP.md).

The editor opens in **Step by step**. Switch to **List** or the optional **Canvas** view to work with the same skill, steps, facets, references, and rules. The canvas currently represents a sequential process. Free graph connections and executable branching are not implemented.

Edit the selected step in the shared detail panel: **Contract**, **Inside**, **Example**, and **Source** for imported steps. Text changes save as you type. View changes preserve the selected step and expanded facets. Canvas cards show the main steps and their input/output contracts; inner functions and files stay inside the step. List provides a compact overview, and Step by step provides a navigation rail alongside the same editor.

Canvas offers an insertion point between every pair of steps. Use the order buttons, or Alt+Up/Down on a focused Canvas card or List step, to reorder. When insertion, deletion, or movement changes an existing step's predecessor, its **Input changed** check records the earlier contract and survives reload and backups. Review the affected instructions and confirm that the new input fits before export. Undo restores both the order and review state. **Show Markdown** previews the current draft through the actual package compiler.

Use the project breadcrumb or **Project skills** to return to the skill list, and **Projects** to return to the directory. The demo is an explicit **Explore the demo** option.

## Run locally

Requirements: Node.js 24.15 or later, Python 3.12 or later for source analysis, and a modern browser. No npm/pip package installation or API key is needed. The server uses Node's built-in SQLite module.

Prompt generation additionally requires the native Claude Code CLI **2.1.299 or later**, signed in as the operating-system user running the server. Run `claude auth login` in that user's terminal. Drafting uses the CLI's configured account and model; account limits and provider billing apply. Set `STUDIO_CLAUDE_PATH` when the native executable is not detected and `STUDIO_CLAUDE_MODEL` to select a specific supported model or alias. Manual authoring and import remain available without Claude Code.

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
- Edit step contracts and inner facets directly in Canvas, List, or Step-by-step views; insert and reorder steps with explicit inputs and outputs.
- Resolve a local rule override by using the shared value, updating the shared rule after reviewing its uses, or creating a separate rule.
- Define inner functions, decisions, tool contracts, exceptions, shared rules, and references.
- Specify input fields, output columns, presentation rules, and illustrative screen data.
- Import Markdown or a skill ZIP, retain complete original bytes, and review heading-based proposed steps.
- Draft English Markdown specifications from Python and HTML source without executing imported programs.
- Keep data and structural assets unchanged, with structural inventories for supported formats.
- Record acceptance scenarios and runtime observations.
- Resolve structural conflicts and export `SKILL.md`, Markdown references, and retained assets.
- Save and reopen an editable project backup.

**Explore the demo** opens an optional example project. Its skill intentionally contains one conflicting shared-rule override. Open **Review & export** to inspect it, then remove the override from **Read source data** to use the shared value.

## Saving and backups

Projects and skills autosave to the local SQLite database through the server. **Saved to local database** appears after the server acknowledges a committed write. **Saving**, **Changes not saved**, and **Save conflict** distinguish pending or failed writes. Text edits are grouped into saves; avoid closing while a save is pending.

**Back up project** downloads every skill in the selected project as a `.blueprint.json` file. **Back up projects** on the directory downloads the whole workspace. **Back up this skill** in Review & export keeps the individual `.agentic.json` format. Backups include the current working copy, so unsaved changes can be preserved after a connection failure or conflict.

**Restore project** accepts a project, workspace, or older single-skill backup and adds recovered projects without overwriting existing ones. **Restore a skill backup** adds an individual backup to the current project. When earlier browser data exists, **Review browser data** lets you inspect and copy it into the database. It is never imported automatically, and its original browser copy is retained. The old version may have saved an untouched demo; copying it is optional.

Concurrent browser sessions use revision checks. A stale session cannot overwrite newer saved data: back up its unsaved changes, then **Reload database** to use the current saved projects. Failed writes retain the working copy for retry or backup. A failed initial database load cannot overwrite saved projects with an empty workspace.

Git distributes application code and the empty database template. It does not sync working projects between computers. Use workspace backup/restore to move projects, or transfer the complete data folder while the server is stopped. The working database and journal files are ignored by Git. Read the [storage and migration guide](docs/STORAGE.md) for database location, snapshots, recovery, and transfer details.

## Independent review of imports

Imported skills require a current independent adversarial review before normal export. Download a review packet, have a separate reviewer inspect the original source and converted draft in a fresh context, and import their completed JSON report.

The report must cover all required topics, establish permission for the intended use, match the current SHA-256 snapshot, and have no unresolved critical, high, or medium findings. Edits to reviewed specifications invalidate the pass. Static indicators and resource approvals cannot replace this review.

See [the internal review rule](studio/INDEPENDENT_REVIEW_RULE.md). This prototype accepts externally completed reports; it does not invoke a model reviewer. Reviewer identity is declared rather than authenticated, and local project files are editable.

## Tests and build

```sh
npm test
python studio/analyze_sources_test.py
npm run build
```

On systems where the interpreter is named `python3`, use it for the Python test command. Tests use small, self-authored inputs. No imported skill distribution or external fixture is required.

`npm run examples` produces a generic example ZIP and editable project in `studio/dist/`. Example exports pass structural validation; they do not assert successful model execution.

## Current limits

This is an authoring prototype, not a workflow execution service. It does not provide model chat, live tool connections, authenticated review jobs, or a branching execution engine. Screen previews use illustrative values.

Imports propose steps from Markdown headings. Source analysis drafts behavior contracts; parsing coverage does not prove semantic equivalence. HTML layout, styling, interactions, dynamic library behavior, and embedded native or macro code can require manual specifications and review. Structural asset inventories do not infer domain meaning or recalculate workbooks.

Projects are stored in a local database. This release is a local single-workspace application; it does not provide accounts, cloud sync, collaborative merging, or shared storage between separate servers. Reload to see another browser's saved changes. Archive input is limited to 120 entries, 2 MB per file, and 8 MB total. Individual skill backups are limited to 32 MB, project backups to 64 MB, and workspace backups to 128 MB.

## Code and license

The application UI, workflow model, compiler, ZIP handling, analyzer, review gate, database and drafting adapters, server, and build tooling were authored for this project. There are no npm/pip application dependencies or vendored UI components. Node provides the SQLite engine; SQLite's deliverable code is public domain. Prompt generation invokes a separately installed Claude Code CLI, governed by Anthropic's terms; its executable code is not distributed here. The browser, Node.js, and Python provide the other platform APIs.

The application is licensed under [MIT](LICENSE). See [the provenance and runtime inventory](studio/THIRD_PARTY_APPLICATION.md). Runtime binaries are not distributed with this repository.

## Development and validation

Run `npm test` for the workflow, review, database, persistence, and HTTP tests. Run `npm run test:analyzer` for Python analyzer tests (`python3` may be required on some systems). Set `STUDIO_PYTHON` before running `npm test` when Python is not on PATH. `npm run db:template` regenerates only the empty database template; ordinary builds never touch the working database. See [contributing](CONTRIBUTING.md), [security](SECURITY.md), and the [changelog](CHANGELOG.md).
