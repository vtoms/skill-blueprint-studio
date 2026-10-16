import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';

export const repositoryRoot=fileURLToPath(new URL('../../',import.meta.url));

export async function startTestBrowser(t){
 const browser=await chromium.launch({headless:true,...(process.env.STUDIO_BROWSER_EXECUTABLE?{executablePath:process.env.STUDIO_BROWSER_EXECUTABLE}:{})});
 t.after(async()=>{if(browser.isConnected())await browser.close();});return browser;
}

export async function startTestServer(t){
 const dataDirectory=await mkdtemp(join(tmpdir(),'blueprint-browser-test-'));let child,closed=false;
 async function close(){
  if(closed)return;closed=true;
  if(child&&child.exitCode===null){const stopped=once(child,'exit');child.kill();await stopped;}
  if(dirname(dataDirectory)!==resolve(tmpdir())||!basename(dataDirectory).startsWith('blueprint-browser-test-'))throw new Error('Unsafe test cleanup path.');
  await rm(dataDirectory,{recursive:true,force:true});
 }
 t.after(close);
 const probe=createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
 child=spawn(process.execPath,[join(repositoryRoot,'studio/serve.mjs')],{cwd:repositoryRoot,env:{...process.env,STUDIO_PORT:String(port),STUDIO_DATA_DIR:dataDirectory,STUDIO_CLAUDE_PATH:'missing-browser-test-cli'},windowsHide:true,stdio:['ignore','pipe','pipe']});
 let errors='';child.stderr.on('data',data=>errors+=data);
 await new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(new Error('Test server did not start: '+errors)),10000);
  let startupOutput='';child.stdout.on('data',data=>{startupOutput+=data;if(startupOutput.includes('Skill Blueprint Studio: http://127.0.0.1:')){clearTimeout(timeout);resolve();}});
  child.once('error',error=>{clearTimeout(timeout);reject(error);});child.once('exit',code=>{clearTimeout(timeout);reject(new Error('Test server exited '+code+': '+errors));});
 });
 const base='http://127.0.0.1:'+port;
 return {base,dataDirectory,async read(){const response=await fetch(base+'/api/workspace');if(!response.ok)throw new Error(await response.text());return (await response.json()).workspace;},async seed(workspace){const current=await (await fetch(base+'/api/workspace')).json(),response=await fetch(base+'/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:current.revision,workspace})});if(!response.ok)throw new Error(await response.text());},close};
}
