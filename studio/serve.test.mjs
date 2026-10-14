import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
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
 const server=spawn(process.execPath,[fileURLToPath(new URL('./serve.mjs',import.meta.url))],{env:{...process.env,STUDIO_PORT:String(port),STUDIO_DATA_DIR:dataDirectory},windowsHide:true,stdio:['ignore','pipe','pipe']});
 let errors='';server.stderr.on('data',data=>errors+=data);
 try{
  await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(new Error('Server did not start: '+errors)),10000);
   server.stdout.once('data',()=>{clearTimeout(timeout);resolve();});
   server.once('error',error=>{clearTimeout(timeout);reject(error);});
   server.once('exit',code=>{clearTimeout(timeout);reject(new Error('Server exited: '+code+' '+errors));});
  });
  const base='http://127.0.0.1:'+port;
  const app=await fetch(base);assert.equal(app.status,200);const html=await app.text();assert.match(html,/<h1 id="project-title">Projects<\/h1>/);assert.match(html,/<title>Skill Blueprint Studio<\/title>/);
  const state=await (await fetch(base+'/api/workspace')).json();assert.deepEqual(state.workspace.projects,[]);assert.equal(state.storage.engine,'SQLite');addWorkspaceProject(state.workspace,createWorkspaceProject('Saved collection'));
  const put=()=>fetch(base+'/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({revision:state.revision,workspace:state.workspace})});
  assert.equal((await put()).status,200);assert.equal((await put()).status,409);assert.equal((await (await fetch(base+'/api/workspace')).json()).workspace.projects[0].name,'Saved collection');
  assert.equal((await fetch(base+'/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json',Origin:'https://example.com'},body:'{}'})).status,403);
  assert.equal((await fetch(base+'/api/workspace',{method:'PUT',headers:{'Content-Type':'text/plain'},body:'{}'})).status,400);
  const entries=[{path:'scripts/sample.py',data:Buffer.from('def add(a,b):\n return a+b\n').toString('base64')}];
  const response=await fetch(base+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(entries)});
  assert.equal(response.status,200);const analysis=await response.json();
  assert.match(JSON.stringify(analysis),/add/);
  assert.equal((await fetch(base+'/api/analyze',{method:'POST',headers:{Origin:'https://example.com'},body:'[]'})).status,400);
  assert.equal((await fetch(base+'/api/analyze',{method:'POST',body:'[null]'})).status,400);
  assert.equal((await fetch(base+'/%2e%2e%2fREADME.md')).status,403);
 }finally{
  if(server.exitCode===null){server.kill();await once(server,'exit');}
 }
});
