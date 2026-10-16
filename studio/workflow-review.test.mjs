import test from 'node:test';
import assert from 'node:assert/strict';
import {blankProject,newStep} from './core.mjs';
import {selectedStepsToConfirm,stepReviewSnapshot,stepReviewMarkup} from './workflow-review.mjs';
import {TOOL_FIELD_GUIDANCE} from './tool-guidance.mjs';
import {workflowInspectorMarkup} from './workflow-view.mjs';

function sample(){const skill=blankProject('Example');skill.input='Supplied records';skill.steps=[newStep('Collect'),newStep('Review')];for(const step of skill.steps){step.reviewed=false;step.job='Read the supplied records.';step.output='Reviewed records';}return skill;}
test('batch confirmation only selects current complete pending steps and preserves other review requirements',()=>{
 const skill=sample();skill.steps[1].inputReview={previous:{title:'Old step',output:'Old input'}};skill.resources=[{id:'asset',reviewed:false}];skill.generation={reviewed:false};const snapshot=stepReviewSnapshot(skill),selected=selectedStepsToConfirm(skill,[skill.steps[0].id],snapshot);selected.forEach(step=>step.reviewed=true);assert.equal(skill.steps[0].reviewed,true);assert.equal(skill.steps[1].reviewed,false);assert.ok(skill.steps[1].inputReview);assert.equal(skill.resources[0].reviewed,false);assert.equal(skill.generation.reviewed,false);assert.equal(skill.independentReview,undefined);
 assert.throws(()=>selectedStepsToConfirm(skill,[],snapshot));assert.throws(()=>selectedStepsToConfirm(skill,[skill.steps[1].id,skill.steps[1].id],snapshot));assert.throws(()=>selectedStepsToConfirm(skill,['unknown'],snapshot));skill.revision++;assert.throws(()=>selectedStepsToConfirm(skill,[skill.steps[1].id],snapshot),/changed/);
});
test('batch review displays escaped contracts, inside items and source; incomplete steps cannot be confirmed',()=>{
 const skill=sample();skill.steps[0].job='<img src=x onerror=alert(1)>';skill.steps[0].facets=[{id:'facet',title:'Tool',type:'Tool',instructions:'Inspect records.',connection:'Example',operation:'Read'}];skill.steps[1].output='';const html=stepReviewMarkup(skill);assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;img/);assert.match(html,/Connection: Example/);assert.match(html,/name="stepsRead" required/);assert.match(html,/disabled/);assert.throws(()=>selectedStepsToConfirm(skill,[skill.steps[1].id],stepReviewSnapshot(skill)),/Complete/);
});
test('inline tool guidance reads the same shared plain-text configuration as the dialog',()=>{
 const skill=sample();skill.steps[0].facets=[{id:'facet',title:'Tool',type:'Tool',instructions:'Inspect.',connection:'',operation:''}];const original={...TOOL_FIELD_GUIDANCE};
 try{TOOL_FIELD_GUIDANCE.connection='Custom connection <example>';TOOL_FIELD_GUIDANCE.operation='Custom operation & limits';const html=workflowInspectorMarkup(skill,{selected:skill.steps[0].id,tab:'facets',openFacets:new Set(['facet']),checks:{errors:[]}});assert.match(html,/Custom connection &lt;example&gt;/);assert.match(html,/Custom operation &amp; limits/);assert.doesNotMatch(html,/<example>/);}finally{Object.assign(TOOL_FIELD_GUIDANCE,original);}
});
