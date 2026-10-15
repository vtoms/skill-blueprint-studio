# Storage, migration, and backups

## Authoritative storage

The local Node server owns one SQLite workspace. Browsers load it through `GET /api/workspace` and submit changes through `PUT /api/workspace`. Browser `localStorage` is read only to discover data from earlier releases. New application work is never written there.

| Location | Purpose | Included in Git |
|---|---|---|
| `studio/seed/workspace.sqlite` | Ready-to-use empty database template, schema version 1 | Yes |
| `.local-data/workspace.sqlite` | Authoritative working projects, skills, original assets, review records, and migration markers | No |
| `.local-data/workspace.sqlite-wal` / `-shm` | SQLite transaction and coordination files, when present | No |
| Downloaded JSON backups | Portable working-copy backups created by the user | Not part of the application repository |

The default data path is relative to the application repository, not the terminal's current directory. `STUDIO_DATA_DIR` overrides it and is resolved to an absolute path at server startup. The server prints the actual database location. Keep this folder outside the static `studio/` tree and on a local writable filesystem.

On first start, the server copies the supplied template only if the working database does not exist. The template has an empty workspace and no historical examples or user data. Builds update application files; they do not reset the database. A new clone on another computer starts with its own empty database.

## Schema and durability

Database `PRAGMA user_version` is 1. `workspace_state` contains the current validated workspace as JSON, a monotonic database revision, and a save timestamp. `workspace_history` retains the previous five committed states. Projects contain independent skills; each skill retains its steps, facets, references, original asset bytes, screens, scenarios, and review evidence.

The database uses SQLite transactions, WAL journaling, full synchronization, and a busy timeout. History insertion and the current-state update happen in one transaction. Invalid payloads are rejected before writing. Content is capped by the workspace's 128 MB validation limit. This release stores a whole workspace document; it does not yet normalize every skill or resource into separate SQL tables.

The browser groups nearby edits into a save request. The UI says **Saved to local database** only after the server confirms the commit. While pending, it says **Saving**. A database or connection error retains the working copy and offers retry and backup. A failed initial load never writes an empty replacement.

## More than one browser

Every browser using the same server and data directory reads the same workspace. Each save includes the revision that browser loaded. If another browser has already committed changes, the server returns HTTP 409 and preserves the newer database state. The stale browser keeps its unsaved changes in memory.

Use **Back up unsaved projects** before **Reload database**. Reload requires confirmation when unsaved changes exist. Restore a backup afterward to recover work as additional projects. Reload a browser to see changes saved elsewhere. There is no live collaborative merge or per-user workspace in this release.

## Earlier browser data

The app checks the earlier workspace and single-skill storage keys without modifying them. **Review browser data** lists the projects and skills before copying them into the database. A legacy single skill appears within a recovery project. The earlier application may have saved its bundled demo automatically; review whether you want to keep it.

Copying preserves existing database projects and leaves the browser originals intact. A SHA-256 marker of the original browser data is committed alongside the copied projects, so the same data is not offered again after a successful migration. If old browser data is unreadable, download its original contents for recovery; it cannot replace the database.

## Backups and transfer

The recommended portable backup is **Back up projects** from the Projects directory. It includes all projects and their skills, including preserved original assets. Project and individual skill backups are also available. Backups reflect the working copy, which can include unsaved edits after a failure; check the save indicator when a committed-state backup is required.

On another computer, start the server and use **Restore project** with the workspace JSON. Restore adds projects instead of overwriting existing ones.

For a physical database transfer, stop the server first and copy the complete data folder. SQLite may have recent committed changes in its WAL file, so copying only a live `.sqlite` file is insufficient. Keep the destination server stopped while replacing its data folder. Preserve its previous folder if it contains work you need.

Git synchronizes source code and the empty template. It deliberately excludes personal working databases. Separate computers or separate data directories do not automatically share projects.

## Recovery and maintenance

Keep downloaded backups outside the repository. If a save fails, retry or download the working copy before closing the tab. If the database cannot be read at startup, it is preserved and startup fails rather than creating an empty replacement. Keep that folder for investigation; start with a different `STUDIO_DATA_DIR` and restore a known-good JSON backup to recover service.

The last five previous states can be inspected in `workspace_history` with SQLite tooling while the server is stopped. This is a limited recovery aid, not a replacement for independent backups. There is no UI for browsing those snapshots yet.

`npm run db:template` rebuilds only `studio/seed/workspace.sqlite`. It does not touch `.local-data`. The template's schema and initial data are MIT-licensed application content; SQLite's engine is provided by Node.js and is public domain.

## Optimization versions

Each kept optimization is a separate skill in its project, with a frozen baseline and proposal. Working databases and project/workspace backups contain these records and retained source assets; Git contains no working versions. Baselines exclude prior optimization/reviewer history to avoid recursive growth, but complete original source bytes remain preserved. SHA-256 checks validate baseline integrity on database API reads/writes and browser restore. Snapshots increase backup size; existing size limits still apply. See [AI optimization](OPTIMIZATION.md).
