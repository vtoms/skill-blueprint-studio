import test from 'node:test';
import assert from 'node:assert/strict';
import {blankProject,newStep,preserveSource,copy} from './skill-model.mjs';
import {draftResource} from './resources.mjs';
import {attachmentUses,detachAttachment,restoreAttachment} from './attachments.mjs';
import {isImportedSkill,needsIndependentReview} from './independent-review.mjs';

test('authored attachments can be detached without deleting original bytes or weakening imported review',()=>{
 const skill=blankProject(),original=preserveSource('assets/sample.csv','Name\nExample\n'),resource=draftResource(original),step=newStep('Read records');skill.originals=[original];skill.resources=[resource];step.resourceIds=[resource.id];skill.steps=[step];
 const before=copy(skill);assert.equal(isImportedSkill(skill),false);assert.equal(needsIndependentReview(skill),true);assert.equal(attachmentUses(skill,resource.id).steps.length,1);
 detachAttachment(skill,resource.id);assert.deepEqual(skill.originals,before.originals);assert.deepEqual(step.resourceIds,[]);assert.equal(step.reviewed,false);assert.equal(needsIndependentReview(skill),false);
 const restored=restoreAttachment(skill,original.path);assert.equal(restored.reviewed,false);assert.equal(needsIndependentReview(skill),true);
 skill.importedSkill=true;detachAttachment(skill,restored.id);assert.equal(needsIndependentReview(skill),true);
 delete skill.importedSkill;delete skill.sourceOrigin;assert.equal(needsIndependentReview(skill),true);
});

test('dependent requirements remain visible and undo copies do not share mutable attachment lists',()=>{
 const skill=blankProject(),source=preserveSource('scripts/helper.py','def helper(): pass'),first=draftResource(source),second=draftResource(preserveSource('scripts/main.py','from helper import helper'));second.dependencies=[source.path];skill.originals=[source];skill.resources=[first,second];const before=copy(skill);
 assert.equal(attachmentUses(skill,first.id).dependents.length,1);detachAttachment(skill,first.id);assert.deepEqual(second.dependencies,[source.path]);assert.equal(before.resources.length,2);assert.throws(()=>restoreAttachment(skill,'SKILL.md'),/available supporting/);
});
