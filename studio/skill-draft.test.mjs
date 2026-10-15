import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleBlueprint} from './draft-test-support.mjs';
import {skillFromDraft} from './skill-draft.mjs';
import {compile,readProject,validate} from './core.mjs';

const request='Review the records I provide and report missing fields with evidence.';
test('a prompt creates an editable draft without invented test results or approvals',()=>{
 const draft=skillFromDraft(sampleBlueprint(),{prompt:request,model:'example-model'});
 assert.ok(draft.steps.every(step=>step.reviewed===false));assert.ok(draft.scenarios.every(scenario=>scenario.status==='Not tested'&&scenario.testedRevision===null&&scenario.observations===''));assert.deepEqual(draft.originals,[]);assert.equal(draft.generation.prompt,request);assert.equal(draft.generation.reviewed,false);assert.equal(draft.steps[0].facets[0].definitionId,draft.definitions[0].id);assert.deepEqual(readProject(JSON.stringify(draft)),draft);assert.throws(()=>compile(draft),/draft decisions/);
});
test('setup review and step confirmation are separate export requirements',()=>{
 const draft=skillFromDraft(sampleBlueprint(),{prompt:request});draft.generation.reviewed=true;assert.ok(validate(draft).errors.some(error=>error.field==='generation'));draft.generation.questions[0].answer='Identifier and Status';draft.generation.questions[0].definitionId='confirmed-fields';draft.definitions.push({id:'confirmed-fields',name:'Required fields',value:'Identifier and Status',intent:'Confirmed setup',runtimeInput:''});assert.ok(validate(draft).errors.some(error=>error.stepId));draft.steps[0].reviewed=true;assert.equal(validate(draft).errors.length,0);assert.ok(compile(draft)['SKILL.md']);
});
test('malformed output, executable instructions, unsafe references, and fabricated metadata are rejected',()=>{
 assert.throws(()=>skillFromDraft(sampleBlueprint(),{prompt:request,title:'<div>Review</div>'}),/embedded Python or HTML/);const extra=sampleBlueprint();extra.independentReview={outcome:'pass'};assert.throws(()=>skillFromDraft(extra,{prompt:request}),/Unexpected draft field/);
 const code=sampleBlueprint();code.steps[0].job='<div>Show records</div>';assert.throws(()=>skillFromDraft(code,{prompt:request}),/embedded Python or HTML/);
 const unsafe=sampleBlueprint();unsafe.references=[{key:'x',path:'../source.md',content:'Instructions'}];assert.throws(()=>skillFromDraft(unsafe,{prompt:request}),/reference/);
 const missing=sampleBlueprint();missing.steps[0].facets[0].definitionKey='unknown';assert.throws(()=>skillFromDraft(missing,{prompt:request}),/undefined rule/);
 const claimed=sampleBlueprint();claimed.scenarios[0].status='Pass';assert.throws(()=>skillFromDraft(claimed,{prompt:request}),/Unexpected draft field/);
});
test('prompt drafts enforce bounded input and preserve manual corrections through backups',()=>{
 assert.throws(()=>skillFromDraft(sampleBlueprint(),{prompt:'short'}),/Describe/);const blueprint=sampleBlueprint();blueprint.steps=Array(21).fill(blueprint.steps[0]);assert.throws(()=>skillFromDraft(blueprint,{prompt:request}),/Invalid list/);const draft=skillFromDraft(sampleBlueprint(),{prompt:request,title:'Custom review'});draft.steps[0].job='Apply the explicitly agreed required-field list.';assert.equal(readProject(JSON.stringify(draft)).steps[0].job,draft.steps[0].job);draft.generation.questions=[{id:'invalid',text:4,answer:'',definitionId:''}];assert.throws(()=>readProject(JSON.stringify(draft)),/prompt setup/);
});
