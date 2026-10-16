# Hardening, limits and reproducible checks

This release addresses archive integrity, consistent local API protection, bounded source analysis, maintainability and reproducible tests. It remains a local authoring application. These changes do not establish semantic equivalence of generated implementations, authenticate reviewer identities, or create an internet-ready multi-user service.

## Integrity and request boundaries

ZIP filename maps have no object prototype, so names such as `__proto__`, `constructor` and `toString` remain ordinary data. Tests exercise ZIP → import → compiler → ZIP and actual UI source downloads. Complete preserved source bytes remain separate from edited instructions. Malformed archives fail as a whole rather than partly importing a skill.

The reader validates central-directory bounds/counts, file headers, names, duplicate entries, disk references, compression/encryption support, data overlaps and integrity checks. ZIP32 data descriptors with and without their optional signature must match the central checksum and sizes; their bytes count toward the entry's overlap bounds. Streaming local fields must be zero or match the central record. Extra-field records must fit their declared bounds; ZIP64 metadata is explicitly unsupported. The record formats follow [PKWARE's ZIP specification](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT), sections 4.3.9 and 4.5.3; no specification text or external parser implementation is distributed here.

Explicit and implicit file/folder conflicts are rejected in any entry order. Empty directory entries are verified, including deflated entries, then omitted from the source-file map. Declared and actual expanded sizes remain bounded. Literal Unicode spellings and percent filenames are preserved rather than silently normalized. Markdown URL links are decoded once; root escape, encoded absolute/drive paths, backslashes, control characters and malformed Unicode values are rejected. Generated and relocated path segments encode reserved characters such as `#`, `?`, `%` and parentheses without changing source names or link anchors. No import extracts files into the server's filesystem.

Targeted regressions cover descriptor forms and corruption, directory conflicts and checksums, extra-field bounds, every truncation of a synthetic archive, 256 reproducible byte mutations, double encoding, Unicode variants and package-link round trips. A browser journey verifies that a malformed import creates no skill and a valid retry preserves the exact reference names and bytes. These bounded checks are not an exhaustive fuzzing or security proof.

Every API uses the same Host, Origin and cross-site policy. Requests require the exact local server host; an Origin, when present, must match one of its allowed loopback origins. Non-browser local processes can make requests and are not authenticated. JSON type/parse checks and byte limits apply before service work. Static paths must remain inside the static root after real-path resolution.

## Source analysis limits

| Boundary | Limit |
|---|---|
| Concurrent analysis requests | 1, reserved before reading the body; another receives HTTP 429 |
| Analysis JSON body | 12 MiB of incoming bytes |
| Source files per analysis | 120 unique safe paths with canonical base64 |
| Decoded source input | 8 MiB total; 8 MiB per file |
| Python worker | 30 seconds; 16 MiB output buffer |
| HTTP upload / header deadline | 30 seconds / 10 seconds |
| Nested workbook archive | 500 entries, unique names, 32 MiB total declared expanded size |
| XML part | 4 MiB, bounded streaming read and parse |
| XML structure | 100,000 elements; depth 128; declarations/entities rejected |
| Ordinary skill ZIP import | 120 entries, 2 MiB per file, 8 MiB expanded total and archive size |

Analysis reserves capacity while reading an upload as well as while Python runs. Failures and cancellation release it. The HTTP response closing before completion aborts the worker request. Empty analysis requests return immediately without starting Python. Bad source, excessive structure and unsupported content produce errors for review; original assets are retained. A file that cannot be analyzed needs a manual specification rather than a fabricated successful conversion.

These limits reduce resource exhaustion but are not a portable OS-level CPU/memory sandbox. Large inputs can still consume resources within the caps. There is no per-user rate limiter or authentication in this shared local workspace. Keep the service on loopback; hosted or multi-user deployment requires a separate security design.

## Module ownership

| Module | Responsibility |
|---|---|
| `studio/core.mjs` | Stable compatibility exports |
| `skill-model.mjs` | Skill primitives, identities and source-byte preservation |
| `paths.mjs` | Literal path validation and Markdown link resolution/relocation |
| `skill-validation.mjs` | Structural/package readiness and dependency checks |
| `skill-compiler.mjs` | Markdown/package generation |
| `skill-import.mjs` | Frontmatter, source parsing and workflow reconstruction |
| `reference-import.mjs` | Atomic standalone Markdown import and preserved source associations |
| `attachments.mjs` | Detach/restore, original-source identity, metadata and shared recovery actions |
| `skill-reader.mjs` | Backup/model parsing and metadata validation |
| `http-request.mjs` | Shared local-request, JSON and HTTP error handling |
| `source-analysis.mjs` | Analysis validation, capacity reservation and worker invocation |
| `resource-view.mjs`, `screen-view.mjs` | Pure markup for supporting files and screen editing/preview |
| `app.mjs` | UI state and action coordination; further extraction can remain incremental |

Existing import sites keep using the core exports, and persisted workspace/skill/database schemas are unchanged. Review gates, version evidence, source digests and revision-conflict handling retain their existing boundaries. The standalone build includes the extracted authored modules and still needs no application package installation.

## Running the checks

```sh
npm ci --ignore-scripts
npx playwright install chromium
npm run test:all
```

On Linux, install browser libraries with `npx playwright install --with-deps chromium`. Set `STUDIO_PYTHON` if needed. Tests use temporary SQLite databases and self-authored generic inputs. Real drafting/optimization is disabled or replaced with synthetic responses; no Claude account is used. Runtime tests never use the working `.local-data` database. Screenshots go to ignored `test-results/browser/`.

GitHub Actions runs Node/Python checks on Windows and Linux, and browser journeys on Linux. The committed standalone output and empty SQLite template are checked for unintended changes. The browser suite verifies navigation, prompt/import, source integrity and review blocking, editing, diagrams, exports, help, themes, optimization lifecycle and storage conflicts. CI failure screenshots contain only synthetic test workspaces and expire after seven days.

Playwright 1.64.1 and its transitive `playwright-core` are locked Apache-2.0 development dependencies. Their code and downloaded browsers are not bundled into the app. See [the dependency inventory](../studio/THIRD_PARTY_APPLICATION.md) and [Playwright's CI instructions](https://playwright.dev/docs/ci-intro).
