import {validateOptimizationRecord} from './optimization-record.mjs';
import {RESOURCE_INDEX,CONTRACT_FIELDS,draftResource,resourceDisposition,resourceComplete,resourceMarkdown,resourcesMarkdown,parseResourceBundle} from './resources.mjs';
import {independentReviewState,needsIndependentReview} from './independent-review.mjs';
export const FORMAT = 'Skill Blueprint Studio format 1';
const LEGACY_FORMAT = 'Agentic Studio format 1';
function hasPackageFormat(text,heading){return [FORMAT,LEGACY_FORMAT].some(format=>text.startsWith(heading+'\n\n'+format+'\n'));}
export const PATHS = { process:'references/studio-process.md', definitions:'references/studio-definitions.md', screens:'references/studio-screens.md', examples:'references/studio-examples.md' };
export const uid = () => 'id-' + (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
export const copy = value => JSON.parse(JSON.stringify(value));
export const slugify = text => String(text).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,64).replace(/-$/,'');
export const oneLine = value => String(value ?? '').replace(/[\r\n]+/g,' ').trim();
export const quote = value => String(value ?? '').split('\n').map(line => '> ' + line).join('\n');
export const unquote = value => value.trim().split('\n').map(line => line.replace(/^> ?/,'')).join('\n').trim();

