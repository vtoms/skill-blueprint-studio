import {blankProject,newStep,uid,slugify,safePath,embeddedCode,readProject} from './core.mjs';

const draftString={type:'string',maxLength:12000};
const draftObject=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const draftList=(items,maxItems=30,minItems=0)=>({type:'array',items,maxItems,minItems});
export const SKILL_DRAFT_SCHEMA=draftObject({
 title:{type:'string',minLength:1,maxLength:150},description:{type:'string',minLength:1,maxLength:1024},purpose:draftString,input:draftString,outcome:draftString,instructions:draftString,
 assumptions:draftList({type:'string',maxLength:2000}),questions:draftList({type:'string',maxLength:2000}),
 definitions:draftList(draftObject({key:{type:'string',maxLength:80},name:draftString,value:draftString,intent:draftString})),
 references:draftList(draftObject({key:{type:'string',maxLength:80},path:{type:'string',maxLength:240},content:draftString}),15),
 steps:draftList(draftObject({title:{type:'string',minLength:1,maxLength:150},kind:{type:'string',enum:['Input','Select','Retrieve','Transform','Output','Process']},job:draftString,output:draftString,exampleInput:draftString,exampleOutput:draftString,referenceKeys:draftList({type:'string',maxLength:80}),facets:draftList(draftObject({title:draftString,type:{type:'string',enum:['Instruction','Reference','Tool','Business rule','Decision','Exception']},instructions:draftString,definitionKey:{type:'string',maxLength:80},connection:draftString,operation:draftString}),12)}),20,1),
 screens:draftObject({instructions:draftString,input:draftList(draftObject({label:{type:'string',maxLength:150},type:{type:'string',enum:['Text','Select','Date','Number']},required:{type:'boolean'},defaultValue:{type:'string',maxLength:2000},options:draftList({type:'string',maxLength:2000})})),output:draftList({type:'string',maxLength:150})}),
 scenarios:draftList(draftObject({name:{type:'string',maxLength:150},input:draftString,expected:draftString}),15,1)
});

function checkDraftValue(value,schema,path='draft'){
 if(schema.type==='object'){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid '+path+'.');
  for(const key of Object.keys(value))if(!Object.hasOwn(schema.properties,key))throw new Error('Unexpected draft field: '+path+'.'+key);
  for(const key of schema.required)if(!Object.hasOwn(value,key))throw new Error('Missing draft field: '+path+'.'+key);
  for(const [key,child] of Object.entries(schema.properties))checkDraftValue(value[key],child,path+'.'+key);
 }else if(schema.type==='array'){
  if(!Array.isArray(value)||value.length>(schema.maxItems??100)||value.length<(schema.minItems??0))throw new Error('Invalid list: '+path);
  value.forEach((entry,index)=>checkDraftValue(entry,schema.items,path+'['+index+']'));
 }else if(typeof value!==schema.type||schema.type==='string'&&(value.length>(schema.maxLength??12000)||value.length<(schema.minLength??0))||schema.enum&&!schema.enum.includes(value))throw new Error('Invalid value: '+path);
}

export function skillFromDraft(blueprint,{prompt,title='',model='Claude Code default'}={}){
 if(typeof prompt!=='string'||prompt.trim().length<10||prompt.length>20000)throw new Error('Describe the skill in 10–20,000 characters.');
 if(JSON.stringify(blueprint).length>300000)throw new Error('The generated draft is too large.');
 checkDraftValue(blueprint,SKILL_DRAFT_SCHEMA);
 const skill=blankProject((title||blueprint.title).trim());
 skill.slug=slugify(skill.title);if(/anthropic|claude/i.test(skill.slug))skill.slug=('custom-'+skill.slug.replace(/anthropic|claude/g,'assistant')).slice(0,64).replace(/-$/,'');
 for(const key of ['description','purpose','input','outcome','instructions'])skill[key]=blueprint[key].trim();
 const definitions=new Map(),references=new Map();
 skill.definitions=blueprint.definitions.map(definition=>{if(!definition.key||definitions.has(definition.key))throw new Error('Draft definitions need unique keys.');const id=uid();definitions.set(definition.key,id);return {id,name:definition.name.trim(),value:definition.value.trim(),intent:definition.intent.trim(),runtimeInput:''};});
 skill.references=blueprint.references.map(reference=>{if(!reference.key||references.has(reference.key)||!safePath(reference.path)||!reference.path.startsWith('references/')||!reference.path.endsWith('.md')||reference.path.startsWith('references/studio-')||skill.references.some(r=>r.path===reference.path))throw new Error('Invalid draft reference.');references.set(reference.key,reference.path);return {id:uid(),path:reference.path,content:reference.content};});
 if(new Set(skill.references.map(reference=>reference.path)).size!==skill.references.length)throw new Error('Draft reference paths must be unique.');
 skill.steps=blueprint.steps.map(proposed=>({
  ...newStep(proposed.title.trim()),kind:proposed.kind,job:proposed.job.trim(),output:proposed.output.trim(),exampleInput:proposed.exampleInput,exampleOutput:proposed.exampleOutput,reviewed:false,
  references:proposed.referenceKeys.map(key=>{if(!references.has(key))throw new Error('A draft step points to an undefined reference.');return references.get(key);}),
  facets:proposed.facets.map(facet=>{if(facet.definitionKey&&!definitions.has(facet.definitionKey))throw new Error('A draft facet points to an undefined rule.');return {id:uid(),title:facet.title.trim(),type:facet.type,instructions:facet.instructions.trim(),definitionId:definitions.get(facet.definitionKey)||'',override:'',connection:facet.connection.trim(),operation:facet.operation.trim()};})
 }));
 skill.screens={instructions:blueprint.screens.instructions,input:blueprint.screens.input.map(field=>({id:uid(),...field,definitionId:''})),output:[...blueprint.screens.output],sampleRows:[]};
 skill.scenarios=blueprint.scenarios.map(scenario=>({id:uid(),...scenario,status:'Not tested',testedRevision:null,observations:''}));
 skill.generation={provider:'claude-cli',model:String(model),createdAt:new Date().toISOString(),prompt:prompt.trim(),assumptions:[...blueprint.assumptions],questions:blueprint.questions.map(text=>({id:uid(),text,answer:'',definitionId:''})),reviewed:false};
 const instructions=[skill.title,skill.description,skill.purpose,skill.input,skill.outcome,skill.instructions,...skill.steps.flatMap(step=>[step.title,step.job,step.output,step.exampleInput,step.exampleOutput,...step.facets.flatMap(facet=>[facet.title,facet.instructions])]),...skill.references.map(reference=>reference.content),...skill.definitions.flatMap(definition=>[definition.name,definition.value,definition.intent]),skill.screens.instructions,...skill.scenarios.flatMap(scenario=>[scenario.input,scenario.expected])];
 instructions.push(...blueprint.assumptions,...blueprint.questions,...skill.screens.output,...skill.screens.input.flatMap(field=>[field.label,field.defaultValue,...field.options]),...skill.steps.flatMap(step=>step.facets.flatMap(facet=>[facet.connection,facet.operation])));
 if(instructions.some(embeddedCode))throw new Error('Claude returned embedded Python or HTML. Revise the prompt to request English instructions, then regenerate.');
 return readProject(JSON.stringify(skill));
}
