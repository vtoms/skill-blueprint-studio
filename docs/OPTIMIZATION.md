# AI optimization and derived versions

## Use the feature

After importing a skill, choose **Add & optimize a copy**. This saves the imported source and opens the optimization options before you review its individual steps. You can also choose **Create optimized version** from any skill's workflow editor.

1. Optionally describe what should improve, such as clearer handoffs or less duplication.
2. Leave **Allow AI to reorder, combine or split steps when needed** enabled to propose a new sequence. Disable it to preserve the exact step count and order while clarifying instructions.
3. Choose **Generate optimized version**. The local Claude Code CLI produces a proposal using its signed-in account and configured model.
4. Inspect the before/after comparison, source step numbers, proposed input/output contracts, facet instructions, rationale, handoff explanations, assumptions and open questions. **Adjust optimization** returns to your options without changing the source.
5. Choose **Keep version & open editor** to add a separate skill to the same project. **Cancel** discards the pending proposal.
6. Use **Resolve optimization setup** to answer questions and review assumptions. Answers become shared definitions in the exported instructions. Apply any necessary corrections and confirm each proposed step separately.
7. Review retained resource specifications and import notes. Imported versions require a fresh independent adversarial review. Run actual scenarios in Claude and record the observed results separately.

The optimized draft is clearly labelled in the skill directory. The source remains a separate editable skill. The new version additionally keeps a frozen baseline from the moment optimization began, so editing the source later does not change the historical comparison. **Compare optimization** reopens the proposal as generated; subsequent editor changes are not silently substituted into that view. **Download baseline snapshot** creates a restorable single-skill backup of the baseline. **Open source skill** opens the current source entry when it is available.

## Scope and preservation

The model can propose overall working instructions and the titles, kinds, jobs, outputs and examples of workflow steps. It can rewrite existing facet names and instructions, or add ordinary Instruction facets. With resequencing enabled it can combine or split steps as well as reorder them. Conditional task routes remain decisions inside steps; this feature does not create a branching execution engine.

The application, rather than the model, copies these values from the source:

- Skill description, purpose, overall input, final outcome, export name and additional metadata.
- Shared definitions and their bindings; facet types, local overrides, tool connections and tool operations.
- Markdown reference files and resource specifications, including unresolved translation gaps.
- Complete original source bytes, retained assets and applicable license metadata.
- Input/output screens, presentation rules, example screen data, acceptance scenarios and expected results.

Each original step must be mapped to at least one proposed step. Every original facet must occur exactly once, within a step mapped to its original owner. Each proposed step receives the union of its mapped source steps' reference and resource bindings. Unknown identities, omissions, duplicate facets and invalid ownership reject the whole proposal. With resequencing disabled, step count, index and ownership must match exactly. These checks establish structural coverage, not semantic equivalence or correct resource execution order.

No review pass or successful test result transfers to a derived version. Steps, resources and import notes require confirmation again; scenarios start **Not tested**, without prior observations. Original prompt setup questions remain available and gated. Existing input-change questions and unresolved earlier optimization decisions carry forward into setup review. The optimizer cannot silently resolve them.

Reference text and resource specifications are preserved unchanged in this release. Improve those through their existing editors when needed. AI optimization does not execute the workflow, call its tools, test generated implementations or establish equivalent behavior. A shorter workflow is not automatically a better workflow.

## Provider and data handling

The optional runtime requirements are the same as [prompt setup](PROMPT_SETUP.md): native Claude Code 2.1.299 or later, signed in as the operating-system user running the local server. `STUDIO_CLAUDE_PATH` and `STUDIO_CLAUDE_MODEL` configure the executable and model. Provider usage and account limits apply.

Generation sends the goals, editable skill instructions, textual original files, specifications and source mappings through Claude Code. Binary asset bytes are not supplied to the model; it receives their manifest and the existing structural guides. It cannot establish the meaning or correctness of omitted binary contents. The complete binary assets remain in local version storage unchanged.

The CLI runs in an isolated temporary directory, with restricted mode, built-in and MCP tools disabled, hooks/user customizations disabled, no application-requested permission bypass and no session persistence. Managed organization policy still applies. Imported source is explicitly untrusted data in the system instructions. Tool restrictions prevent application-requested execution; they do not prove resistance to semantic prompt injection. Generated questions and comparison text are escaped before browser rendering.

Requests have a five-minute timeout and share the drafting service's one-request-at-a-time limit. Goals are limited to 4,000 characters; complete textual context is limited to 600,000 characters, proposals to 600,000 characters and workflows to 100 steps. Oversized or incomplete proposals fail without silently truncating content. Existing skill/project/workspace backup limits still apply; snapshots increase storage size. Resolve accumulated open decisions before repeatedly optimizing a large skill.

## Storage and review evidence

Before generation the browser flushes pending edits. The server loads the source from SQLite using project/skill identities and checks a SHA-256 digest. It checks the source again after generation and before acceptance. If it changed, the proposal cannot be added against that old source. SQLite workspace revision checks also prevent a write between acceptance checks and persistence from overwriting another browser's changes. A failed acceptance save preserves the new working draft in the tab with the ordinary conflict/backup recovery controls.

Derived versions retain the source identity, revision and digest, a baseline digest, model/time, goals, mapping, questions and frozen proposal. Baselines exclude prior optimization history and independent reviewer records to avoid recursively nesting history. Current versions retain their original source files; source entries in the project are never modified by generation.

Shape validation rejects invalid or nested optimization records on backup parsing. Native SHA-256 verification additionally checks baseline integrity on database API reads/writes, browser load and restore, optimization requests, proposal acceptance, review-packet creation, report recording and UI export. Imported provenance in the baseline continues to require independent review even if a restored record has inconsistent top-level flags.

Independent review evidence includes the original source, immediate baseline, proposal, mapping, setup resolutions and current working draft. A changed record invalidates its earlier review. Hashes detect mismatches; they are not authenticated signatures. Local database files and backups remain editable, and reviewer identity is declared rather than authenticated.