export function blankProject(title='Untitled skill') {
  return {schemaVersion:1,id:uid(),title,slug:slugify(title),description:'',purpose:'',input:'',outcome:'',instructions:'Ask for missing inputs. Do not invent facts or treat unavailable data as zero.',extraFrontmatter:'',revision:1,
    steps:[],definitions:[],references:[],resources:[],screens:{input:[],output:[],instructions:'',sampleRows:[]},scenarios:[],originals:[],importWarnings:[],warningsAcknowledged:false,createdAt:new Date().toISOString()};
}
export function newStep(title='New step') {
  return {id:uid(),title,kind:'Process',job:'',output:'',facets:[],references:[],resourceIds:[],exampleInput:'',exampleOutput:'',reviewed:true,source:null};
}
export function resourceKind(path){if(path.endsWith('.md'))return 'Markdown';if(/\.py$/i.test(path))return 'Python helper';if(/\.html?$/i.test(path))return 'HTML screen';if(/\.xsd$/i.test(path))return 'Schema';if(/\.xml$/i.test(path))return 'XML template';if(/(?:^|\/)license(?:\.[^/]*)?$/i.test(path))return 'License';return 'Source asset';}
function base64Bytes(bytes){let text='';for(let offset=0;offset<bytes.length;offset+=8192)text+=String.fromCharCode(...bytes.subarray(offset,offset+8192));return btoa(text);}
export function sourceBytes(resource){if(resource.encoding==='unavailable')throw new Error('Re-import the original archive to recover '+resource.path);if(resource.encoding==='base64')return Uint8Array.from(atob(resource.data),c=>c.charCodeAt(0));return new TextEncoder().encode(resource.content||'');}
export function preserveSource(path,payload){
  const bytes=typeof payload==='string'?new TextEncoder().encode(payload):payload;
  if(!(bytes instanceof Uint8Array))throw new Error('Unsupported source data: '+path);
  let content;try{content=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}catch{if(path.endsWith('.md'))throw new Error('Invalid UTF-8 Markdown: '+path);}
  return content===undefined?{path,kind:resourceKind(path),encoding:'base64',data:base64Bytes(bytes),content:null,size:bytes.length}:{path,kind:resourceKind(path),encoding:'utf-8',content,size:bytes.length};
}
export function inputFor(project,index) { return index ? project.steps[index-1].output : project.input; }
export function definitionValue(project,facet) {
  const definition=project.definitions.find(d=>d.id===facet.definitionId);
  return facet.override || definition?.value || '';
}
export function embeddedCode(text) {
  return /^(?:\s*>\s*)?\s*(`{3,}|~{3,})\s*(python\b|py\b|html\b|htm\b)/im.test(text) || /<(?:html|head|body|script|div|iframe|style)\b[^>]*>/i.test(text);
}
export function safePath(path) {
  return typeof path==='string' && path.length>0 && path.length<240 && !/^[\/\\]|^[a-z]:/i.test(path) && !/[\\\x00-\x1f]/.test(path) && !path.split('/').some(x=>!x||x==='.'||x==='..');
}
export function markdownLinks(text) {
  return [...String(text).matchAll(/!?\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)].map(m=>m[1]);
}
export function resolveRelative(from,target) {
  if (/^[a-z][a-z\d+.-]*:|^#|^\/\//i.test(target)) return null;
  let decoded; try { decoded=decodeURIComponent(target.split('#')[0]); } catch { return '__invalid__'; }
  if (!decoded) return null;
  const parts=from.split('/');parts.pop();
  for(const part of decoded.split('/')) {if(part==='..'){if(!parts.length)return '__invalid__';parts.pop();}else if(part!=='.'&&part)parts.push(part);}
  return parts.join('/');
}
export function relocateLinks(text,from,to) {
  return String(text).replace(/(!?\[[^\]]*\]\()([^\s)]+)([^)]*\))/g,(match,start,target,end)=>{const resolved=resolveRelative(from,target);if(!resolved||resolved==='__invalid__')return match;const fromParts=to.split('/');fromParts.pop();const targetParts=resolved.split('/');while(fromParts.length&&targetParts.length&&fromParts[0]===targetParts[0]){fromParts.shift();targetParts.shift();}const relative='../'.repeat(fromParts.length)+targetParts.join('/');const anchor=target.includes('#')?'#'+target.split('#').slice(1).join('#'):'';return start+encodeURI(relative)+anchor+end;});
}
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
  if(project.generation&&!project.generation.reviewed)add('Review the prompt setup, assumptions, and open questions.',null,'generation');
  if(project.generation?.questions.some(question=>!question.answer.trim()))add('Answer the open setup questions before export.',null,'generation');
  for(const question of project.generation?.questions||[])if(question.answer.trim()){const definition=project.definitions.find(definition=>definition.id===question.definitionId);if(!definition||definition.value!==question.answer)add('A setup answer is missing from the shared definitions or has changed. Review the prompt setup.',null,'generation');}
  if(project.optimization&&!project.optimization.reviewed)add('Review the optimization assumptions, questions and proposed changes.',null,'optimization');
  for(const question of project.optimization?.questions||[]){const definition=project.definitions.find(definition=>definition.id===question.definitionId);if(!question.answer.trim()||!definition||definition.value!==question.answer)add('Resolve the optimization questions and save their answers as shared definitions.',null,'optimization');}
  const ids=new Set();const definitionIds=new Set(project.definitions.map(d=>d.id));
  for(const definition of project.definitions) {
    if(!definition.name.trim()||!definition.value.trim())add('Complete the name and value of every shared definition.',null,'definitions');
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
      if(!facet.title.trim()||!facet.instructions.trim())add('Complete each facet’s name and instructions.',step.id,'facets');
      if(facet.definitionId&&!definitionIds.has(facet.definitionId))add('A facet uses a shared definition that no longer exists.',step.id,'facets');
      const def=project.definitions.find(d=>d.id===facet.definitionId);
      if(def&&facet.override&&facet.override!==def.value)add(`${facet.title} overrides ${def.name}: “${facet.override}” versus the shared “${def.value}”.`,step.id,'facets');
      if(facet.type==='Tool'&&(!facet.connection?.trim()||!facet.operation?.trim()))add('Specify the MCP connection and operation for this tool facet.',step.id,'facets');
    }
    for(const path of step.references)if(!project.references.some(r=>r.path===path))add(`Missing linked reference: ${path}`,step.id,'references');
    for(const id of step.resourceIds||[])if(!(project.resources||[]).some(r=>r.id===id))add('A linked resource no longer exists.',step.id,'resources');
  }
  const paths=new Set();
  for(const ref of project.references) {
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

function textSection(text,heading) {
  const lines=text.split('\n');const i=lines.indexOf(heading);if(i<0)return '';
  const level=heading.match(/^#+/)[0].length;let end=i+1;while(end<lines.length){const next=lines[end].match(/^(#{1,6}) /);if(next&&next[1].length<=level)break;end++;}
  return lines.slice(i+1,end).join('\n').trim();
}
function valueLine(text,label) {const line=text.split('\n').find(l=>l.startsWith(label+': '));return line?line.slice(label.length+2):'';}
function blocks(text,pattern) {
  const matches=[...text.matchAll(pattern)];return matches.map((m,i)=>({name:m[1],body:text.slice(m.index+m[0].length,matches[i+1]?.index??text.length).trim()}));
}
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
  const files={'SKILL.md':skillMarkdown(project),[PATHS.process]:processMarkdown(project),[PATHS.definitions]:definitionsMarkdown(project),[PATHS.screens]:screensMarkdown(project),[PATHS.examples]:examplesMarkdown(project)};
  for(const ref of project.references)if(safePath(ref.path)&&ref.path.endsWith('.md')&&!Object.hasOwn(files,ref.path))files[ref.path]=ref.content;
  if(project.resources?.length){files[RESOURCE_INDEX]=resourcesMarkdown(project);files['SKILL.md']+='\n## Resource implementation and retained assets\n\nRead [the resource index]('+RESOURCE_INDEX+'). Generate Python and HTML only at runtime from the reviewed English specifications. Keep attached data and structural assets unchanged. Before generating a dependent helper, regenerate its required modules at the declared relative paths. Do not execute draft specifications: complete their review and acceptance tests first.\n';for(const r of project.resources){if(safePath(r.referencePath)&&r.referencePath.endsWith('.md')&&!Object.hasOwn(files,r.referencePath))files[r.referencePath]=resourceMarkdown(r);if(r.policy==='retain'&&safePath(r.sourcePath)&&!Object.hasOwn(files,r.sourcePath)){const original=project.originals.find(o=>o.path===r.sourcePath&&o.encoding!=='unavailable');if(original)files[r.sourcePath]=sourceBytes(original);}}}
  if(allowInvalid&&checks.errors.length)files['SKILL.md']=files['SKILL.md'].replace(/(# [^\n]+\n)/,'$1\nDRAFT FOR REVIEW: unresolved definition or resource checks remain. Do not execute this draft until they are resolved and the package is exported through the review gate.\n');
  return files;
}

export function parseFrontmatter(markdown) {
  const normalized=markdown.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
  const match=normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);if(!match)return {name:'',description:'',extra:'',body:normalized,lineOffset:0,warnings:['The source has no YAML frontmatter. Define a skill name and description.']};
  const raw=match[1];const matches=[...raw.matchAll(/^([a-zA-Z][\w-]*):/gm)];const values={};const extra=[];const warnings=[];
  for(let i=0;i<matches.length;i++){const m=matches[i],name=m[1];if(Object.hasOwn(values,name))throw new Error('Duplicate frontmatter field: '+name);values[name]=raw.slice(m.index+m[0].length,matches[i+1]?.index??raw.length);
    if(name!=='name'&&name!=='description')extra.push(raw.slice(m.index,matches[i+1]?.index??raw.length).trimEnd());
  }
  const scalar=value=>{if(!value)return '';const text=value.trim();if(/^[|>][-+]?/.test(text)){const lines=text.split('\n').slice(1).map(x=>x.replace(/^\s{1,}/,''));return text[0]==='>'?lines.join(' ').trim():lines.join('\n').trim();}if(text.startsWith('"')){try{return JSON.parse(text);}catch{warnings.push('A quoted frontmatter value could not be decoded. Review the metadata.');return text;}}if(text.startsWith("'"))return text.slice(1,-1).replace(/''/g,"'");return text.replace(/\s+#.*$/,'').trim();};
  return {name:scalar(values.name),description:scalar(values.description),extra:extra.join('\n'),body:normalized.slice(match[0].length),lineOffset:match[0].split('\n').length-1,warnings};
}
function genericSections(body) {
  const lines=body.split('\n');let fenced=false;const sections=[];let current={title:'Opening instructions',content:[],start:1};
  for(let i=0;i<lines.length;i++){const line=lines[i];if(/^\s*(`{3,}|~{3,})/.test(line))fenced=!fenced;
    if(!fenced&&/^## (?!#)/.test(line)){if(current.content.join('\n').trim())sections.push({...current,text:current.content.join('\n').trim(),end:i});current={title:line.slice(3).trim(),content:[],start:i+1};}else if(!/^# (?!#)/.test(line))current.content.push(line);
  }
  if(current.content.join('\n').trim())sections.push({...current,text:current.content.join('\n').trim(),end:lines.length});return sections;
}
export function importMarkdownFiles(files) {
  const entries=Object.entries(files);const skills=entries.filter(([path])=>/(^|\/)SKILL\.md$/.test(path));
  if(skills.length!==1)throw new Error(skills.length?'This archive contains several skills. Import one skill folder at a time.':'No SKILL.md was found.');
  const [skillPath,skillPayload]=skills[0];const skillText=preserveSource(skillPath,skillPayload).content;if(skillText===null)throw new Error('SKILL.md must contain UTF-8 text.');const prefix=skillPath.slice(0,-'SKILL.md'.length);const front=parseFrontmatter(skillText);
  const title=front.body.match(/^# (.+)$/m)?.[1]||front.name||'Imported skill';const project=blankProject(title);
  project.slug=front.name||slugify(title);project.description=front.description;project.extraFrontmatter=front.extra;project.importWarnings.push(...front.warnings);
  const relativeFiles={};for(const [path,payload]of entries){if(!path.startsWith(prefix)){const resource=preserveSource('_outside-skill/'+path,payload);resource.archivePath=path;if(!safePath(resource.path))throw new Error('Outside-skill source path is too long: '+path);project.originals.push(resource);project.resources.push(draftResource(resource));project.importWarnings.push(`Outside the selected skill folder: ${path}. Its complete bytes are preserved under ${resource.path}; review its role before exporting.`);continue;}const relative=path.slice(prefix.length);if(!safePath(relative))throw new Error('Unsafe path in skill: '+relative);const resource=preserveSource(relative,payload);resource.archivePath=path;project.originals.push(resource);if(relative.endsWith('.md'))relativeFiles[relative]=resource.content;else {project.resources.push(draftResource(resource));project.importWarnings.push(`Source resource retained: ${relative}. ${resourceDisposition(relative)==='generate'?'Convert its behavior into an English implementation specification.':'Keep its data and structure attached with a reviewed Markdown guide.'}`);}}
  const processEntry=Object.entries(relativeFiles).find(([path,text])=>path!=='SKILL.md'&&hasPackageFormat(text,'# Process reference'));
  if(processEntry) {
    project.purpose=unquote(textSection(front.body,'## Purpose'));project.input=unquote(textSection(front.body,'## Overall input'));project.instructions=unquote(textSection(front.body,'## Working instructions'));project.outcome=unquote(textSection(front.body,'## Completion'));
    project.steps=blocks(processEntry[1],/^## Step \d+: (.+)\n/gm).map(block=>{
      const step=newStep(block.name);step.kind=valueLine(block.body,'Type')||'Process';step.output=valueLine(block.body,'Output');
      step.job=relocateLinks(unquote(textSection(block.body,'### Instructions')),processEntry[0],'SKILL.md');
      step.references=textSection(block.body,'### References').split('\n').filter(l=>l.startsWith('- ')).map(l=>l.slice(2));
      step.resourceIds=textSection(block.body,'### Resources').split('\n').filter(l=>l.startsWith('- ')).map(l=>l.slice(2));
      step.exampleInput=unquote(textSection(block.body,'### Example input'));step.exampleOutput=unquote(textSection(block.body,'### Expected output'));
      step.facets=blocks(textSection(block.body,'### Facets'),/^#### Facet: (.+)\n/gm).map(f=>{
        const quoted=f.body.split('\n').filter(l=>l.startsWith('>')).join('\n');
        return {id:uid(),title:f.name,type:valueLine(f.body,'Type')||'Instruction',instructions:relocateLinks(unquote(quoted),processEntry[0],'SKILL.md'),definitionId:valueLine(f.body,'Definition key'),override:valueLine(f.body,'Local override'),connection:valueLine(f.body,'Connection'),operation:valueLine(f.body,'Operation')};
      });step.source={path:processEntry[0],start:null,end:null,text:block.body};return step;
    });
    const definitionEntry=Object.entries(relativeFiles).find(([,t])=>hasPackageFormat(t,'# Shared definitions'));
    if(definitionEntry)project.definitions=blocks(definitionEntry[1],/^## Definition: (.+)\n/gm).map(d=>({id:valueLine(d.body,'Key')||uid(),name:d.name,value:valueLine(d.body,'Value'),runtimeInput:valueLine(d.body,'Runtime input'),intent:unquote(d.body.split('\n').filter(l=>l.startsWith('>')).join('\n'))}));
    const screenEntry=Object.entries(relativeFiles).find(([,t])=>hasPackageFormat(t,'# Screen definitions'));
    if(screenEntry){project.screens.instructions=unquote(textSection(screenEntry[1],'## Presentation instructions'));project.screens.input=blocks(textSection(screenEntry[1],'## Input fields'),/^### Field: (.+)\n/gm).map(f=>{let options=[];try{options=JSON.parse(valueLine(f.body,'Choices'));}catch{}return {id:uid(),label:f.name,type:valueLine(f.body,'Type'),required:valueLine(f.body,'Required')==='yes',defaultValue:valueLine(f.body,'Default'),definitionId:valueLine(f.body,'Definition key'),options};});project.screens.output=textSection(screenEntry[1],'## Output columns').split('\n').filter(l=>l.startsWith('- ')).map(l=>l.slice(2));try{project.screens.sampleRows=JSON.parse(unquote(textSection(screenEntry[1],'## Sample rows')));}catch{}}
    const exampleEntry=Object.entries(relativeFiles).find(([,t])=>hasPackageFormat(t,'# Test examples'));if(exampleEntry)project.scenarios=blocks(exampleEntry[1],/^## Scenario: (.+)\n/gm).map(s=>({id:uid(),name:s.name,input:unquote(textSection(s.body,'### Input')),expected:unquote(textSection(s.body,'### Expected result')),status:'Not tested',testedRevision:null,observations:''}));
    const restoredResources=parseResourceBundle(relativeFiles);if(restoredResources.length){project.resources=restoredResources;project.importWarnings=project.importWarnings.filter(w=>!w.startsWith('Source resource retained:'));}
    const generated=new Set([processEntry[0],definitionEntry?.[0],screenEntry?.[0],exampleEntry?.[0],RESOURCE_INDEX,...restoredResources.map(r=>r.referencePath)]);project.references=Object.entries(relativeFiles).filter(([path])=>path!=='SKILL.md'&&!generated.has(path)).map(([path,content])=>({id:uid(),path,content}));
  }else{
    project.purpose=front.description;project.input='';project.outcome='';project.instructions='Review the source mapping before approving the proposed workflow. Preserve all requirements while defining each input and output.';
    project.steps=genericSections(front.body).map(section=>{const step=newStep(section.title);step.job=section.text;step.reviewed=false;step.source={path:'SKILL.md',start:section.start+front.lineOffset,end:section.end+front.lineOffset,text:section.text};return step;});
    if(!project.steps.length){const step=newStep('Review imported instructions');step.job=front.body;step.reviewed=false;step.source={path:'SKILL.md',text:front.body,start:front.lineOffset+1,end:null};project.steps.push(step);}
    project.references=Object.entries(relativeFiles).filter(([path])=>path!=='SKILL.md').map(([path,content])=>({id:uid(),path,content}));
    project.importWarnings.push('Headings are proposed steps, not an AI interpretation. Check the order, move shared instructions out of steps if needed, and define every input and output.');
    if(/choose (?:your )?(?:approach|workflow|path) by task/i.test(front.body))project.importWarnings.push('The source routes by task. Review its alternative paths before approving a sequential workflow; heading order does not capture that routing.');
  }
  project.importedSkill=true;delete project.independentReview;
  return readProject(JSON.stringify(project));
}

export function readProject(text) {
  if(text.length>32*1024*1024)throw new Error('Project file is too large.');const value=JSON.parse(text);
  if(value?.schemaVersion!==1||!Array.isArray(value.steps)||!Array.isArray(value.references)||!Array.isArray(value.definitions)||!Array.isArray(value.scenarios)||!value.screens)throw new Error('This is not a Skill Blueprint Studio project file.');
  const strings=['title','slug','description','purpose','input','outcome','instructions'];for(const key of strings)if(typeof value[key]!=='string')throw new Error('Invalid project field: '+key);
  if(value.steps.length>100||value.references.length>100)throw new Error('This prototype supports up to 100 steps and references.');
  for(const s of value.steps){for(const key of ['id','title','kind','job','output'])if(typeof s[key]!=='string')throw new Error('Invalid step field: '+key);if(!Array.isArray(s.facets)||!Array.isArray(s.references)||s.facets.length>100||s.references.some(r=>typeof r!=='string'))throw new Error('Invalid step facets or references.');for(const f of s.facets)for(const key of ['id','title','type','instructions'])if(typeof f[key]!=='string')throw new Error('Invalid facet field.');s.exampleInput=String(s.exampleInput||'');s.exampleOutput=String(s.exampleOutput||'');}
  for(const r of value.references)if(typeof r.path!=='string'||typeof r.content!=='string'||!safePath(r.path))throw new Error('Invalid reference.');
  for(const d of value.definitions)if(typeof d.id!=='string'||typeof d.name!=='string'||typeof d.value!=='string')throw new Error('Invalid shared definition.');
  for(const s of value.scenarios)if(typeof s.id!=='string'||typeof s.name!=='string'||typeof s.input!=='string'||typeof s.expected!=='string')throw new Error('Invalid scenario.');
  if(!Array.isArray(value.screens.input)||!Array.isArray(value.screens.output)||!Array.isArray(value.screens.sampleRows)||typeof value.screens.instructions!=='string')throw new Error('Invalid screen definitions.');for(const f of value.screens.input)if(typeof f.id!=='string'||typeof f.label!=='string'||!Array.isArray(f.options)||f.options.some(x=>typeof x!=='string'))throw new Error('Invalid input field.');if(value.screens.output.some(x=>typeof x!=='string'))throw new Error('Invalid output columns.');
  value.originals=Array.isArray(value.originals)?value.originals:[];for(const original of value.originals){if(!original||typeof original.path!=='string'||!safePath(original.path))throw new Error('Invalid original source resource.');if(original.archivePath!==undefined&&!safePath(original.archivePath))throw new Error('Invalid original archive path.');if(original.encoding==='base64'){if(typeof original.data!=='string'||(original.data.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(original.data)))throw new Error('Invalid binary source resource.');}else if(typeof original.content!=='string')throw new Error('Invalid source text.');if(!original.encoding&&!original.path.endsWith('.md')&&original.content.startsWith('[Non-Markdown resource retained by filename only;')){original.encoding='unavailable';original.kind=resourceKind(original.path);}}
  value.resources=Array.isArray(value.resources)?value.resources:[];if(value.resources.length>500)throw new Error('This prototype supports up to 500 resources.');for(const r of value.resources){for(const key of ['id','sourcePath','referencePath','policy'])if(typeof r[key]!=='string')throw new Error('Invalid resource field: '+key);if(!safePath(r.sourcePath)||!safePath(r.referencePath)||!['generate','retain','document'].includes(r.policy))throw new Error('Invalid resource path or disposition.');for(const key of [...CONTRACT_FIELDS,'structure','sourceHash'])r[key]=String(r[key]||'');r.untranslated=Array.isArray(r.untranslated)?r.untranslated.map(String):['Missing translation status'];r.dependencies=Array.isArray(r.dependencies)?r.dependencies:[];if(r.dependencies.some(path=>typeof path!=='string'||!safePath(path)))throw new Error('Invalid resource dependency.');r.reviewed=r.reviewed===true;}
  for(const s of value.steps){if(s.inputReview!==undefined){const previous=s.inputReview?.previous;if(!previous||['id','title','output'].some(key=>typeof previous[key]!=='string'))throw new Error('Invalid input review state.');}s.resourceIds=Array.isArray(s.resourceIds)?s.resourceIds:[];if(s.resourceIds.some(id=>typeof id!=='string'))throw new Error('Invalid step resource bindings.');}
  if(value.generation!==undefined){const generation=value.generation;if(!generation||generation.provider!=='claude-cli'||typeof generation.prompt!=='string'||generation.prompt.length>20000||typeof generation.model!=='string'||typeof generation.createdAt!=='string'||!Number.isFinite(Date.parse(generation.createdAt))||!Array.isArray(generation.assumptions)||generation.assumptions.length>30||generation.assumptions.some(text=>typeof text!=='string'||text.length>2000)||!Array.isArray(generation.questions)||generation.questions.length>30||generation.questions.some(question=>!question||typeof question.id!=='string'||typeof question.text!=='string'||typeof question.answer!=='string'||typeof question.definitionId!=='string'))throw new Error('Invalid prompt setup metadata.');generation.reviewed=generation.reviewed===true;}
  if(value.optimization!==undefined)validateOptimizationRecord(value.optimization,readProject);
  value.importWarnings=Array.isArray(value.importWarnings)?value.importWarnings.map(String):[];value.extraFrontmatter=String(value.extraFrontmatter||'');value.revision=Number.isSafeInteger(value.revision)&&value.revision>0?value.revision:1;return value;
}
