import {inputFor,compile} from './core.mjs';
const wfEsc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const wfButton=(label,action,extra='',kind='quiet small-button')=>`<button type="button" class="button ${kind}" data-action="${action}" ${extra}>${label}</button>`;
const wfKinds=['Input','Select','Retrieve','Transform','Output','Process'];
const wfTypes=['Instruction','Reference','Tool','Business rule','Decision','Exception'];

function wfField(label,key,value,{scope='step',id='',multiline=false,rows=3,options=null,help=''}={}){
  const attributes=`name="${wfEsc(key)}" data-edit="${scope}" data-key="${wfEsc(key)}"${id?` data-id="${wfEsc(id)}"`:''} aria-label="${wfEsc(label)}"`;
  const control=options?`<select ${attributes}>${options.map(item=>{const option=typeof item==='string'?{value:item,label:item}:item;return `<option value="${wfEsc(option.value)}" ${option.value===value?'selected':''}>${wfEsc(option.label)}</option>`;}).join('')}</select>`:multiline?`<textarea ${attributes} rows="${rows}">${wfEsc(value)}</textarea>`:`<input ${attributes} value="${wfEsc(value)}">`;
  return `<label class="field"><span>${label}</span>${control}${help?`<span class="help">${help}</span>`:''}</label>`;
}

export function workflowStepStatus(skill,step,checks){
  const chips=[];
  if(!step.title.trim())chips.push('Missing name');
  if(!step.job.trim())chips.push('Missing instructions');
  if(!step.output.trim())chips.push('Missing output');
  if(!step.reviewed)chips.push(skill.generation||skill.optimization?'Confirm draft':'Confirm import');
  if(step.inputReview)chips.push('Input changed');
  if(step.facets.some(f=>{const definition=skill.definitions.find(d=>d.id===f.definitionId);return definition&&f.override&&f.override!==definition.value;}))chips.push('Conflict');
  const errors=checks.errors.filter(issue=>issue.stepId===step.id);
  if(errors.length&&!chips.length)chips.push(`${errors.length} ${errors.length===1?'check':'checks'}`);
  return chips.map(label=>`<span class="step-status">${wfEsc(label)}</span>`).join('')||'<span class="step-status clear">Defined</span>';
}

function wfInsideSummary(step){
  const tools=step.facets.filter(f=>f.type==='Tool').length,rules=step.facets.filter(f=>['Business rule','Decision'].includes(f.type)).length,files=step.references.length+step.resourceIds.length;
  return [tools?`${tools} ${tools===1?'tool':'tools'}`:'',rules?`${rules} ${rules===1?'rule':'rules'}`:'',files?`${files} ${files===1?'file':'files'}`:'',`${step.facets.length} facets inside`].filter(Boolean).join(' · ');
}

function wfMoveControls(step,index,count){
  return `<div class="step-order">${wfButton('↑','move-up',`data-id="${wfEsc(step.id)}" aria-label="Move ${wfEsc(step.title||'step')} earlier" ${index===0?'disabled':''}`)}${wfButton('↓','move-down',`data-id="${wfEsc(step.id)}" aria-label="Move ${wfEsc(step.title||'step')} later" ${index===count-1?'disabled':''}`)}</div>`;
}

function wfCanvasNode(skill,step,index,state){
  return `<article class="canvas-step ${step.id===state.selected?'selected':''}" data-node-id="${wfEsc(step.id)}"><button class="flow-node" type="button" data-step="${wfEsc(step.id)}" aria-pressed="${step.id===state.selected}" aria-label="Step ${index+1}: ${wfEsc(step.title||'Untitled step')}"><span class="node-header"><span class="node-number">${String(index+1).padStart(2,'0')}</span><span>${wfEsc(step.kind)}</span></span><span class="node-title">${wfEsc(step.title||'Name this step')}</span><span class="contract"><span>In</span><span>${wfEsc(inputFor(skill,index)||'Input not defined yet')}</span></span><span class="contract"><span>Out</span><span>${wfEsc(step.output||'Define this output')}</span></span><span class="node-footer"><span>${wfEsc(wfInsideSummary(step))}</span></span><span class="step-statuses">${workflowStepStatus(skill,step,state.checks)}</span></button>${wfMoveControls(step,index,skill.steps.length)}</article>`;
}

