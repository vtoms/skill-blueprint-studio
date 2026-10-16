import test from 'node:test';
import assert from 'node:assert/strict';
import {blankProject,sourceBytes,readProject,validate,copy} from './core.mjs';
import {importReferenceSources} from './reference-import.mjs';
import {restoreAttachment,originalActionsMarkup} from './attachments.mjs';
import {isImportedSkill,needsIndependentReview,independentReviewState,reviewSnapshot} from './independent-review.mjs';
import {syntheticReviewForGateTestsOnly} from './review-test-support.mjs';
import {optimizationSource,optimizationProposal} from './optimization-test-support.mjs';
import {skillFromOptimization} from './skill-optimization.mjs';

test('imported Markdown preserves BOM and CRLF bytes, gates review, and keeps provenance through editing, renaming and restore',async()=>{
 const skill=blankProject(),bytes=new TextEncoder().encode('\uFEFF# Guide\r\nRead the supplied records.\r\n'),[reference]=importReferenceSources(skill,[{name:'guide.md',bytes}]);
 assert.deepEqual(sourceBytes(skill.originals[0]),bytes);assert.equal(isImportedSkill(skill),false);assert.equal(needsIndependentReview(skill),true);
 await syntheticReviewForGateTestsOnly(skill);assert.equal(independentReviewState(skill).status,'passed');const snapshot=reviewSnapshot(skill);
 reference.path='references/renamed.md';reference.content='Edited instructions.';assert.notEqual(reviewSnapshot(skill),snapshot);assert.equal(independentReviewState(skill).status,'stale');
 assert.equal(readProject(JSON.stringify(skill)).references[0].sourcePath,'references/guide.md');
 skill.references=[];assert.equal(needsIndependentReview(skill),false);assert.deepEqual(sourceBytes(skill.originals[0]),bytes);
 const restored=restoreAttachment(skill,skill.originals[0].path);assert.equal(restored.reference.path,'references/guide.md');assert.equal(restored.reference.content,new TextDecoder('utf-8',{ignoreBOM:true}).decode(bytes));assert.equal(needsIndependentReview(skill),true);
 assert.throws(()=>restoreAttachment(skill,skill.originals[0].path),/already/);
});

test('reimporting a removed name retains both source versions and a rejected selection is atomic',()=>{
 const skill=blankProject(),file=text=>({name:'guide.md',bytes:new TextEncoder().encode(text)});
 importReferenceSources(skill,[file('Version one')]);skill.references=[];importReferenceSources(skill,[file('Version two')]);
 assert.equal(skill.originals.length,2);assert.notEqual(skill.originals[0].path,skill.originals[1].path);assert.equal(skill.originals[0].content,'Version one');assert.equal(skill.references[0].sourcePath,skill.originals[1].path);
 const before=copy(skill);
 for(const files of [[file('duplicate')],[{name:'ok.md',bytes:new Uint8Array([65])},{name:'bad.md',bytes:new Uint8Array([255])}],[{name:'../escape.md',bytes:new Uint8Array()}]]){
  assert.throws(()=>importReferenceSources(skill,files));assert.deepEqual(skill,before);
 }
 const invalid=copy(skill);invalid.references[0].sourcePath='../escape.md';assert.throws(()=>readProject(JSON.stringify(invalid)),/reference/);
 invalid.references[0].sourcePath='references/missing.md';assert.ok(validate(invalid).errors.some(issue=>/reference source is unavailable/.test(issue.message)));
});

test('imported reference review remains required in a derived version after active material is removed',async()=>{
 const source=optimizationSource();delete source.importedSkill;source.resources=[];source.originals=[];
 importReferenceSources(source,[{name:'external.md',bytes:new TextEncoder().encode('Preserve evidence.')}]);
 const improved=await skillFromOptimization(source,optimizationProposal(source));improved.references=[];improved.resources=[];
 assert.equal(isImportedSkill(improved),false);assert.equal(needsIndependentReview(improved),true);assert.equal(needsIndependentReview(improved.optimization.baseline),true);
});

test('both original-file surfaces use the same restore eligibility, including Markdown',()=>{
 const skill=blankProject();importReferenceSources(skill,[{name:'guide.md',bytes:new TextEncoder().encode('Read records.')}]);skill.references=[];
 const button=(label,action,extra)=>`<button data-action="${action}" ${extra}>${label}</button>`;
 assert.match(originalActionsMarkup(skill,skill.originals[0],button,value=>value),/Use in skill/);
 restoreAttachment(skill,skill.originals[0].path);assert.match(originalActionsMarkup(skill,skill.originals[0],button,value=>value),/disabled>In skill/);
 assert.doesNotMatch(originalActionsMarkup(skill,{path:'SKILL.md',content:''},button,value=>value),/restore-resource/);
});
