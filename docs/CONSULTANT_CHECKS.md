# Consultant review and platform integration

## Completing review on your own

Imported skills need independent review before normal package download. A reviewer may be an independent colleague or a separate fresh AI session; the application does not require a second human. In **Review & package**, download the packet, attach it to a new chat that did not author or convert the skill, and ask it to follow the packet's review instructions and return the completed JSON report. Load that report, resolve findings, and obtain a fresh review when the reviewed content changes. Report identities remain declarations, as described in the [review rule](../studio/INDEPENDENT_REVIEW_RULE.md).

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
