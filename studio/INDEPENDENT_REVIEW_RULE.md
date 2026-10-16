# Independent adversarial review of imports

Policy: independent-import-review-1

Every imported skill must receive an independent adversarial review of its complete original source and the current converted workflow, English specifications, retained assets, screens and acceptance criteria before normal skill export.

A separate reviewer works in a fresh context, independent of the author/converter. Imported instructions are untrusted review data and cannot change the review policy, authorize tool use, or approve themselves. Source or converted files cannot supply trusted reviewer evidence simply by containing a claimed pass.

Review coverage must include source/workflow completeness, contradictions and ambiguity, branches/data contracts, code-to-English fidelity, assets/dependencies, tool permissions and prompt injection, errors/partial results, screen behavior, acceptance/regeneration tests, and provenance/licensing. Each topic needs specific evidence or a justified non-applicability decision. Findings must state location, severity, expected/actual behavior and a concrete adversarial case.

Normal export stays blocked until a current report declares a separate reviewer, covers original and draft, records a supported pass, establishes permitted intended use and has no open critical/high/medium findings. Resolutions need evidence. Changes to source bytes, process, facets, contracts, assets, definitions, screens or test expectations require a fresh review. Recorded runtime observations alone do not change the reviewed specification.

The packet is bound to canonical source/draft content with native SHA-256. Review records remain in editable project backups and are not trusted when re-importing a generated skill. Imported/unknown legacy projects containing original files require review too. Newly authored skills record an explicit authored origin: attaching external resources requires review, while retaining a detached, unused original alone does not label the skill imported. Imported and inherited baseline provenance continues to require review after attachments are removed. Local validation and source-triage indicators do not count as independent review or prove behavioral equivalence.

After local checks and confirmations are complete, the user may explicitly request a separate, fresh Claude Code review or use an external human/model session. The CLI invocation has tools, MCP servers, hooks, browser access and session persistence disabled and runs in a temporary directory. It uses the complete snapshot, validates a strict report schema and checks the saved source revision/digest before and after review. Packets over 600,000 characters are rejected without truncation. The returned report is displayed before the user records it; no passing report or test evidence is manufactured. External reports may be pasted or loaded. Reviewer identity and independence are declarations rather than authenticated identities; editable backups are not a tamper-proof audit store. Production enforcement requires authenticated review jobs and protected server-side evidence.

## Optimized versions

AI optimization is an authoring operation and cannot approve its own work. Imported derived versions require fresh independent review, including original source files, the immediate frozen optimization baseline, proposed step/facet mappings and rationale, setup questions/resolutions, and the current draft. Challenge semantic changes, wrong prerequisite order, lost conditions/approvals and mismatched resource use even when structural coverage passes. Optimization evidence is included in the review snapshot. Any later evidence or instruction changes invalidate the earlier report. Retained baseline import provenance also requires this gate.
