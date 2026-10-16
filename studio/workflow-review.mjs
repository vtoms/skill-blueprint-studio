import {inputFor} from './skill-model.mjs';

const stepReviewEscape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function stepCanBeConfirmed(skill,step){return Boolean(step.title.trim()&&step.job.trim()&&step.output.trim()&&inputFor(skill,skill.steps.indexOf(step)).trim());}
export function stepReviewSnapshot(skill){return {skillId:skill.id,revision:skill.revision,stepIds:skill.steps.filter(step=>!step.reviewed).map(step=>step.id)};}
export function selectedStepsToConfirm(skill,ids,snapshot){
 if(skill.id!==snapshot.skillId||skill.revision!==snapshot.revision)throw new Error('The skill changed. Reopen the step review before confirming.');
 if(!ids.length||new Set(ids).size!==ids.length)throw new Error('Select at least one step you have read.');
 return ids.map(id=>{const step=skill.steps.find(item=>item.id===id);if(!snapshot.stepIds.includes(id)||!step||step.reviewed)throw new Error('The selected steps changed. Reopen the step review.');if(!stepCanBeConfirmed(skill,step))throw new Error('Complete each selected step’s name, input, instructions and output before confirming it.');return step;});
}
export function stepReviewMarkup(skill){
 const escape=stepReviewEscape,pending=skill.steps.filter(step=>!step.reviewed);
 return '<p>Read the selected steps below. Uncheck any step you have not reviewed. Confirming steps keeps setup questions, changed inputs, file reviews and independent import review separate.</p>'+pending.map(step=>{
  const index=skill.steps.indexOf(step),eligible=stepCanBeConfirmed(skill,step),text=value=>'<pre class="review-prose">'+escape(value||'Not defined')+'</pre>';
  return '<section class="batch-review-step" aria-labelledby="batch-step-'+index+'"><h3 id="batch-step-'+index+'">'+(index+1)+'. '+escape(step.title||'Unnamed step')+'</h3><label class="check-row"><input type="checkbox" name="reviewSteps" value="'+escape(step.id)+'" '+(eligible?'checked':'disabled')+'>Confirm this step</label>'+(!eligible?'<p class="editor-issue">Complete this step’s name, input, instructions and output first.</p>':'')+'<h4>Needs</h4>'+text(inputFor(skill,index))+'<h4>Does</h4>'+text(step.job)+'<h4>Produces</h4>'+text(step.output)+step.facets.map(facet=>{
   const definition=skill.definitions.find(item=>item.id===facet.definitionId);
   return '<div class="review-inside-item"><h4>'+escape(facet.title)+' · '+escape(facet.type)+'</h4>'+text(facet.instructions)+(facet.type==='Tool'?'<p>Connection: '+escape(facet.connection||'Not configured')+' · Operation: '+escape(facet.operation||'Not configured')+'</p>':'')+(definition?'<p>Shared value: '+escape(definition.name)+' → '+escape(facet.override||definition.value)+'</p>':'')+'</div>';
  }).join('')+(step.references.length||step.resourceIds.length?'<h4>Files to check in Rules & files</h4>'+text([...step.references,...step.resourceIds.map(id=>skill.resources.find(item=>item.id===id)?.sourcePath||id)].join('\n')):'')+(step.exampleInput||step.exampleOutput?'<h4>Example input</h4>'+text(step.exampleInput)+'<h4>Expected output</h4>'+text(step.exampleOutput):'')+(step.source?.text?'<h4>Original source mapping</h4>'+text(step.source.text):'')+'</section>';
 }).join('')+'<label class="check-row"><input type="checkbox" name="stepsRead" required>I have read the selected steps and their inside items.</label>';
}
