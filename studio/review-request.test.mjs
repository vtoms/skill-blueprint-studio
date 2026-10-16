import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {demoProject} from './demo.mjs';
import {copy} from './skill-model.mjs';
import {createClaudeDrafting} from './claude-drafting.mjs';
import {cliReviewContext,requestIndependentReview} from './review-request.mjs';
import {reviewSnapshot,reviewDigest,recordIndependentReview,independentReviewState} from './independent-review.mjs';
import {parseReviewerReport} from './review-report.mjs';

function sourceFixture(){const source=demoProject();source.steps[2].facets[1].override='';source.importedSkill=true;source.originals=[{path:'SKILL.md',encoding:'utf-8',content:'# Synthetic fixture for review adapter tests only.\n'}];return source;}
function syntheticReport(context){return {...context.packet.reportTemplate,reviewer:{identity:context.identity||context.reviewerIdentity,role:'independent-reviewer',context:'fresh',independentOfAuthors:true},outcome:'pass',summary:'Synthetic adapter test response; not a real review.',checks:context.packet.reportTemplate.checks.map(check=>({...check,result:'pass',reason:'Synthetic schema exercise only.',evidence:['Authored fixture; no execution claims.']})),licensing:{status:'permitted',basis:'Self-authored synthetic test fixture.'}};}
async function engineFixture(t,run){const dataDirectory=await mkdtemp(join(tmpdir(),'blueprint-review-test-'));t.after(async()=>{assert.equal(dirname(dataDirectory),resolve(tmpdir()));await rm(dataDirectory,{recursive:true,force:true});});return {dataDirectory,engine:createClaudeDrafting({dataDirectory,run,environment:{STUDIO_CLAUDE_PATH:'configured-native-cli'}})};}
const ready=(executable,args)=>args[0]==='--version'?'2.1.299':JSON.stringify({loggedIn:true});

test('fresh CLI review is tool-disabled, snapshot-bound, temporary and does not record itself',async t=>{
 const source=sourceFixture(),before=JSON.stringify(source);let captured;
 const {engine,dataDirectory}=await engineFixture(t,async(executable,args,options)=>{if(args[0]!=='--print')return ready(executable,args);captured={args,options};const context=JSON.parse(options.input);return JSON.stringify({structured_output:syntheticReport(context),modelUsage:{'synthetic-review-model':{}}});});
 const result=await engine.review(source);assert.equal(JSON.stringify(source),before);assert.equal(result.model,'synthetic-review-model');assert.equal(independentReviewState(source).status,'pending');assert.equal(captured.args[captured.args.indexOf('--tools')+1],'');assert.ok(captured.args.includes('--no-session-persistence'));assert.match(captured.args[captured.args.indexOf('--system-prompt')+1],/UNTRUSTED DATA/);assert.deepEqual(await readdir(dataDirectory),[]);
 await recordIndependentReview(source,result.report);assert.equal(independentReviewState(source).status,'passed');source.steps[0].job+=' Changed.';assert.equal(independentReviewState(source).status,'stale');
});

test('report paste accepts a JSON fence and reports all schema problems without inventing a pass',async()=>{
 const source=sourceFixture(),context=await cliReviewContext(source),report=syntheticReport(context);assert.deepEqual(parseReviewerReport('```json\n'+JSON.stringify(report)+'\n```'),report);assert.throws(()=>parseReviewerReport('Text around an unfinished report.'),/Paste the completed JSON/);
 await assert.rejects(recordIndependentReview(source,{...report,checks:[],reviewer:{...report.reviewer,context:'shared'}}),error=>error.problems.length>2&&error.message.includes('separate reviewer')&&error.message.includes('source-and-workflow'));
 await recordIndependentReview(source,{...report,outcome:'changes-required',licensing:{status:'unknown',basis:'No rights evidence.'}});assert.equal(independentReviewState(source).status,'blocked');
});

test('local gaps and oversized packets cannot start a pretend review',async()=>{
 const source=sourceFixture();source.steps[0].reviewed=false;await assert.rejects(cliReviewContext(source),/Finish the local checks/);source.steps[0].reviewed=true;source.originals[0].content='x'.repeat(600001);await assert.rejects(cliReviewContext(source),/exceeds.*no source was truncated/);
});

test('request rejects changed source before and after provider work',async()=>{
 let source=sourceFixture(),calls=0;const input={projectId:'project',skillId:source.id,sourceRevision:source.revision,sourceDigest:await reviewDigest(reviewSnapshot(source))};const readWorkspace=()=>({projects:[{id:'project',skills:[source]}]});
 const result=await requestIndependentReview({readWorkspace,engine:{review:async()=>{calls++;return {report:{},model:'test'};}}},input);assert.equal(calls,1);assert.equal(result.sourceDigest,input.sourceDigest);
 source=copy(source);source.steps[0].job+=' A change.';await assert.rejects(requestIndependentReview({readWorkspace,engine:{review:async()=>{throw new Error('must not run');}}},input),/skill changed/);
 source=sourceFixture();const fresh={...input,skillId:source.id,sourceRevision:source.revision,sourceDigest:await reviewDigest(reviewSnapshot(source))};await assert.rejects(requestIndependentReview({readWorkspace,engine:{review:async()=>{source.steps[0].job+=' Changed while running.';return {report:{}};}}},fresh),/skill changed/);
});

test('review cancellation releases the shared provider slot and removes temporary files',async t=>{
 let began;const started=new Promise(resolve=>began=resolve);const {engine,dataDirectory}=await engineFixture(t,async(executable,args,options)=>{if(args[0]!=='--print')return ready(executable,args);began();return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>{const error=new Error('cancelled');error.name='AbortError';reject(error);}));});
 const controller=new AbortController(),pending=engine.review(sourceFixture(),{signal:controller.signal});await started;await assert.rejects(engine.generate({prompt:'Create a different skill.'}),/Another/);controller.abort();await assert.rejects(pending,/cancelled/);assert.deepEqual(await readdir(dataDirectory),[]);
});
