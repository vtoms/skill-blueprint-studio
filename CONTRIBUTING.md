# Contributing

Use Node.js 24.15 or later and Python 3.12 or later. The application has no npm or pip package dependencies.

## Build and run

```sh
npm run build
npm start
```

Open `http://127.0.0.1:8766`. The supplied database template initializes an empty working database on first start. Use `STUDIO_DATA_DIR` for isolated development data; normal builds and template regeneration must never alter an existing working database.

## Validation

```sh
npm test
npm run test:analyzer
```

On systems that use `python3`, invoke `python3 -m unittest discover -s studio -p analyze_sources_test.py` and set `STUDIO_PYTHON=python3` for the Node server tests. On PowerShell, set `$env:STUDIO_PYTHON` to the desired executable. Test databases are created in isolated temporary directories; tests do not use the user's working database.

The Node suite covers workflow compilation, source preservation, independent review, workspace backups, input-change review, the database template, durability, stale-write rejection, persistence failures, HTTP origin checks, blueprint validation, tool-free drafting arguments, and cancellation. Drafting tests use synthetic model responses and never consume a Claude account's usage. Analyzer tests inspect source as data; they do not execute imported programs.

For schema changes, update the database version and provide a preserving migration. Regenerate the template with `npm run db:template` and verify that it contains only an empty workspace. Commit the template, its generator, tests, and storage documentation together.

Keep personal projects, working database files, original test archives, credentials, and generated user backups out of commits. The tracked SQLite template is the sole database file intended for distribution. Update the runtime/provenance inventory when adding a dependency or reusing external code. Contributions to this application's source are distributed under its MIT license.

Optimization changes must preserve the separate source version, baseline digest checks, complete step/facet ownership, resource and tool bindings, strict sequence-lock option, stale-source/revision checks, cancellation and reset evidence. Keep model output as an untrusted proposal. Test dynamic form text as well as the comparison for HTML execution. Fixtures must remain small, self-authored and generic.

For UI changes, preserve the seven-section journey and the distinct purposes of the three step views. Put optional explanations behind the shared text-only info layer; keep blocking issues, save failures, mandatory review and provider transmission visible. Preserve labelled inputs, described hints, keyboard-operable tabs, focus return, mobile width and alternatives to drag/pan gestures. Test actual application interactions in an isolated database when changing these behaviors.

Diagram coordinates are presentation metadata: changing arrangement must not change instruction revision, predecessor identity, review evidence or test freshness. Run-order changes use the shared input-review logic. New optimization identities must not reuse baseline coordinates. Check restoration, insertion/deletion, cancellation and source/review integrity. See [UX decisions](docs/UX.md). Do not copy external assessment/prototype assets into the public application without provenance and license review.
