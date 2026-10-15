import test from 'node:test';
import assert from 'node:assert/strict';
import {requestOptimization} from './optimization-request.mjs';
import {optimizationDigest,skillFromOptimization} from './skill-optimization.mjs';
import {optimizationSource,optimizationProposal} from './optimization-test-support.mjs';
import {emptyWorkspace,createWorkspaceProject} from './workspace.mjs';

async function fixture(){const source=optimizationSource(),container=createWorkspaceProject('Example collection'),workspace=emptyWorkspace();workspace.projects.push(container);container.skills.push(source);const input={projectId:container.id,skillId:source.id,sourceDigest:await optimizationDigest(source),goals:'Clarify handoffs.',allowResequence:true};return {source,workspace,input};}
test('optimization loads the saved source, returns an unsaved proposal and checkOnly never calls the model',async()=>{
 const {source,workspace,input}=await fixture();let calls=0;const engine={async optimize(value,options){calls++;assert.equal(value,source);assert.equal(options.goals,input.goals);return skillFromOptimization(value,optimizationProposal(value),options);}},deps={readWorkspace:()=>workspace,engine};
 assert.equal((await requestOptimization(deps,{...input,checkOnly:true})).sourceDigest,input.sourceDigest);assert.equal(calls,0);const result=await requestOptimization(deps,input);assert.equal(calls,1);assert.notEqual(result.skill.id,source.id);assert.equal(workspace.projects[0].skills.length,1);
});
test('source edits, deletion and altered optimization evidence fail digest checks without trusting client contents',async()=>{
 for(const change of [({source})=>source.instructions+=' changed',({workspace})=>workspace.projects[0].skills=[],({input})=>input.sourceDigest='0'.repeat(64)]){const fixtureValue=await fixture();change(fixtureValue);await assert.rejects(requestOptimization({readWorkspace:()=>fixtureValue.workspace,engine:{optimize(){assert.fail('Must not run for a stale source');}}},fixtureValue.input),error=>error.status===409);}
 const value=await fixture();value.input.skill={instructions:'Client-supplied forged source'};await assert.rejects(requestOptimization({readWorkspace:()=>value.workspace,engine:{}},value.input),/Invalid/);
});
test('source changes during generation discard the response and do not add a skill',async()=>{
 const {source,workspace,input}=await fixture(),deps={readWorkspace:()=>workspace,engine:{async optimize(value,options){const result=await skillFromOptimization(value,optimizationProposal(value),options);source.steps[0].job+=' Changed concurrently.';return result;}}};await assert.rejects(requestOptimization(deps,input),error=>error.status===409);assert.equal(workspace.projects[0].skills.length,1);
});
test('request rejects malformed options and propagates cancellation without adding versions',async()=>{
 const {workspace,input}=await fixture();for(const invalid of [{...input,goals:'x'.repeat(4001)},{...input,allowResequence:'true'},{...input,sourceDigest:'invalid'},null,{...input,checkOnly:'yes'}])await assert.rejects(requestOptimization({readWorkspace:()=>workspace,engine:{}},invalid),/Invalid/);
 const controller=new AbortController();controller.abort();await assert.rejects(requestOptimization({readWorkspace:()=>workspace,engine:{async optimize(source,options,{signal}){signal.throwIfAborted();}}},input,{signal:controller.signal}),error=>error.name==='AbortError');assert.equal(workspace.projects[0].skills.length,1);
});
