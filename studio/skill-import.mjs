import {FORMAT,PATHS,uid,slugify,blankProject,newStep,preserveSource,unquote} from './skill-model.mjs';
import {safePath,relocateLinks} from './paths.mjs';
import {readProject} from './skill-reader.mjs';
import {RESOURCE_INDEX,draftResource,resourceDisposition,parseResourceBundle} from './resources.mjs';
const LEGACY_FORMAT = 'Agentic Studio format 1';
function hasPackageFormat(text,heading){return [FORMAT,LEGACY_FORMAT].some(format=>text.startsWith(heading+'\n\n'+format+'\n'));}

function textSection(text,heading) {
  const lines=text.split('\n');const i=lines.indexOf(heading);if(i<0)return '';
  const level=heading.match(/^#+/)[0].length;let end=i+1;while(end<lines.length){const next=lines[end].match(/^(#{1,6}) /);if(next&&next[1].length<=level)break;end++;}
  return lines.slice(i+1,end).join('\n').trim();
}
function valueLine(text,label) {const line=text.split('\n').find(l=>l.startsWith(label+': '));return line?line.slice(label.length+2):'';}
function blocks(text,pattern) {
  const matches=[...text.matchAll(pattern)];return matches.map((m,i)=>({name:m[1],body:text.slice(m.index+m[0].length,matches[i+1]?.index??text.length).trim()}));
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
  const relativeFiles=Object.create(null);for(const [path,payload]of entries){if(!path.startsWith(prefix)){const resource=preserveSource('_outside-skill/'+path,payload);resource.archivePath=path;if(!safePath(resource.path))throw new Error('Outside-skill source path is too long: '+path);project.originals.push(resource);project.resources.push(draftResource(resource));project.importWarnings.push(`Outside the selected skill folder: ${path}. Its complete bytes are preserved under ${resource.path}; review its role before exporting.`);continue;}const relative=path.slice(prefix.length);if(!safePath(relative))throw new Error('Unsafe path in skill: '+relative);const resource=preserveSource(relative,payload);resource.archivePath=path;project.originals.push(resource);if(relative.endsWith('.md'))relativeFiles[relative]=resource.content;else {project.resources.push(draftResource(resource));project.importWarnings.push(`Source resource retained: ${relative}. ${resourceDisposition(relative)==='generate'?'Convert its behavior into an English implementation specification.':'Keep its data and structure attached with a reviewed Markdown guide.'}`);}}
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
  project.importedSkill=true;project.sourceOrigin='imported';delete project.independentReview;
  return readProject(JSON.stringify(project));
}
