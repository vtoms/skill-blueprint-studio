import {FORMAT,PATHS,oneLine,inputFor,quote,sourceBytes} from './skill-model.mjs';
import {safePath,relocateLinks} from './paths.mjs';
import {validate} from './skill-validation.mjs';
import {RESOURCE_INDEX,resourceMarkdown,resourcesMarkdown} from './resources.mjs';

function facetText(project,facet) {
  const def=project.definitions.find(d=>d.id===facet.definitionId);
  return `#### Facet: ${oneLine(facet.title)}\n\nType: ${facet.type}\nDefinition key: ${def?.id||''}\nLocal override: ${oneLine(facet.override||'')}\nConnection: ${oneLine(facet.connection||'')}\nOperation: ${oneLine(facet.operation||'')}\n\n${quote(relocateLinks(facet.instructions,'SKILL.md',PATHS.process))}\n`;
}
export function processMarkdown(project) {
  return `# Process reference\n\n${FORMAT}\n\nFollow the steps in order. Each output is the next step's input. Reference paths listed below are relative to the skill root. The shared definitions are authoritative; a facet reads their current values.\n\n`+project.steps.map((s,i)=>`## Step ${String(i+1).padStart(2,'0')}: ${oneLine(s.title)}\n\nType: ${oneLine(s.kind)}\nInput: ${oneLine(inputFor(project,i))}\nOutput: ${oneLine(s.output)}\n\n### Instructions\n\n${quote(relocateLinks(s.job,'SKILL.md',PATHS.process))}\n\n### References\n\n${s.references.map(r=>'- '+r).join('\n')}\n\n### Resources\n\n${(s.resourceIds||[]).map(id=>'- '+id).join('\n')}\n\n### Facets\n\n${s.facets.map(f=>facetText(project,f)).join('\n')}\n### Example input\n\n${quote(s.exampleInput)}\n\n### Expected output\n\n${quote(s.exampleOutput)}\n`).join('\n');
}
export function definitionsMarkdown(project) {
  return `# Shared definitions\n\n${FORMAT}\n\nUse these definitions consistently throughout the process. When a definition names a runtime input field, its Value is the default: use the user's supplied field value in every linked facet. If the required input is missing, ask for it. A definition without a runtime input field uses its fixed Value.\n\n`+project.definitions.map(d=>`## Definition: ${oneLine(d.name)}\n\nKey: ${d.id}\nValue: ${oneLine(d.value)}\nRuntime input: ${oneLine(d.runtimeInput||'')}\n\n${quote(d.intent||'')}\n`).join('\n');
}
export function screensMarkdown(project) {
  return `# Screen definitions\n\n${FORMAT}\n\n## Presentation instructions\n\n${quote(project.screens.instructions)}\n\n## Input fields\n\n`+project.screens.input.map(f=>`### Field: ${oneLine(f.label)}\n\nType: ${f.type}\nRequired: ${f.required?'yes':'no'}\nDefault: ${oneLine(project.definitions.find(d=>d.id===f.definitionId)?.value||f.defaultValue||'')}\nDefinition key: ${f.definitionId||''}\nChoices: ${JSON.stringify(f.options||[])}\n`).join('\n')+'\n## Output columns\n\n'+project.screens.output.map(c=>'- '+oneLine(c)).join('\n')+'\n\n## Sample rows\n\n'+quote(JSON.stringify(project.screens.sampleRows))+'\n';
}
export function examplesMarkdown(project) {
  return `# Test examples\n\n${FORMAT}\n\nThese describe intended behavior. They do not assert that a runtime test passed.\n\n`+project.scenarios.map(s=>`## Scenario: ${oneLine(s.name)}\n\n### Input\n\n${quote(s.input)}\n\n### Expected result\n\n${quote(s.expected)}\n`).join('\n');
}
export function skillMarkdown(project) {
  return `---\nname: ${JSON.stringify(project.slug)}\ndescription: ${JSON.stringify(project.description)}\n${project.extraFrontmatter?project.extraFrontmatter.trim()+'\n':''}---\n\n# ${oneLine(project.title)}\n\n## Purpose\n\n${quote(project.purpose)}\n\n## Overall input\n\n${quote(project.input)}\n\n## Working instructions\n\n${quote(project.instructions)}\n\n## Workflow\n\nFollow [the process reference](${PATHS.process}). Each step defines its input, instructions, output, and inner facets. Use [the shared definitions](${PATHS.definitions}) consistently across steps.\n\n${project.steps.map((s,i)=>`${i+1}. ${oneLine(s.title)} — ${oneLine(inputFor(project,i))} → ${oneLine(s.output)}.`).join('\n')}\n\n## Screens and examples\n\nRead [the screen definitions](${PATHS.screens}) for field order, output columns, and presentation rules. Read [the test examples](${PATHS.examples}) to understand the intended results. Render screens from these instructions using the host's supported capabilities; do not assume the skill package creates a native UI or supplies a live tool connection.\n\n## Supporting references\n\n${project.references.map(r=>`- [${r.path}](${encodeURI(r.path)})`).join('\n')||'No additional references.'}\n\n## Completion\n\n${quote(project.outcome)}\n`;
}
export function compile(project,{allowInvalid=false}={}) {
  const checks=validate(project);if(checks.errors.length&&!allowInvalid)throw new Error(checks.errors[0].message);
  const files=Object.assign(Object.create(null),{'SKILL.md':skillMarkdown(project),[PATHS.process]:processMarkdown(project),[PATHS.definitions]:definitionsMarkdown(project),[PATHS.screens]:screensMarkdown(project),[PATHS.examples]:examplesMarkdown(project)});
  for(const ref of project.references)if(safePath(ref.path)&&ref.path.endsWith('.md')&&!Object.hasOwn(files,ref.path))files[ref.path]=ref.content;
  if(project.resources?.length){files[RESOURCE_INDEX]=resourcesMarkdown(project);files['SKILL.md']+='\n## Resource implementation and retained assets\n\nRead [the resource index]('+RESOURCE_INDEX+'). Generate Python and HTML only at runtime from the reviewed English specifications. Keep attached data and structural assets unchanged. Before generating a dependent helper, regenerate its required modules at the declared relative paths. Do not execute draft specifications: complete their review and acceptance tests first.\n';for(const r of project.resources){if(safePath(r.referencePath)&&r.referencePath.endsWith('.md')&&!Object.hasOwn(files,r.referencePath))files[r.referencePath]=resourceMarkdown(r);if(r.policy==='retain'&&safePath(r.sourcePath)&&!Object.hasOwn(files,r.sourcePath)){const original=project.originals.find(o=>o.path===r.sourcePath&&o.encoding!=='unavailable');if(original)files[r.sourcePath]=sourceBytes(original);}}}
  if(allowInvalid&&checks.errors.length)files['SKILL.md']=files['SKILL.md'].replace(/(# [^\n]+\n)/,'$1\nDRAFT FOR REVIEW: unresolved definition or resource checks remain. Do not execute this draft until they are resolved and the package is exported through the review gate.\n');
  return files;
}
