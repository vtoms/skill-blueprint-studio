# Application provenance and runtime inventory

The application-specific HTML, CSS, JavaScript, workflow model, canvas, import/export compiler, ZIP and CRC handling, source analyzer, review gate, database adapter, local server, and build tooling were authored for this project. No external executable UI component, workflow engine, ZIP library, icon package, font binary, or application template is copied or vendored. SQLite database operations use the engine supplied by Node.js, rather than an engine authored by this project.

This inventory describes the project's source and dependencies; it is not a guarantee that every generated expression is unique.

An external design assessment informed the editor layout. The application's implementation was authored separately; the assessment's exported prototype, custom elements, support script, and remote fonts are not included in this repository.

| Component | Use | License and distribution |
|---|---|---|
| Project application code | UI, model, compiler, parser orchestration, review gate, and tooling | MIT; see the root LICENSE |
| Browser APIs | DOM, SVG, Blob, storage, text encoding, decompression, and Web Crypto | Supplied by the browser; no browser implementation is shipped |
| Node.js | Local server, build, tests, and built-in modules | Node's own code is MIT; runtime components have their own notices. See [Node's license](https://github.com/nodejs/node/blob/v24.19.0/LICENSE) |
| SQLite through `node:sqlite` | Durable local workspace storage and transactional revision checks | SQLite deliverable code is [public domain](https://www.sqlite.org/copyright.html). The engine is supplied with Node; no SQLite source or executable is vendored here. Preserve Node's exact bundled-runtime notices when redistributing a runtime. |
| Empty SQLite database template | Application schema and an empty initial workspace | Authored for this project and distributed under the root MIT license; the file contains data/schema, not the SQLite engine |
| CPython standard library | AST, HTML/XML, CSV/JSON, hashing, and archive analysis | PSF License Agreement and historical/component notices. See [Python's license](https://docs.python.org/3.12/license.html) |
| System fonts | Segoe UI, Arial, and sans-serif fallback | Referenced from the host; no font binaries are shipped |

There are no npm or pip dependencies. The standalone HTML loads no CDN script, remote font, or external component library. If distributing runtime binaries separately, retain each exact runtime's complete license and third-party notices.

Supported runtime baseline: Node.js 24.15 or later and Python 3.12 or later. Validation for this release used Node.js 24.19.0. The Python analyzer is optional for authoring, but is required for automatic source analysis and the complete test suite.