function wfInsert(index){return `<div class="canvas-connector">${wfButton('＋ Insert step','insert-step',`data-index="${index}"`,'quiet insert-button')}</div>`;}

export function workflowStageMarkup(skill,state){
  const index=skill.steps.findIndex(step=>step.id===state.selected);
  let body='';
  if(state.view==='flow'){
    body=`<div class="canvas flow" aria-label="Ordered workflow canvas"><button type="button" class="boundary-card" data-action="project"><span class="eyebrow">OVERALL INPUT</span><strong>${wfEsc(skill.input||'Define the skill input')}</strong><span class="small">Edit skill brief</span></button>${wfInsert(0)}${skill.steps.map((step,i)=>wfCanvasNode(skill,step,i,state)+wfInsert(i+1)).join('')}<button type="button" class="boundary-card final-boundary" data-action="project"><span class="eyebrow">FINAL OUTPUT</span><strong>${wfEsc(skill.outcome||'Define the final result')}</strong><span class="small">Edit skill brief</span></button></div>`;
  }else if(state.view==='list'){
    body=`<div class="workflow-table-scroll"><table class="workflow-table"><caption class="visually-hidden">Steps in execution order</caption><thead><tr><th>Step</th><th>Input → Output</th><th>Inside / Checks</th><th>Order</th></tr></thead><tbody>${skill.steps.map((step,i)=>`<tr class="${step.id===state.selected?'selected':''}"><td><button type="button" data-step="${wfEsc(step.id)}" aria-pressed="${step.id===state.selected}"><span class="node-number">${String(i+1).padStart(2,'0')}</span><strong>${wfEsc(step.title||'Name this step')}</strong></button></td><td><span class="small">${wfEsc(inputFor(skill,i)||'Input not defined yet')}</span><span aria-hidden="true">↓</span><strong>${wfEsc(step.output||'Define this output')}</strong></td><td><span class="small">${wfEsc(wfInsideSummary(step))}</span><div class="step-statuses">${workflowStepStatus(skill,step,state.checks)}</div></td><td>${wfMoveControls(step,i,skill.steps.length)}</td></tr>`).join('')}</tbody></table></div>`;
  }else{
    body=`<nav class="step-rail" aria-label="Skill steps"><button type="button" class="rail-brief" data-action="project"><span class="eyebrow">SKILL BRIEF</span><strong>Input & final output</strong></button>${skill.steps.map((step,i)=>`<button type="button" class="rail-step ${step.id===state.selected?'selected':''}" data-step="${wfEsc(step.id)}" aria-pressed="${step.id===state.selected}"><span class="node-number">${String(i+1).padStart(2,'0')}</span><span><strong>${wfEsc(step.title||'Name this step')}</strong><span class="step-statuses">${workflowStepStatus(skill,step,state.checks)}</span></span></button>`).join('')}${wfButton('＋ Add step','add-step','','quiet')}</nav>`;
  }
  if(!skill.steps.length)body+=`<div class="empty"><h3>Add the first meaningful step</h3><p class="small">Define what comes in, what should happen, and what comes out.</p>${wfButton('Add your first step','add-step','','primary')}</div>`;
  return `<div class="canvas-bar"><span>${skill.steps.length} ordered ${skill.steps.length===1?'step':'steps'}${state.view==='guided'&&index>=0?` · ${index+1} selected`:''}</span>${wfButton('＋ Add step','add-step')}</div>${body}<div class="resources-bar"><span>Shared references</span>${skill.references.map(reference=>`<button class="ref-chip" data-reference="${wfEsc(reference.id)}">${wfEsc(reference.path.split('/').at(-1))}</button>`).join('')}${wfButton(`${skill.resources.length} resources`,'resources')}${wfButton('Shared rules','definitions')}</div>`;
}

