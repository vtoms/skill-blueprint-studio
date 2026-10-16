import {PATHS,embeddedCode} from './skill-model.mjs';
import {safePath,markdownLinks,resolveRelative} from './paths.mjs';
import {RESOURCE_INDEX,resourceComplete,resourceDisposition,resourceMarkdown} from './resources.mjs';
import {independentReviewState} from './independent-review.mjs';

export function availableResourcePaths(project){return new Set(['SKILL.md',...Object.values(PATHS),...(project.resources?.length?[RESOURCE_INDEX]:[]),...project.references.map(r=>r.path),...(project.resources||[]).flatMap(r=>[r.referencePath,...(r.policy==='retain'||r.policy==='generate'&&resourceComplete(r)?[r.sourcePath]:[])])]);}
export function missingResourceReferences(project) {
  const packaged=availableResourcePaths(project);
  const excluded=(project.originals||[]).map(o=>o.path).filter(path=>!path.endsWith('.md'));
  const escapePattern=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const locations=[{label:'Skill metadata and working instructions',text:[project.extraFrontmatter,project.purpose,project.instructions].join('\n'),from:'SKILL.md',stepId:null,field:'project'},
    ...project.steps.map(s=>({label:s.title,text:[s.job,...s.facets.map(f=>f.instructions)].join('\n'),from:'SKILL.md',stepId:s.id,field:'dependencies'})),
    ...project.references.map(r=>({label:r.path,text:r.content,from:r.path,stepId:null,field:'references'})),
    ...(project.resources||[]).map(r=>({label:r.referencePath,text:(r.dependencies||[]).join('\n'),from:'SKILL.md',stepId:null,field:'resources'})),
    {label:'Screen instructions',text:project.screens.instructions,from:'SKILL.md',stepId:null,field:'screens'}];
  const missing=[];
  for(const location of locations){
    const text=String(location.text||'').replace(/https?:\/\/[^\s)]+/g,'');
    const mentions=new Set([...text.matchAll(/\b((?:scripts|assets|references)\/[a-zA-Z0-9_./%+-]+\.[a-zA-Z0-9]+)/g)].map(m=>m[1]));
    for(const path of excluded)if(new RegExp('(^|[^a-zA-Z0-9_./-])'+escapePattern(path)+'(?=$|[^a-zA-Z0-9_./-])').test(text))mentions.add(path);
    for(const path of mentions){const relative=resolveRelative(location.from,path);if(!packaged.has(path)&&!packaged.has(relative))missing.push({label:location.label,path,stepId:location.stepId,field:location.field});}
  }
  return missing;
}
export function validate(project) {
  const errors=[];const warnings=[];
  const add=(message,stepId=null,field=null)=>errors.push({message,stepId,field});
  if(!project.title.trim())add('Give the skill a title.',null,'project');
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug)||project.slug.length>64||/anthropic|claude/i.test(project.slug))add('Use a skill name of up to 64 lowercase letters, numbers, and single hyphens; avoid reserved Claude names.',null,'project');
  if(!project.description.trim()||project.description.length>1024||/<\/?[a-z][^>]*>/i.test(project.description))add('Describe what the skill does and when to use it, in 1–1024 characters without XML tags.',null,'project');
  if(!project.input.trim())add('Define the overall input.',null,'project');
  if(!project.outcome.trim())add('Define the final output.',null,'project');
  if(/^---\s*$/m.test(project.extraFrontmatter||'')||/^(?:name|description):/m.test(project.extraFrontmatter||''))add('Imported metadata must not redefine name/description or add a frontmatter delimiter.',null,'project');
  if(!project.steps.length)add('Add at least one meaningful step.',null,'workflow');
  if(project.generation&&!project.generation.reviewed)add('Review the draft decisions, assumptions, and open questions.',null,'generation');
  if(project.generation?.questions.some(question=>!question.answer.trim()))add('Answer the open setup questions before export.',null,'generation');
  for(const question of project.generation?.questions||[])if(question.answer.trim()){const definition=project.definitions.find(definition=>definition.id===question.definitionId);if(!definition||definition.value!==question.answer)add('A setup answer is missing from the shared definitions or has changed. Review the prompt setup.',null,'generation');}
  if(project.optimization&&!project.optimization.reviewed)add('Review the proposed changes, assumptions, and carried questions.',null,'optimization');
  for(const question of project.optimization?.questions||[]){const definition=project.definitions.find(definition=>definition.id===question.definitionId);if(!question.answer.trim()||!definition||definition.value!==question.answer)add('Resolve the carried questions and save their answers as shared values.',null,'optimization');}
  const ids=new Set();const definitionIds=new Set(project.definitions.map(d=>d.id));
  for(const definition of project.definitions) {
    if(!definition.name.trim()||!definition.value.trim())add('Complete the name and value of every shared value.',null,'definitions');
    if(definition.runtimeInput&&!project.screens.input.some(f=>f.label===definition.runtimeInput))add(`${definition.name} reads a runtime input field that is missing: ${definition.runtimeInput}.`,null,'definitions');
  }
  for(const step of project.steps) {
    if(ids.has(step.id))add('Step identities must be unique.',step.id);ids.add(step.id);
    if(!step.title.trim()||/[\r\n]/.test(step.title))add('Give this step a title on one line.',step.id);
    if(!step.job.trim())add('Define what this step should do.',step.id);
    if(!step.output.trim()||/[\r\n]/.test(step.output))add('Define the output of this step on one line.',step.id);
    if(step.inputReview)add('Confirm that this step still fits its changed input.',step.id,'input-change');
    if(!step.reviewed)add(project.generation||project.optimization?'Review this proposed generated step and confirm its input, job, and output.':'Review this proposed imported step and confirm its input, job, and output.',step.id);
    for(const facet of step.facets) {
      if(!facet.title.trim()||!facet.instructions.trim())add('Complete each inside item’s name and instructions.',step.id,'facets');
      if(facet.definitionId&&!definitionIds.has(facet.definitionId))add('An inside item uses a shared value that no longer exists.',step.id,'facets');
      const def=project.definitions.find(d=>d.id===facet.definitionId);
      if(def&&facet.override&&facet.override!==def.value)add(`${facet.title} overrides ${def.name}: “${facet.override}” versus the shared “${def.value}”.`,step.id,'facets');
      if(facet.type==='Tool'&&(!facet.connection?.trim()||!facet.operation?.trim()))add('Specify the configured connection and operation for this tool.',step.id,'facets');
    }
    for(const path of step.references)if(!project.references.some(r=>r.path===path))add(`Missing linked reference: ${path}`,step.id,'references');
    for(const id of step.resourceIds||[])if(!(project.resources||[]).some(r=>r.id===id))add('A linked resource no longer exists.',step.id,'resources');
  }
  const paths=new Set();
  for(const ref of project.references) {
    if(ref.sourcePath&&(!safePath(ref.sourcePath)||!project.originals.some(source=>source.path===ref.sourcePath&&source.encoding!=='unavailable')))add('The imported reference source is unavailable: '+ref.path,null,'references');
    if(!safePath(ref.path)||!ref.path.endsWith('.md'))add('Reference paths must be relative Markdown paths.',null,'references');
    if(ref.path==='SKILL.md'||Object.values(PATHS).includes(ref.path)||ref.path===RESOURCE_INDEX)add(`Rename ${ref.path}; this path is used by the compiler.`,null,'references');
    if(paths.has(ref.path))add(`Duplicate reference path: ${ref.path}`,null,'references');paths.add(ref.path);
  }
  const resourceIds=new Set();const reserved=new Set(['SKILL.md',...Object.values(PATHS),RESOURCE_INDEX,...paths]);
  for(const resource of project.resources||[]){
    if(resourceIds.has(resource.id))add('Resource identities must be unique.',null,'resources');resourceIds.add(resource.id);
    if(!safePath(resource.sourcePath)||!safePath(resource.referencePath)||!resource.referencePath.endsWith('.md'))add('Use safe relative resource and Markdown specification paths.',null,'resources');
    if(resourceDisposition(resource.sourcePath)!==resource.policy)add('The resource disposition conflicts with the code-to-instructions policy: '+resource.sourcePath,null,'resources');
    if(reserved.has(resource.referencePath))add('Duplicate resource specification path: '+resource.referencePath,null,'resources');reserved.add(resource.referencePath);
    if(resource.policy==='retain'){if(reserved.has(resource.sourcePath))add('Duplicate retained asset path: '+resource.sourcePath,null,'resources');reserved.add(resource.sourcePath);if(!project.originals.some(o=>o.path===resource.sourcePath&&o.encoding!=='unavailable'))add('The retained asset is unavailable: '+resource.sourcePath,null,'resources');}
    if(!resourceComplete(resource))add('Complete the resource instructions and resolve translation gaps: '+resource.sourcePath,null,'resources');
    if(!resource.reviewed)add('Review the '+(resource.policy==='generate'?'English implementation draft':'structural guide')+': '+resource.sourcePath,null,'resources');
    if(!project.steps.some(s=>(s.resourceIds||[]).includes(resource.id)))add('Attach this resource to the step that uses it: '+resource.sourcePath,null,'resources');
  }
  const texts=[['Project instructions',[project.purpose,project.input,project.outcome,project.instructions].join('\n'),null],...project.steps.flatMap(s=>[[s.title,[s.job,s.exampleInput,s.exampleOutput].join('\n'),s.id],...s.facets.map(f=>[f.title,f.instructions,s.id])]),...project.definitions.map(d=>[d.name,d.value+'\n'+d.intent,null]),...project.references.map(r=>[r.path,r.content,null]),['Screen instructions',project.screens.instructions+'\n'+JSON.stringify(project.screens.sampleRows),null],...project.scenarios.map(s=>[s.name,s.input+'\n'+s.expected,null])];
  for(const [name,text,stepId] of texts)if(embeddedCode(text))add(`${name} contains an HTML or Python code block. Replace it with Markdown instructions.`,stepId);
  for(const resource of project.resources||[])if(resource.policy!=='retain'&&embeddedCode(resourceMarkdown(resource)))add('Replace embedded Python or HTML with English instructions: '+resource.sourcePath,null,'resources');
  const compiledPaths=availableResourcePaths(project);
  for(const ref of project.references)for(const link of markdownLinks(ref.content)){
    const resolved=resolveRelative(ref.path,link);if(resolved&&!compiledPaths.has(resolved))add(`${ref.path} links to a missing file: ${link}`,null,'references');
  }
  for(const step of project.steps)for(const link of markdownLinks(step.job+'\n'+step.facets.map(f=>f.instructions).join('\n'))){const resolved=resolveRelative('SKILL.md',link);if(resolved&&!compiledPaths.has(resolved))add(`${step.title} links to a missing file: ${link}`,step.id);}
  for(const missing of missingResourceReferences(project))add(`${missing.label} refers to an unresolved package dependency: ${missing.path}. Attach the retained asset or review its runtime implementation specification before exporting.`,missing.stepId,missing.field);
  if(project.importWarnings.length&&!project.warningsAcknowledged)add('Review the import notes and confirm the resource dispositions and workflow mapping.',null,'import');
  const fieldNames=new Set();for(const field of project.screens.input){if(!field.label.trim()||fieldNames.has(field.label))add('Input screen fields need unique, non-empty labels.',null,'screens');fieldNames.add(field.label);if(field.type==='Select'&&!field.options.length)add(`Add choices for ${field.label}.`,null,'screens');if(field.definitionId&&!definitionIds.has(field.definitionId))add(`The ${field.label} field uses a missing shared definition.`,null,'screens');const def=project.definitions.find(d=>d.id===field.definitionId);if(def&&field.type==='Select'&&!field.options.includes(def.value))add(`The ${field.label} choices do not include the shared value “${def.value}”.`,null,'screens');}
  const cols=new Set();for(const column of project.screens.output){if(!column.trim()||cols.has(column))add('Output columns need unique, non-empty names.',null,'screens');cols.add(column);}
  if(!project.scenarios.length)warnings.push('Add an example input and expected result before testing in Claude.');
  if(project.scenarios.some(s=>s.status==='Fail'&&s.testedRevision===project.revision))warnings.push('A recorded scenario failed for this revision. Review its observations.');
  if(project.scenarios.some(s=>s.testedRevision!==project.revision))warnings.push('Test results need to be recorded or rechecked for this revision.');
  warnings.push('Checks cover structure, file links, and explicit shared values. Free-text contradictions and runtime behavior still need review.');
  const adversarial=independentReviewState(project);for(const message of adversarial.blockers)add(message,null,'adversarial');
  return {errors,warnings};
}
