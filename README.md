# Agentic Studio

A local visual authoring prototype for building reviewable Claude skills. Define a process as meaningful input-to-output steps, manage the functions and rules inside each step, and export a skill ZIP with Markdown instructions and supporting assets.

## Run locally

Requirements: Node.js 24 or later, Python 3.12 or later, and a modern browser. No package installation or API key is needed.

```sh
npm run build
npm start
```

Open http://127.0.0.1:8766. The server listens on loopback only. Set `STUDIO_PORT` to choose another port. Set `STUDIO_PYTHON` to a Python executable path if needed; otherwise the server uses `python` on Windows and `python3` elsewhere.

You can also open `studio/dist/agentic-studio.html` directly for authoring. Automated source analysis requires the local server.

## What you can do

- Work in flow, list, or guided views; add and reorder steps with explicit inputs and outputs.
- Define inner functions, decisions, tool contracts, exceptions, shared rules, and references.
- Specify input fields, output columns, presentation rules, and illustrative screen data.
- Import Markdown or a skill ZIP, retain complete original bytes, and review heading-based proposed steps.
- Draft English Markdown specifications from Python and HTML source without executing imported programs.
- Keep data and structural assets unchanged, with structural inventories for supported formats.
- Record acceptance scenarios and runtime observations.
- Resolve structural conflicts and export `SKILL.md`, Markdown references, and retained assets.
- Save and reopen an editable project backup.

The included generic demo intentionally contains one conflicting shared-rule override. Open **Review & export** to inspect it, then remove the override from **Read source data** to use the shared value.

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

Projects are saved in browser storage; download backups to keep a portable copy. Archive input is limited to 120 entries, 2 MB per file, and 8 MB total. Project backups are limited to 32 MB.

## Code and license

The application UI, workflow model, compiler, ZIP handling, analyzer, review gate, server, and build tooling were authored for this project. There are no installed third-party application dependencies or vendored UI components. The browser, Node.js, and Python provide platform APIs.

The application is licensed under [MIT](LICENSE). See [the provenance and runtime inventory](studio/THIRD_PARTY_APPLICATION.md). Runtime binaries are not distributed with this repository.
