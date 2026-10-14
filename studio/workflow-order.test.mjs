import test from 'node:test';
import assert from 'node:assert/strict';
import {captureWorkflowInputs,reviewChangedInputs} from './workflow-order.mjs';
import {demoProject} from './demo.mjs';
import {compile,readProject,validate,newStep} from './core.mjs';

function readySequence(){const skill=demoProject();skill.steps[2].facets[1].override='';return skill;}

test('an adjacent swap asks for review of at most three changed input relationships',()=>{
 const skill=readySequence(),before=captureWorkflowInputs(skill);
 [skill.steps[1],skill.steps[2]]=[skill.steps[2],skill.steps[1]];
 reviewChangedInputs(skill,before);
 assert.deepEqual(skill.steps.filter(step=>step.inputReview).map(step=>step.id),[skill.steps[1].id,skill.steps[2].id,skill.steps[3].id]);
 assert.equal(skill.steps[4].inputReview,undefined);
 assert.throws(()=>compile(skill),/changed input/);
 const reopened=readProject(JSON.stringify(skill));
 assert.deepEqual(reopened.steps.map(step=>step.inputReview),skill.steps.map(step=>step.inputReview));
 for(const step of reopened.steps)delete step.inputReview;
 assert.equal(validate(reopened).errors.length,0);
});

test('identically named outputs cannot hide a changed predecessor',()=>{
 const skill=readySequence();for(const step of skill.steps)step.output='Record table';
 const before=captureWorkflowInputs(skill);
 [skill.steps[1],skill.steps[2]]=[skill.steps[2],skill.steps[1]];
 reviewChangedInputs(skill,before);
 assert.equal(skill.steps.filter(step=>step.inputReview).length,3);
});

test('moving back to the original order clears the pending input review',()=>{
 const skill=readySequence(),original=skill.steps.map(step=>step.id),before=captureWorkflowInputs(skill);
 [skill.steps[0],skill.steps[1]]=[skill.steps[1],skill.steps[0]];reviewChangedInputs(skill,before);
 const moved=captureWorkflowInputs(skill);
 [skill.steps[0],skill.steps[1]]=[skill.steps[1],skill.steps[0]];reviewChangedInputs(skill,moved);
 assert.deepEqual(skill.steps.map(step=>step.id),original);
 assert.ok(skill.steps.every(step=>!step.inputReview));
});

test('inserting or deleting asks only the affected existing step to review its input',()=>{
 const skill=readySequence(),originalSecond=skill.steps[1],before=captureWorkflowInputs(skill),added=newStep('Extra review');
 skill.steps.splice(1,0,added);reviewChangedInputs(skill,before);
 assert.deepEqual(skill.steps.filter(step=>step.inputReview).map(step=>step.id),[originalSecond.id]);
 const inserted=captureWorkflowInputs(skill);skill.steps.splice(1,1);reviewChangedInputs(skill,inserted);
 assert.ok(skill.steps.every(step=>!step.inputReview));
 const prior=captureWorkflowInputs(skill),following=skill.steps[2];skill.steps.splice(1,1);reviewChangedInputs(skill,prior);
 assert.deepEqual(skill.steps.filter(step=>step.inputReview).map(step=>step.id),[following.id]);
});

test('backup validation rejects malformed input review records',()=>{
 const skill=readySequence();skill.steps[1].inputReview={previous:{id:7,title:'Previous step',output:'Records'}};
 assert.throws(()=>readProject(JSON.stringify(skill)),/input review/);
});
