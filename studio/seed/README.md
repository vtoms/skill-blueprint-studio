# Database template

`workspace.sqlite` is a ready-to-use SQLite database with schema version 1 and an empty workspace at revision 0. It contains no projects, skills, personal information, sample assets, or user data.

On first server start, the application copies this file to `.local-data/workspace.sqlite`. Existing working databases are preserved. `STUDIO_DATA_DIR` selects another writable folder. Git ignores working databases and their journal files.

The template contains the application's MIT-licensed schema and initial data. It contains no SQLite executable code. SQLite's engine is provided by Node.js, and SQLite's deliverable code is public domain.

Regenerate the template with `npm run db:template`. This command writes only the template folder; it does not modify the working database.
