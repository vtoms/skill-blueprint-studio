# UX decisions and flowchart behavior

The editor follows a repeatable story: Projects → Project skills → Describe, start blank or import → Brief → Steps → Rules & files → Input & output → Review & package → Test in Claude → Improve. Seven numbered sections, factual statuses and Next/Previous links suggest a path without locking a returning author into a wizard. A mobile section picker keeps navigation compact. The app always reopens on Projects.

## Three views, one skill

| View | Use it for | Presentation |
|---|---|---|
| Step by step | Writing and reviewing one step | Ordered navigation rail and focused editor |
| List | Scanning handoffs and checks | Compact table, attention filter and run-order buttons |
| Canvas | Understanding and arranging the process | Spatial shapes, labelled connectors and selection-driven editor |

All three edit the same steps, inside items, values and files. View switches preserve selection and expanded inside items. The Canvas is a two-dimensional editor on desktop and mobile; mobile switches between **Process overview** and **Edit selected step**, so the diagram and editor do not compete for the same viewport. Selecting a shape opens the editor; returning to Canvas selects the overview. It supports start/finish shapes, orthogonal arrows, insertion points, dragging, background pan, zoom, Fit, Focus step and Auto arrange. Fit shows the whole process; Focus step shows the selected shape at full size. **Find a step** jumps to a named step at full scale. Below 45% zoom, the overview shows titles while hiding unreadable contract/status text; the full editor and text outline retain all details. Start/finish boundaries avoid other shapes after arrangement.

Spatial arrangement and execution order are separate. Dragging or moving a shape changes coordinates only. Run earlier/later changes the ordered step array, connects each step to its new predecessor and flags affected handoffs for review. Inserting or deleting steps uses the same review mechanism. Coordinates persist with the skill and backups; viewport pan and zoom last only for the current editor session. Layout alone preserves independent review and test freshness.

Connectors follow the ordered steps; routing does not automatically avoid every other shape after arbitrary manual arrangement. There is no free connector creation or branching execution engine. Decisions remain conditional instructions inside sequential macro steps. The diagram does not imply parallel or conditional runtime behavior that the compiler cannot represent.

## Accessible interaction

- Every drag operation has click/tap alternatives: directional Move shape controls and Pan controls. Keyboard support is additional, rather than the sole alternative to dragging.
- On a focused shape, arrows move it 10 units; Shift+arrows move it 50. Alt+Up/Down deliberately changes execution order.
- On the focused background, arrows pan, Shift+arrows pan farther, +/− zoom, and 0 fits. Ctrl/Command+wheel and touch pinch zoom around the gesture.
- A text outline exposes the ordered steps and their full input/output text without spatial navigation. The shared inspector presents full definitions when diagram labels are abbreviated.
- Inspector tabs use tablist/tab/tabpanel semantics and arrow/Home/End navigation. Hints are associated with fields through `aria-describedby`.
- Info buttons open one nonmodal text-only help layer. Click/tap, Escape, outside dismissal and focus return work in the page and nested modal context. Native Popover is used when available, with a positioned fallback. Essential requirements and failures remain visible outside optional help.

These are implementation decisions and verified interaction behaviors, not a certification of complete WCAG conformance. Assistive-technology testing and representative-user studies remain useful follow-up work.

## Wording and trust

Needs → Does → Produces expresses one meaningful transformation. Rules, decisions, tools and exceptions live Inside this step. Reusable choices are Shared values; written guidance is Reference documents; attached assets are Supporting files. Original source remains separately available.

Draft questions live in Brief. Improved-version controls, frozen comparisons and carried questions live in Improve. Markdown inspection belongs to Review & package; visual examples belong to Input & output. Blocking errors persist until dismissed or superseded by a successful action. Save status reflects database acknowledgement.

