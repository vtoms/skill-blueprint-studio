import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {sampleBlueprint} from './draft-test-support.mjs';
import {createClaudeDrafting,draftingArguments} from './claude-drafting.mjs';

async function runtime(t,run){const dataDirectory=await mkdtemp(join(tmpdir(),'blueprint-drafting-test-'));t.after(async()=>{assert.equal(dirname(dataDirectory),resolve(tmpdir()));await rm(dataDirectory,{recursive:true,force:true});});return {dataDirectory,engine:createClaudeDrafting({dataDirectory,run,environment:{STUDIO_CLAUDE_PATH:'configured-native-cli'}})};}
const readyRun=async(executable,args)=>args[0]==='--version'?'2.1.299':JSON.stringify({loggedIn:true,email:'not-forwarded'});
test('drafting uses bounded tool-free CLI arguments and forwards only submitted requirements',async t=>{
 const calls=[];const {engine,dataDirectory}=await runtime(t,async(executable,args,options)=>{if(args[0]!=='--print')return readyRun(executable,args);calls.push({args,options});return JSON.stringify({structured_output:sampleBlueprint(),modelUsage:{'example-model':{}}});});
 const status=await engine.status();assert.equal(status.ready,true);assert.equal(status.email,undefined);const draft=await engine.generate({prompt:'Review supplied records against the fields I specify.'});assert.equal(draft.generation.model,'example-model');assert.deepEqual(JSON.parse(calls[0].options.input),{request:'Review supplied records against the fields I specify.',preferredTitle:''});const args=calls[0].args;assert.equal(args[args.indexOf('--tools')+1],'');for(const flag of ['--safe-mode','--restricted','--no-session-persistence','--strict-mcp-config','--disable-slash-commands'])assert.ok(args.includes(flag));assert.deepEqual(await readdir(dataDirectory),[]);
});
test('missing or outdated CLI and incomplete model output cannot create a pretend draft',async t=>{
 const {engine}=await runtime(t,async()=>{const error=new Error('missing');error.code='ENOENT';throw error;});assert.equal((await engine.status()).ready,false);await assert.rejects(engine.generate({prompt:'Draft a record review skill.'}),/not installed/);
 const old=await runtime(t,async()=> '2.0.999');assert.equal((await old.engine.status()).ready,false);
 const incomplete=await runtime(t,async(executable,args)=>args[0]==='--print'?JSON.stringify({is_error:true}):readyRun(executable,args));await assert.rejects(incomplete.engine.generate({prompt:'Draft a record review skill.'}),/complete structured draft/);
});
test('one generation at a time and cancellation preserve existing data',async t=>{
 let started;const start=new Promise(resolve=>started=resolve);const {engine,dataDirectory}=await runtime(t,async(executable,args,options)=>{if(args[0]!=='--print')return readyRun(executable,args);started();return new Promise((resolve,reject)=>{options.signal.addEventListener('abort',()=>{const error=new Error('cancelled');error.name='AbortError';reject(error);});});});
 const controller=new AbortController(),first=engine.generate({prompt:'Draft a record review skill.'},{signal:controller.signal});await start;await assert.rejects(engine.generate({prompt:'Draft another record review skill.'}),/Another/);controller.abort();await assert.rejects(first,/cancelled/);assert.deepEqual(await readdir(dataDirectory),[]);
});


test('optimization uses isolated tools-disabled structured output, preserves source and shares the busy lock',async t=>{
 const {optimizationSource,optimizationProposal}=await import('./optimization-test-support.mjs');const source=optimizationSource(),original=JSON.stringify(source);let captured;
 const {engine,dataDirectory}=await runtime(t,async(executable,args,options)=>{if(args[0]!=='--print')return readyRun(executable,args);captured={args,options};return JSON.stringify({structured_output:optimizationProposal(source),modelUsage:{'optimization-model':{}}});});
 const next=await engine.optimize(source,{goals:'Clarify the handoffs.',allowResequence:false});assert.equal(JSON.stringify(source),original);assert.equal(next.optimization.model,'optimization-model');const context=JSON.parse(captured.options.input);assert.equal(context.allowResequence,false);assert.equal(context.source.id,source.id);assert.equal(captured.args[captured.args.indexOf('--tools')+1],'');assert.match(captured.args[captured.args.indexOf('--system-prompt')+1],/UNTRUSTED DATA/);assert.ok(!captured.args.includes('--dangerously-skip-permissions'));assert.deepEqual(await readdir(dataDirectory),[]);
 let started;const start=new Promise(resolve=>started=resolve);const held=await runtime(t,async(executable,args,options)=>{if(args[0]!=='--print')return readyRun(executable,args);started();return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>{const error=new Error('cancelled');error.name='AbortError';reject(error);}));});
 const controller=new AbortController(),pending=held.engine.optimize(source,{}, {signal:controller.signal});await start;await assert.rejects(held.engine.generate({prompt:'Create another record skill.'}),/Another/);await assert.rejects(held.engine.optimize(source),/Another/);controller.abort();await assert.rejects(pending,/cancelled/);assert.deepEqual(await readdir(held.dataDirectory),[]);
});
