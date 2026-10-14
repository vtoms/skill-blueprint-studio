import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
import {execFile} from 'node:child_process';
import {openWorkspaceDatabase} from './workspace-database.mjs';
import {createClaudeDrafting} from './claude-drafting.mjs';

const root=fileURLToPath(new URL('.',import.meta.url));
const port=Number(process.env.STUDIO_PORT||8766);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('STUDIO_PORT must be between 1 and 65535.');
const python=process.env.STUDIO_PYTHON||(process.platform==='win32'?'python':'python3');
const dataDirectory=resolve(process.env.STUDIO_DATA_DIR||resolve(root,'../.local-data'));
const workspaceDatabase=openWorkspaceDatabase(resolve(dataDirectory,'workspace.sqlite'),{template:resolve(root,'seed/workspace.sqlite')});
const drafting=createClaudeDrafting({dataDirectory});

function localRequest(req){
 const hosts=['127.0.0.1:'+port,'localhost:'+port];
 if(!hosts.includes(req.headers.host)||req.headers.origin&&!hosts.map(host=>'http://'+host).includes(req.headers.origin)||req.headers['sec-fetch-site']==='cross-site')throw new Error('Use the local application to access its database.');
}
function jsonResponse(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
async function readDatabaseRequest(req,limit=140*1024*1024){
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))throw new Error('Send a JSON database request.');
 const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>limit){const error=new Error('The request exceeds its size limit.');error.status=413;throw error;}chunks.push(chunk);}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function analyzeRequest(req){
  if(req.headers.origin&&!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(req.headers.origin))throw new Error('Unrecognized request origin.');
  let input='';for await(const chunk of req){input+=chunk;if(input.length>20*1024*1024)throw new Error('Analysis input exceeds 20 MB.');}
  const entries=JSON.parse(input);
  if(!Array.isArray(entries)||entries.length>500||entries.some(e=>!e||typeof e.path!=='string'||e.path.length>240||typeof e.data!=='string'))throw new Error('Invalid analysis request.');
  return new Promise((resolveResult,reject)=>{
    const child=execFile(python,['-X','utf8',resolve(root,'analyze_sources.py'),'--stdin'],{timeout:30000,maxBuffer:16*1024*1024,windowsHide:true,encoding:'utf8'},(error,stdout,stderr)=>error?reject(new Error(stderr.slice(0,300)||'Source analyzer unavailable. Install Python or set STUDIO_PYTHON.')):resolveResult(stdout));
    child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(entries));
  });
}
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  if(pathname==='/api/skill-draft'){
   try{localRequest(req);}catch(error){jsonResponse(res,403,{error:error.message});return;}
   if(req.method==='GET'){jsonResponse(res,200,await drafting.status(true));return;}
   if(req.method==='POST'){
    const controller=new AbortController();res.once('close',()=>{if(!res.writableEnded)controller.abort();});
    try{const input=await readDatabaseRequest(req,100000),skill=await drafting.generate(input,{signal:controller.signal});if(!res.destroyed)jsonResponse(res,200,{skill});}
    catch(error){if(!res.destroyed)jsonResponse(res,error.status||400,{error:error.message});}return;
   }
   jsonResponse(res,405,{error:'Use GET or POST for skill drafting.'});return;
  }
  if(pathname==='/api/workspace'){
   try{localRequest(req);}catch(error){jsonResponse(res,403,{error:error.message});return;}
   if(req.method==='GET'){jsonResponse(res,200,{...workspaceDatabase.read(),storage:{engine:'SQLite',database:workspaceDatabase.path}});return;}
   if(req.method==='PUT'){
    try{const input=await readDatabaseRequest(req);if(!input||typeof input!=='object')throw new Error('Invalid database request.');const saved=workspaceDatabase.write(input.workspace,input.revision);jsonResponse(res,200,{revision:saved.revision,updatedAt:saved.updatedAt});}
    catch(error){jsonResponse(res,error.status||400,{error:error.message});}return;
   }
   jsonResponse(res,405,{error:'Use GET or PUT for the workspace.'});return;
  }
  if(pathname==='/api/analyze'&&req.method==='POST'){
   try{const result=await analyzeRequest(req);res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(result);}
   catch(error){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:error.message}));}
   return;
  }
  const path=resolve(root,'.'+(pathname==='/'?'/dist/skill-blueprint-studio.html':pathname));
  if(path===dataDirectory||path.startsWith(dataDirectory+sep)||/\.sqlite(?:-wal|-shm)?$/i.test(path)){res.writeHead(403);res.end();return;}
  if(!path.startsWith(root.endsWith(sep)?root:root+sep)){res.writeHead(403);res.end();return;}
  const content=await readFile(path);
  res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.md':'text/markdown; charset=utf-8','.json':'application/json; charset=utf-8','.zip':'application/zip'}[extname(path)]||'application/octet-stream'),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(content);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log('Skill Blueprint Studio: http://127.0.0.1:'+port+'\nProjects: '+workspaceDatabase.path));
function shutdown(){server.close(()=>{workspaceDatabase.close();process.exit(0);});}
process.once('SIGINT',shutdown);process.once('SIGTERM',shutdown);