Structural readiness means ready to download for testing. It does not prove successful execution. Test in Claude explicitly asks the author to run the downloaded skill outside this application and record observations. Current, stale and unrun results remain distinguishable; changing arrangement alone does not require a re-run. Independent import review, source preservation, provider transmission notices, optimization reset requirements and database conflicts retain their existing controls.

## Research and design provenance

An assessment of the complete public source was performed in Claude Design using Opus 5.5. Its assessment and prototype informed the journey and wording. The application implementation was authored separately; no exported prototype code, custom element, support script or font was copied. Claude Design's own background prototype validation did not report a result at the final bounded inspection. Validation of this implementation is separate.

The decisions also draw on these primary sources and published guidance:

| Source | Applied decision |
|---|---|
| [NN/g: Recognition rather than recall](https://www.nngroup.com/articles/recognition-and-recall/) | Visible sections, explicit handoffs and named next actions |
| [NN/g: Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | Optional section explanations behind info controls |
| [GOV.UK: Task list](https://design-system.service.gov.uk/components/task-list/) and [multiple tasks](https://design-system.service.gov.uk/patterns/complete-multiple-tasks/) | Reachable sections and factual progress rather than a locked linear wizard |
| [Carbon: Toggletip guidance](https://www.carbondesignsystem.com/building-blocks/core/components/toggletip/guidelines) | Clickable, persistent help instead of hover-only explanations |
| [WAI-ARIA: Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) | Inspector tab roles and keyboard behavior |
| [WCAG 2.2: Dragging movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) | Single-pointer controls for shape movement and custom panning; keyboard alone is insufficient |
| [WHATWG: Popover](https://html.spec.whatwg.org/multipage/popover.html) | Native top-layer help with a fallback |
| [React Flow: Viewport](https://reactflow.dev/learn/concepts/the-viewport) and [controls](https://reactflow.dev/api-reference/components/controls) | Separation of graph coordinates from viewport pan/zoom; no React Flow code or dependency is used |
| [Microsoft Visio: Connectors](https://support.microsoft.com/en-us/visio/add-connectors-between-visio-shapes) | Directional connections that follow moved process shapes |

Standards, product documentation and expert guidance support these choices; they do not establish that this application has an empirically optimal UX. No representative-user usability study has been completed.

## Appearance

The persistent header switch shows the current Light or Dark mode, with a sun/moon icon, a descriptive action label, keyboard activation and pressed state. The system preference is the initial default; choosing a mode overrides later system changes. The choice is saved in the local workspace database. Switching changes shared semantic CSS tokens and native control color-scheme without rerendering the editor or touching skill instructions. SVG artwork and connectors use those same tokens. Both modes retain blue primary actions and distinct warning/error colors.


## Review, files and responsive editing (0.10.0)

Review & package presents local fixes before independent review, then download and external testing. Guided Claude review requires an explicit request and report acceptance; the external packet/paste/load route remains available. Essential provider transmission, licensing, blocker and freshness information stays visible.

Supporting files initially opens a populated category. Inside-step counts include bound references and resources. Remove from skill describes affected steps and dependencies, clears active bindings and confirmations, and preserves original bytes; Undo restores the full change. Original files provides Use in skill to rebuild an editable file description and reanalyze it. Authored external-file skills and imported skills have distinct provenance labels.

Projects remains the starting page, with Continue editing for the most recently edited skill. Repeated Restore navigation and Canvas run-order controls were removed. Optional keyboard explanations live behind the Canvas info button. Layout changes remain independent of semantic changes. Notifications do not capture pointer events; reordering controls have larger targets; required errors remain persistent. Mobile process chrome omits duplicate navigation and purpose text already available through breadcrumbs/Brief.

Typing coalesces stage/controller rebuilds after 180 ms while preserving the active editor. Chapter status uses the same validation result for that refresh. Autosave defers workspace serialization until its 200 ms debounce/explicit flush, and preserves in-flight snapshots, conflict protection and retry state. Undo still retains independent copies of source history; originals are not shared across undo snapshots.
