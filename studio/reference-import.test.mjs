import test from 'node:test';
import assert from 'node:assert/strict';
import {blankProject,sourceBytes,readProject,validate,copy} from './core.mjs';
import {importReferenceSources} from './reference-import.mjs';
import {restoreAttachment,originalActionsMarkup,originalDescription,originalUse,originalTitle} from './attachments.mjs';
import {isImportedSkill,needsIndependentReview,independentReviewState,reviewSnapshot,reviewReason} from './independent-review.mjs';
import {syntheticReviewForGateTestsOnly} from './review-test-support.mjs';
import {optimizationSource,optimizationProposal} from './optimization-test-support.mjs';
import {skillFromOptimization,optimizationContext} from './skill-optimization.mjs';

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
 const longSkill=blankProject(),longFile={name:'x'.repeat(220)+'.md',bytes:new TextEncoder().encode('Guide.')};importReferenceSources(longSkill,[longFile]);longSkill.references=[];const longBefore=copy(longSkill);assert.throws(()=>importReferenceSources(longSkill,[longFile]),/history path is too long/);assert.deepEqual(longSkill,longBefore);
});

test('imported reference review remains required in a derived version after active material is removed',async()=>{
 const source=optimizationSource();delete source.importedSkill;source.resources=[];source.originals=[];
 const [reference]=importReferenceSources(source,[{name:'external.md',bytes:new TextEncoder().encode('Preserve evidence.')}]);reference.path='references/renamed.md';reference.content='Edited guidance.';
 const context=JSON.parse(optimizationContext(source));assert.equal(context.source.references.at(-1).sourcePath,'references/external.md');assert.equal(context.source.originals[0].content,'Preserve evidence.');
 const improved=await skillFromOptimization(source,optimizationProposal(source));assert.deepEqual(improved.references,source.references);assert.deepEqual(improved.originals,source.originals);assert.deepEqual(improved.optimization.baseline.references,source.references);assert.match(reviewReason(improved),/improved version uses external material/);improved.references=[];improved.resources=[];
 assert.equal(isImportedSkill(improved),false);assert.equal(needsIndependentReview(improved),true);assert.equal(needsIndependentReview(improved.optimization.baseline),true);
});

test('historical Markdown sources distinguish active identity from occupied paths, and legacy source metadata stays accurate',()=>{
 const skill=blankProject(),file=text=>({name:'guide.md',bytes:new TextEncoder().encode(text)}),button=(label,action,extra)=>`<button data-action="${action}" ${extra}>${label}</button>`;
 importReferenceSources(skill,[file('Version one')]);skill.references=[];skill.references.push({id:'authored',path:'references/guide.md',content:'Authored replacement.'});
 assert.equal(originalUse(skill,skill.originals[0]).active,false);assert.equal(originalUse(skill,skill.originals[0]).pathOccupied,true);assert.match(originalActionsMarkup(skill,skill.originals[0],button,String),/Path in use/);assert.throws(()=>restoreAttachment(skill,skill.originals[0].path),/Rename or remove/);
 skill.references=[];importReferenceSources(skill,[file('Version two')]);assert.equal(originalUse(skill,skill.originals[0]).active,false);assert.equal(originalUse(skill,skill.originals[1]).active,true);assert.doesNotMatch(originalActionsMarkup(skill,skill.originals[0],button,String),/>In skill</);assert.equal(originalTitle(skill,skill.originals[1]),'references/guide.md · Imported source 2 of 2');assert.doesNotMatch(originalTitle(skill,skill.originals[1]),/reference-imports|id-/);
 assert.match(originalDescription({path:'references/legacy.md',content:'é\r\n'}),/^4 bytes · Markdown$/);assert.match(originalDescription({path:'assets/missing.csv',encoding:'unavailable',content:''}),/^Original bytes unavailable/);
 const named=blankProject();importReferenceSources(named,[{name:'SKILL.md',bytes:new TextEncoder().encode('Reference instructions.')}]);assert.equal(isImportedSkill(named),false);assert.equal(needsIndependentReview(named),true);assert.equal(named.sourceOrigin,'authored');
});

test('both original-file surfaces use the same restore eligibility, including Markdown',()=>{
 const skill=blankProject();importReferenceSources(skill,[{name:'guide.md',bytes:new TextEncoder().encode('Read records.')}]);skill.references=[];
 const button=(label,action,extra)=>`<button data-action="${action}" ${extra}>${label}</button>`;
 assert.match(originalActionsMarkup(skill,skill.originals[0],button,value=>value),/Use in skill/);
 restoreAttachment(skill,skill.originals[0].path);assert.match(originalActionsMarkup(skill,skill.originals[0],button,value=>value),/disabled>In skill/);
 assert.doesNotMatch(originalActionsMarkup(skill,{path:'SKILL.md',content:''},button,value=>value),/restore-resource/);
});
