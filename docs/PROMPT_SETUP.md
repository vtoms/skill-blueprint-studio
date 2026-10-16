# Start a fresh skill with a prompt

## Setup

Prompt drafting uses a separately installed native Claude Code CLI version 2.1.299 or later. Sign in with `claude auth login` as the same operating-system user running the Studio server. The application uses that CLI's configured account and its effective default model, unless `STUDIO_CLAUDE_MODEL` selects a model or alias. Provider usage limits and account billing apply.

An explicit `STUDIO_CLAUDE_PATH` takes priority. On Windows, Studio checks the native executable under the current user profile, PATH directories, and the native binary in the npm installation under `node_modules/@anthropic-ai/claude-code/bin/claude.exe`, including the usual application-data npm directory. It executes the binary directly rather than a `claude.cmd` shell shim. On Mac/Linux, Studio checks PATH and the native user installation at `~/.local/bin/claude`. See [Anthropic’s installation guidance](https://support.claude.com/en/articles/14554922-claude-code-user-faq) for PATH setup. No shell is used to construct a command from the user prompt.

There is no npm package dependency for this integration and no API key stored in the application. Claude Code's source and executable are not included in the repository. Its use is governed by [Anthropic's terms](https://github.com/anthropics/claude-code/blob/main/LICENSE.md), independently of this application's MIT license.

## Authoring journey

1. Open a project and choose **Add skill → Create a fresh skill**.
2. **Start with a prompt** is selected. Describe the goal, required inputs, expected output, important rules, tool needs, references, exceptions and useful test cases. An optional title overrides the proposed title.
3. Choose **Generate draft**. The local server asks Claude for a structured blueprint. Generation can take a few minutes. Cancel stops the request; it does not create a skill.
4. Review the brief, step input/output contracts, inside-item counts, assumptions, open questions and proposed scenarios. Nothing is added until **Add draft & open editor**. **Change description** retains the request so you can improve it first.
5. In the editor, use **Review draft decisions** to answer open questions and confirm that assumptions have been reviewed and needed corrections applied. Confirmed answers are included as shared values in the exported Markdown.
6. Review each proposed step. Confirm steps individually or use **Steps → Review unconfirmed steps** to read and confirm selected steps together. Edit its contract, inside items, examples, references and resources using Step by step, List or Canvas. All views edit the same saved skill.
7. Inspect the **Test scenarios** and adjust expected results. Export the ZIP when required checks pass, run it in Claude, and record actual observations against the appropriate revision.

**Start blank** remains available for manual authoring, including when Claude Code is unavailable. Direct standalone-file use offers a memory-only preview and cannot call the drafting engine.

## What a draft contains

The model proposes the skill brief and global instructions, an ordered sequence of macro steps, inner instruction/rule/tool/decision/exception facets, shared values, Markdown instruction references, input fields, output columns, presentation rules, examples and test scenarios.

The original prompt, model provenance, assumptions and questions are retained in authoring metadata. Backups preserve them. The raw prompt is not automatically pasted into the exported skill. Confirmed question answers become shared values so they can inform runtime instructions. If a linked answer definition is removed or changed, setup review becomes necessary again before export.

No existing files are read by the drafting model. Attach actual reference and data files through the editor afterward, or describe their required structure in the prompt. A generated Markdown reference is a proposed instruction document, not proof that an external source was supplied. Unknown connection names and missing requirements should remain questions for review.

## Review and testing limits

Generation is an authoring operation, not a test run. Every proposed step starts unconfirmed. Scenarios have expected results but start as **Not run yet**, with no observed outputs. The application does not execute the exported workflow, access its business tools, or authenticate MCP connections during drafting.

Normal structural checks and the Markdown-only code policy apply. The drafting adapter rejects embedded Python/HTML, unsafe paths, malformed or oversized blueprints, undefined shared references and fabricated result/approval fields. A schema-valid response still needs functional review and runtime testing.

The imported-skill adversarial-review policy remains in effect for imported sources and is not fulfilled by prompt generation. Human confirmation of a fresh draft is a separate operation.

## Failure recovery

An unavailable or signed-out CLI appears in the setup screen. Install or sign in through your terminal, then reopen the fresh-skill prompt screen. Update unsupported CLI versions before drafting.

Only one draft runs at a time per server, with a five-minute timeout and bounded input/output. A failed generation retains the prompt and creates no skill. Retry after checking the account's availability, model configuration, and usage limits. Rejected output can be corrected by refining the prompt. Previously saved skills and the database are preserved.

The application requests tool-free, restricted Claude execution with user customizations disabled and an isolated working directory. Organization-managed policy still applies. The prompt is sent to Claude when you generate; treat it as information shared with the configured provider.

A kept draft opens on **Brief**, where **Review draft decisions** holds assumptions and questions. Use **Steps** to confirm the proposed behavior, then **Review & package** before **Test in Claude**. Display labels such as **Not run yet** do not change stored test-status enum values.
