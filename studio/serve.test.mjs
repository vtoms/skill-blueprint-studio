import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {request as httpRequest} from 'node:http';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createWorkspaceProject,addWorkspaceProject} from './workspace.mjs';

test('local server serves the app, persists projects, rejects stale writes, and analyzes source safely',async t=>{
 const dataDirectory=await mkdtemp(join(tmpdir(),'blueprint-server-'));t.after(()=>rm(dataDirectory,{recursive:true,force:true}));
 const probe=createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');
 const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
 const server=spawn(process.execPath,[fileURLToPath(new URL('./serve.mjs',import.meta.url))],{env:{...process.env,STUDIO_PORT:String(port),STUDIO_DATA_DIR:dataDirectory,STUDIO_CLAUDE_PATH:'missing-test-drafting-cli'},windowsHide:true,stdio:['ignore','pipe','pipe']});
 let errors='';server.stderr.on('data',data=>errors+=data);
 try{
  await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(new Error('Server did not start: '+errors)),10000);
   let startupOutput='';server.stdout.on('data',data=>{startupOutput+=data;if(startupOutput.includes('Skill Blueprint Studio: http://127.0.0.1:')){clearTimeout(timeout);resolve();}});
   server.once('error',error=>{clearTimeout(timeout);reject(error);});
   server.once('exit',code=>{clearTimeout(timeout);reject(new Error('Server exited: '+code+' '+errors));});
  });
  const base='http://127.0.0.1:'+port;
  const duplicate=spawn(process.execPath,[fileURLToPath(new URL('./serve.mjs',import.meta.url))],{env:{...process.env,STUDIO_PORT:String(port),STUDIO_DATA_DIR:join(dataDirectory,'duplicate'),STUDIO_CLAUDE_PATH:'missing-test-drafting-cli'},windowsHide:true,stdio:['ignore','pipe','pipe']});
  let duplicateOutput='',duplicateError='';duplicate.stdout.on('data',data=>duplicateOutput+=data);duplicate.stderr.on('data',data=>duplicateError+=data);
  const duplicateExit=await once(duplicate,'exit');assert.equal(duplicateExit[0],1);assert.match(duplicateOutput,/Starting Skill Blueprint Studio/);assert.doesNotMatch(duplicateOutput,/Skill Blueprint Studio: http/);assert.match(duplicateError,/already in use.*existing browser tab/);
  const app=await fetch(base);assert.equal(app.status,200);const html=await app.text();assert.match(html,/<h1 id="project-title">Projects<\/h1>/);assert.match(html,/<title>Skill Blueprint Studio<\/title>/);
  const state=await (await fetch(base+'/api/workspace')).json();assert.deepEqual(state.workspace.projects,[]);assert.equal(state.storage.engine,'SQLite');addWorkspaceProject(state.workspace,createWorkspaceProject('Saved collection'));
  const put=()=>fetch(base+'/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({revision:state.revision,workspace:state.workspace})});
  assert.equal((await put()).status,200);assert.equal((await put()).status,409);assert.equal((await (await fetch(base+'/api/workspace')).json()).workspace.projects[0].name,'Saved collection');
  assert.equal((await fetch(base+'/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json',Origin:'https://example.com'},body:'{}'})).status,403);
  assert.equal((await fetch(base+'/api/workspace',{method:'PUT',headers:{'Content-Type':'text/plain'},body:'{}'})).status,400);
  const drafting=await (await fetch(base+'/api/skill-draft')).json();assert.equal(drafting.ready,false);assert.match(drafting.message,/could not be found/);
  assert.equal((await fetch(base+'/api/skill-draft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:'short'})})).status,400);
  assert.equal((await fetch(base+'/api/skill-draft',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://example.com'},body:JSON.stringify({prompt:'Create a record review skill.'})})).status,403);
  assert.equal((await fetch(base+'/api/skill-optimize')).status,405);
  assert.equal((await fetch(base+'/api/skill-review')).status,405);
  assert.equal((await fetch(base+'/api/skill-review',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,400);
  assert.equal((await fetch(base+'/api/skill-review',{method:'POST',headers:{'Content-Type':'text/plain'},body:'{}'})).status,400);
  assert.equal((await fetch(base+'/api/skill-review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({padding:'x'.repeat(17000)})})).status,413);
  assert.equal((await fetch(base+'/api/skill-optimize',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://example.com'},body:'{}'})).status,403);
  assert.equal((await fetch(base+'/api/skill-optimize',{method:'POST',headers:{'Content-Type':'text/plain'},body:'{}'})).status,400);
  assert.equal((await fetch(base+'/api/skill-optimize',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,400);
  const {optimizationSource,optimizationProposal}=await import('./optimization-test-support.mjs'),{skillFromOptimization,optimizationDigest}=await import('./skill-optimization.mjs');
  const savedState=await (await fetch(base+'/api/workspace')).json(),source=optimizationSource(),derived=await skillFromOptimization(source,optimizationProposal(source));savedState.workspace.projects[0].skills.push(source,derived);
  const writeState=value=>fetch(base+'/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
  assert.equal((await writeState({revision:savedState.revision,workspace:savedState.workspace})).status,200);
  const request={projectId:savedState.workspace.projects[0].id,skillId:source.id,sourceDigest:await optimizationDigest(source),checkOnly:true};
  assert.equal((await fetch(base+'/api/skill-optimize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)})).status,200);
  request.sourceDigest='0'.repeat(64);assert.equal((await fetch(base+'/api/skill-optimize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)})).status,409);
  const intact=await (await fetch(base+'/api/workspace')).json();intact.workspace.projects[0].skills[1].optimization.baseline.steps[0].job+=' corrupted';assert.equal((await writeState({revision:intact.revision,workspace:intact.workspace})).status,400);assert.equal((await (await fetch(base+'/api/workspace')).json()).revision,intact.revision);
  const entries=[{path:'scripts/sample.py',data:Buffer.from('def add(a,b):\n return a+b\n').toString('base64')}];
  const response=await fetch(base+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(entries)});
  assert.equal(response.status,200);const analysis=await response.json();
  assert.match(JSON.stringify(analysis),/add/);
  assert.equal((await fetch(base+'/api/analyze',{method:'POST',headers:{Origin:'https://example.com'},body:'[]'})).status,403);
  assert.equal((await fetch(base+'/api/analyze',{method:'POST',body:'[null]'})).status,400);
  assert.equal((await fetch(base+'/api/analyze')).status,405);
  for(const headers of [{Host:'example.invalid:'+port},{'Sec-Fetch-Site':'cross-site'},{Origin:'https://example.com'}]){
   for(const endpoint of ['/api/workspace','/api/skill-draft','/api/skill-optimize','/api/skill-review','/api/analyze']){const status=await new Promise((resolve,reject)=>{const req=httpRequest(base+endpoint,{method:'POST',headers:{'Content-Type':'application/json',...headers}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end('[]');});assert.equal(status,403,endpoint);}
  }
  assert.equal((await fetch(base+'/api/analyze',{method:'POST',headers:{'Content-Type':'text/plain'},body:'[]'})).status,400);
  assert.equal((await fetch(base+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:'{invalid'})).status,400);
  assert.equal((await fetch(base+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify([{path:'../bad.py',data:'YQ=='}])})).status,400);
  assert.equal((await fetch(base+'/%2e%2e%2fREADME.md')).status,403);
 }finally{
  if(server.exitCode===null){server.kill();await once(server,'exit');}
 }
});