function wfContract(skill,step,index){
  return `<div class="contract-box"><span class="eyebrow">INPUT · FROM ${index?'THE PREVIOUS STEP':'THE SKILL BRIEF'}</span><strong>${wfEsc(inputFor(skill,index)||'Input not defined yet')}</strong>${index?`<button class="inline-link" type="button" data-step="${wfEsc(skill.steps[index-1].id)}">Step ${index} · ${wfEsc(skill.steps[index-1].title)}</button>`:wfButton('Define overall input','project')}</div>${wfField('What this step should do','job',step.job,{multiline:true,rows:6,help:'Write deterministic English instructions, including success conditions.'})}${wfField('Output of this step','output',step.output,{help:index<skill.steps.length-1?`This becomes the input of step ${index+2}.`:'This is the workflow’s final produced result.'})}${wfField('Step type','kind',step.kind,{options:wfKinds.includes(step.kind)?wfKinds:[...wfKinds,step.kind]})}${step.kind==='Decision'?'<p class="small">This step still runs in sequence. Keep conditional choices inside its instructions or a Decision facet.</p>':''}`;
}

function wfFacet(skill,facet,index,count,state){
  const definition=skill.definitions.find(d=>d.id===facet.definitionId),conflict=definition&&facet.override&&facet.override!==definition.value;
  const options={scope:'facet',id:facet.id};
  return `<details class="facet" data-facet-container="${wfEsc(facet.id)}" ${state.openFacets.has(facet.id)?'open':''}><summary><span>${wfEsc(facet.title||'New facet')}</span><span class="tag">${wfEsc(facet.type)}</span><span class="step-status facet-conflict" ${conflict?'':'hidden'}>Conflict</span></summary><div class="facet-body">${wfField('Facet name','title',facet.title,options)}${wfField('Facet type','type',facet.type,{...options,options:wfTypes})}${wfField('Instructions','instructions',facet.instructions,{...options,multiline:true,rows:4})}${facet.type==='Tool'?wfField('MCP connection','connection',facet.connection,{...options,help:'Use a configured tool name.'})+wfField('MCP operation','operation',facet.operation,options):''}${wfField('Shared definition','definitionId',facet.definitionId||'',{...options,options:[{value:'',label:'No shared definition'},...skill.definitions.map(d=>({value:d.id,label:d.name}))]})}${definition?`<div class="shared-value"><span>Shared value: <strong>${wfEsc(definition.value)}</strong></span>${wfField('Local override','override',facet.override||'',options)}<div class="flex override-actions" ${facet.override?'':'hidden'}>${wfButton('Use shared value','clear-override',`data-id="${wfEsc(facet.id)}"`)}${wfButton('Make this shared','promote-override',`data-id="${wfEsc(facet.id)}"`)}${wfButton('Create separate rule','split-override',`data-id="${wfEsc(facet.id)}"`)}</div></div>`:''}<div class="flex">${wfButton('↑ Earlier','move-facet-up',`data-id="${wfEsc(facet.id)}" ${index===0?'disabled':''}`)}${wfButton('↓ Later','move-facet-down',`data-id="${wfEsc(facet.id)}" ${index===count-1?'disabled':''}`)}${wfButton('Remove','remove-facet',`data-id="${wfEsc(facet.id)}"`,'quiet danger small-button')}</div></div></details>`;
}

function wfBindings(skill,step){
  const referenceRows=skill.references.map(reference=>`<label class="check-row"><input type="checkbox" data-edit="binding" data-key="references" value="${wfEsc(reference.path)}" ${step.references.includes(reference.path)?'checked':''}>${wfEsc(reference.path)}</label>`).join('');
  const resourceRows=skill.resources.map(resource=>`<label class="check-row"><input type="checkbox" data-edit="binding" data-key="resourceIds" value="${wfEsc(resource.id)}" ${step.resourceIds.includes(resource.id)?'checked':''}>${wfEsc(resource.sourcePath)}<span class="small">${resource.policy==='generate'?'English specification':'Retained asset or documentation'}</span></label>`).join('');
  return `<section class="bound-files"><h3>Bound files</h3>${referenceRows+resourceRows||'<p class="small">Add references or resources, then attach them here.</p>'}<div class="flex">${wfButton('References','step-references')}${wfButton('Resources','step-resources')}</div></section>`;
}

function wfSource(skill,step){
  if(!step.source)return '<p class="small">This step was created here.</p>';
  const source=skill.originals.find(original=>original.path===step.source.path);
  const lines=source?.content?.split('\n');
  const excerpt=lines?(step.source.start?lines.slice(step.source.start-1,step.source.end||lines.length).join('\n'):source.content):'The source text is unavailable. Re-import its original package to recover it.';
  return `<div class="source-callout"><strong>${wfEsc(step.source.path)}</strong><span>Proposed mapping${step.source.start?` · lines ${step.source.start}–${step.source.end||'end'}`:''}</span>${!step.reviewed?wfButton('Confirm this proposed step','approve'):'<span>Mapping confirmed by the author</span>'}</div><pre class="original-file">${wfEsc(excerpt)}</pre>`;
}

