# Consultant review and platform integration

## Completing review on your own

Imported skills and authored skills that use external supporting files need independent review before package download. Finish the visible local checks first: step confirmations change the snapshot. Then **Review & package → Run fresh AI review** opens a separate Claude Code review session. It sends the complete source/instruction packet through your signed-in CLI account, with tools disabled. Inspect the report before recording it. A finding or uncertain licensing can keep download blocked; correct the skill and obtain fresh evidence.

A second person is optional. To use another reviewer, expand **Use another reviewer or load an existing report**, download the packet, copy its instructions and attach the packet to a fresh AI chat that did not author the skill, or send it to an independent colleague. Paste the completed JSON report or load its file. Report identities remain declarations, as described in the [review rule](../studio/INDEPENDENT_REVIEW_RULE.md). A packet above the guided AI size limit must use this route; sources are never silently omitted.

Step confirmation and independent review are different actions. **Steps → Review unconfirmed steps** displays pending contracts, inside items, examples, source mappings and file names together. Uncheck anything you have not read, then explicitly confirm that you read the selected steps. A single confirmation updates the selected steps and can be undone. Missing step names, inputs, instructions or outputs prevent confirmation. Setup questions, changed-input reviews, file approvals, independent review and recorded runtime tests remain separate requirements.

## Configured tool guidance

Ask the administrator of the target platform where to find its configured connection identifiers, permitted operations and any platform-specific limits. Studio does not provision or verify those connections. Never invent an identifier or enter a credential in these fields.

For a customized distribution, maintain connection and operation help in `studio/tool-guidance.mjs`. The inline editor and legacy dialog both call `toolFieldHelp`; values are plain text and escaped by each renderer. Rebuild the standalone HTML after changing them. Imported skills cannot modify this application guidance. Platform-specific rules belong to the customized distribution and must not be inferred as universal constraints.

## Starting a customized launcher

The public repository uses `npm start`, which immediately prints a starting message, then prints the local URL and database path only after the server listens. A port conflict exits with guidance to use an existing Studio tab or choose another port. The browser displays a reduced-motion-aware loading indicator until its database load succeeds or fails; failure reveals the recovery/retry controls.

An external portable launcher controls the period before a browser page exists. It should show **Starting Studio…** immediately, prevent repeated activation while starting, wait for the server's explicit ready message or a successful readiness check, and expose startup errors. The first stdout event is a progress message, not a readiness signal. Do not assume that every process occupying the requested port is this application's workspace. These requirements must be tested in that launcher; this repository does not contain or verify external launcher scripts.

## What counts as an end-to-end skill test

Application regression tests cover editing, imports, review gates, exports, diagrams, themes, optimization lifecycle, backups and storage. Provider responses in these tests are synthetic. Their success does not establish that a particular generated skill works on a target platform.

A first-screen check verifies presentation only. Before recording an end-to-end pass, run the exact exported revision in the intended test environment with an authorized working connection and controlled sample data. Check required inputs, the actual operation and returned data, transformations, the final output, missing-input/data behavior and tool failures against explicit expected results. Record observations and the revision tested. Leave cases that could not run as **Not tested**; a missing connection or unavailable environment is not a successful runtime result.


## Updating a separate or customized computer

Back up its projects/workspace and commit or otherwise preserve its private changes before merging public updates. Keep internal platform rules and private skills out of the public repository. Merge the public release into the private branch, resolve shared editor/launcher changes, rebuild the standalone HTML, then restart the server against the existing data folder. Do not replace the working database with the empty template.

Recheck that computer's portable launcher (including its native/npm Claude installation), customized connection help in both inline and dialog editors, startup feedback/readiness, backup/restore, both themes, Canvas, improved-version creation and independent review. Public tests do not verify a separate portable distribution. Run the exact exported skill in its intended test environment with working authorized connections through the final output and error cases; a first screen is not an end-to-end pass.

Existing portable folders and ZIPs do not update when the Git checkout changes. Rebuild that distribution after merging, stop its earlier server, then start the rebuilt copy against the existing data folder. Include standalone Markdown import/edit/rename/history restoration and the independent-review requirement in the local acceptance check.
