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

## Diagram arrangement

An optional skill `diagram` object stores layout schema version 1 and step positions by stable step identity. Coordinates are finite, bounded, and validated on backup/database parsing. Inserting a step allocates a free position; deleting it removes its position. Older skills without layout metadata use automatic arrangement without a database migration.

Layout changes save through the same SQLite revision/conflict controls and appear in project/workspace backups. They do not increment the skill's instruction revision, alter run order, invalidate independent review evidence, or make recorded results stale. A new AI-improved version gets fresh step identities and automatic layout; its frozen baseline retains the source arrangement. Viewport pan and zoom are temporary presentation state. The database schema and empty template remain unchanged.

## Workspace appearance

The optional workspace-level `appearance` value accepts `light` or `dark`. An absent preference follows the device color-scheme setting. An explicit choice is saved through the same SQLite transactions, acknowledged saves and conflict protection as other workspace changes. Other browsers use it after reload; it is not live-synchronized. Separate servers keep independent settings. The workspace/database schema version remains 1 and older workspaces remain valid. The empty database template is unchanged.

Appearance is outside every skill, so toggling it does not change skill revision, generated instructions, independent review evidence, or test freshness. Workspace backups and database snapshots include the preference; restoring projects adds their content while retaining the current workspace's appearance. Project and individual-skill backups do not carry UI preferences. Standalone-file preview holds the choice in memory only. No new browser storage is used.


## Authored origin and detached sources (0.10.0)

An optional skill JSON field, `sourceOrigin`, distinguishes newly authored and imported skills. Existing backups remain readable without backfilling or rewriting historical review snapshots. Unknown legacy source provenance keeps its conservative independent-review gate. This is document metadata; the SQLite schema and empty template are unchanged.

Removing an active supporting file preserves its original bytes in the project, backup and original-source download. Affected step bindings are cleared and need confirmation again. Other dependency declarations remain visible for correction. Restoring a file creates a fresh unreviewed description; original bytes are not duplicated. This is not a permanent source-deletion control.

Autosave serializes the current working copy when the debounce expires or a caller flushes, not on each keystroke. Each outgoing request has a fixed serialized snapshot. Changes during a request remain pending for a later acknowledgement; failed/stale writes preserve recovery and explicit retry/reload behavior.

## Imported Markdown provenance (0.10.1)

Standalone Markdown imports retain exact UTF-8 source bytes in `originals` (including BOM and CRLF). An optional reference `sourcePath` points to its immutable original; an original's optional `referencePath` remembers the import destination for restoration. Editing or renaming the current document keeps the source association. Importing a removed filename again retains both source versions using a unique history path. Invalid selections are rejected before mutation.

Active imported references require independent review. Removing one retains the original for recovery; an unused original alone does not gate a known authored skill. An improved version's frozen external baseline still requires review. Restoring uses the original content and import path, and never replaces an occupied active path. The SQLite schema, empty template and schema version are unchanged. Optional metadata is validated without changing old review snapshots. Older standalone imports that never retained bytes cannot be reconstructed retrospectively; re-import their original files to establish provenance.