export function workflowStepNotices(skill,step,checks){
  const previous=step.inputReview?.previous,index=skill.steps.indexOf(step);
  const change=previous?`<div class="input-change notice-box warning"><strong>Preceding step changed</strong><p>Previously: ${wfEsc(previous.title||'Untitled step')} → ${wfEsc(previous.output||'Output was not defined')}</p><p>Now: ${wfEsc(index?skill.steps[index-1].title:'Overall input')} → ${wfEsc(inputFor(skill,index)||'Input is not defined')}</p><p>Check that this step’s instructions still fit its new input.</p>${wfButton('Confirm the new input fits','confirm-input')}</div>`:'';
  return change+(!step.reviewed?`<div class="source-callout"><span>${skill.generation||skill.optimization?'Generated proposal. Review its input, instructions and output.':'Imported proposal. Review its source, input, instructions and output.'}</span>${wfButton('Confirm this proposed step','approve')}</div>`:'')+checks.errors.filter(issue=>issue.stepId===step.id&&issue.field!=='input-change').map(issue=>`<p class="editor-issue">${wfEsc(issue.message)}</p>`).join('');
}

export function workflowInspectorMarkup(skill,state){
  const step=skill.steps.find(s=>s.id===state.selected)||skill.steps[0];
  if(!step)return `<div class="empty"><h3>Define the skill, then its steps</h3><p class="small">Begin with the overall input and intended output.</p>${wfButton('Edit the skill brief','project','','primary')}</div>`;
  const index=skill.steps.indexOf(step),tabs=[['definition','Contract'],['facets','Inside'],['example','Example'],...(step.source?[['source','Source']]:[])];
  const body=state.tab==='facets'?`<p class="small">Functions, rules, decisions, tools and exceptions stay inside this step’s input → output boundary.</p>${step.facets.map((facet,i)=>wfFacet(skill,facet,i,step.facets.length,state)).join('')}${wfButton('＋ Add a facet','inline-add-facet')}${wfBindings(skill,step)}`:state.tab==='example'?wfField('Example input','exampleInput',step.exampleInput,{multiline:true,rows:4})+wfField('Expected output','exampleOutput',step.exampleOutput,{multiline:true,rows:4}):state.tab==='source'?wfSource(skill,step):wfContract(skill,step,index);
  return `<div class="inspector-heading">${wfButton('↑ Back to workflow','workflow-overview','','quiet small-button mobile-overview-button')}<p class="eyebrow">STEP ${String(index+1).padStart(2,'0')} OF ${skill.steps.length}</p><h2>${wfEsc(step.title||'Name this step')}</h2><p class="small">Changes save as you type · Undo is available</p>${wfField('Step name','title',step.title)}</div><div class="inspector-tabs" aria-label="Step details">${tabs.map(([key,label])=>`<button type="button" data-tab="${key}" class="${state.tab===key?'active':''}" aria-pressed="${state.tab===key}">${label}</button>`).join('')}</div><div class="step-notices">${workflowStepNotices(skill,step,state.checks)}</div><div class="inspector-body">${body}</div><div class="inspector-footer"><div class="flex">${wfButton('← Previous','previous',index===0?'disabled':'')}${wfButton('Next →','next',index===skill.steps.length-1?'disabled':'')}</div><div class="flex">${wfButton('↑ Move','move-up',index===0?'disabled':'')}${wfButton('↓ Move','move-down',index===skill.steps.length-1?'disabled':'')}${wfButton('Remove step','remove-step','','quiet danger small-button')}</div></div>`;
}

export function workflowMarkdownMarkup(skill){
  const files=compile(skill,{allowInvalid:true});
  return `<details class="workflow-markdown" open><summary>Generated Markdown · draft until checks pass</summary><p class="small">This preview uses the application’s compiler. Structural checks and independent import review continue to control export.</p>${['SKILL.md','references/studio-process.md'].map(path=>`<details><summary>${path}</summary><pre class="code-preview">${wfEsc(files[path])}</pre></details>`).join('')}</details>`;
}
