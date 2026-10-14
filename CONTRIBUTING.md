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

The Node suite covers workflow compilation, source preservation, independent review, workspace backups, input-change review, the database template, durability, stale-write rejection, persistence failures, and HTTP origin checks. Analyzer tests inspect source as data; they do not execute imported programs.

For schema changes, update the database version and provide a preserving migration. Regenerate the template with `npm run db:template` and verify that it contains only an empty workspace. Commit the template, its generator, tests, and storage documentation together.

Keep personal projects, working database files, original test archives, credentials, and generated user backups out of commits. The tracked SQLite template is the sole database file intended for distribution. Update the runtime/provenance inventory when adding a dependency or reusing external code. Contributions to this application's source are distributed under its MIT license.
