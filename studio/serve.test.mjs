import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';

test('local server serves the app and analyzes source as data with origin checks',async()=>{
 const probe=createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');
 const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
 const server=spawn(process.execPath,[fileURLToPath(new URL('./serve.mjs',import.meta.url))],{env:{...process.env,STUDIO_PORT:String(port)},windowsHide:true,stdio:['ignore','pipe','pipe']});
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
