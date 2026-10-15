# Local security model

Skill Blueprint Studio is a local application. The server binds to `127.0.0.1`; it is not an authenticated multi-user or internet service. All browser sessions connected to that server share its workspace. Other local processes with filesystem or server access may access the data.

Database writes require JSON, a local host, and an allowed browser origin when supplied. Cross-site requests are rejected. Revision checks reject stale saves. These checks protect local browser workflows; they do not provide user authentication or authorization.

The working database belongs outside the static web root. Database files are excluded from static serving and from Git. Original assets and review records can contain sensitive data, so protect the data folder and downloaded backups with the operating system's access controls. Publishing application source does not publish working project data.

Imported skill files are untrusted input. Source analysis parses Python, HTML, and structural assets as data; it does not execute imported programs. Normal export retains structural checks and the separate adversarial-review requirement. Reviewer identities in this local application are declared rather than authenticated.

Prompt drafting sends the submitted prompt and optional title to the separately installed Claude Code CLI. The application requests restricted mode, disabled built-in tools and MCP tools, disabled user customizations/hooks/skills, an isolated working directory, bounded output, a timeout, and no CLI session persistence. Managed organization policy still applies. The application does not request a permission bypass, provision credentials, or execute the generated skill. Claude Code authentication and provider-side handling remain subject to its configuration and service terms.

Model output is validated against a bounded blueprint schema, with fresh application identities and no model-supplied approvals, test results, or independent-review passes. Executable Python/HTML instructions and unsafe resource paths are rejected. The original prompt and draft provenance are saved only after the user adds the draft; they can contain private information and are included in project backups.

Do not expose this server externally without adding authentication, authorization, transport security, request controls, and an appropriate shared-data architecture. Separate machines use separate local databases unless data is explicitly transferred.

Report a suspected issue without including credentials, private skills, or database contents. Public reproduction steps should use generic synthetic data.

AI optimization additionally sends skill instructions, textual source files, specifications and explicit goals through Claude Code. Binary bytes stay local and are represented by a manifest and existing structural guides. The application uses the same restricted execution controls as drafting. Optimization output is a proposal, not independent review or runtime evidence. Every source step and facet is accounted for, while file bytes and tool configuration are copied by application code. Dynamic model-controlled labels and comparison text are escaped.

Derived versions store a frozen source baseline and proposal in SQLite and backups. Baseline checksums are verified at database, restore, proposal, review and UI export boundaries. SHA-256 markers detect mismatches but do not authenticate locally editable records. Imported provenance in the baseline cannot be removed by clearing only top-level import flags. Source digests and SQLite revision checks prevent stale-source acceptance and stale whole-workspace overwrite. See [optimization](docs/OPTIMIZATION.md) for scope and data handling.
