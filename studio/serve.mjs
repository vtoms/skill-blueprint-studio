import {createServer} from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
import {assertLocalRequest,jsonResponse,readJsonRequest} from './http-request.mjs';
import {createSourceAnalysis} from './source-analysis.mjs';
import {openWorkspaceDatabase} from './workspace-database.mjs';
import {createClaudeDrafting} from './claude-drafting.mjs';
import {readWorkspace} from './workspace.mjs';
import {verifyWorkspaceOptimizationEvidence} from './independent-review.mjs';
import {requestOptimization} from './optimization-request.mjs';
import {requestIndependentReview} from './review-request.mjs';

const root=fileURLToPath(new URL('.',import.meta.url));
const port=Number(process.env.STUDIO_PORT||8766);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('STUDIO_PORT must be between 1 and 65535.');
const python=process.env.STUDIO_PYTHON||(process.platform==='win32'?'python':'python3');
const dataDirectory=resolve(process.env.STUDIO_DATA_DIR||resolve(root,'../.local-data'));
console.log('Starting Skill Blueprint Studio… Opening the local database.');
const workspaceDatabase=openWorkspaceDatabase(resolve(dataDirectory,'workspace.sqlite'),{template:resolve(root,'seed/workspace.sqlite')});
const drafting=createClaudeDrafting({dataDirectory});

const localRequest=req=>assertLocalRequest(req,port);
const readDatabaseRequest=(req,limit=140*1024*1024)=>readJsonRequest(req,limit);
const analyzeRequest=createSourceAnalysis({python,script:resolve(root,'analyze_sources.py')});

const server=createServer({requestTimeout:30000,headersTimeout:10000},async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  if(pathname==='/api/skill-review'){
   try{localRequest(req);}catch(error){jsonResponse(res,403,{error:error.message});return;}
   if(req.method!=='POST'){jsonResponse(res,405,{error:'Use POST for independent review.'});return;}
   const controller=new AbortController();res.once('close',()=>{if(!res.writableEnded)controller.abort();});
   try{const input=await readDatabaseRequest(req,16000),result=await requestIndependentReview({readWorkspace:()=>workspaceDatabase.read().workspace,engine:drafting},input,{signal:controller.signal});if(!res.destroyed)jsonResponse(res,200,result);}
   catch(error){if(!res.destroyed)jsonResponse(res,error.status||400,{error:error.message});}return;
  }
  if(pathname==='/api/skill-optimize'){
   try{localRequest(req);}catch(error){jsonResponse(res,403,{error:error.message});return;}
   if(req.method!=='POST'){jsonResponse(res,405,{error:'Use POST for skill optimization.'});return;}
   const controller=new AbortController();res.once('close',()=>{if(!res.writableEnded)controller.abort();});
   try{const input=await readDatabaseRequest(req,16000),result=await requestOptimization({readWorkspace:()=>workspaceDatabase.read().workspace,engine:drafting},input,{signal:controller.signal});if(!res.destroyed)jsonResponse(res,200,result);}
   catch(error){if(!res.destroyed)jsonResponse(res,error.status||400,{error:error.message});}return;
  }
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
   if(req.method==='GET'){try{const current=workspaceDatabase.read();await verifyWorkspaceOptimizationEvidence(current.workspace);jsonResponse(res,200,{...current,storage:{engine:'SQLite',database:workspaceDatabase.path}});}catch(error){jsonResponse(res,500,{error:error.message});}return;}
   if(req.method==='PUT'){
    try{const input=await readDatabaseRequest(req);if(!input||typeof input!=='object')throw new Error('Invalid database request.');const checked=readWorkspace(JSON.stringify(input.workspace));await verifyWorkspaceOptimizationEvidence(checked);const saved=workspaceDatabase.write(checked,input.revision);jsonResponse(res,200,{revision:saved.revision,updatedAt:saved.updatedAt});}
    catch(error){jsonResponse(res,error.status||400,{error:error.message});}return;
   }
   jsonResponse(res,405,{error:'Use GET or PUT for the workspace.'});return;
  }
  if(pathname==='/api/analyze'){
   try{localRequest(req);}catch(error){jsonResponse(res,error.status||403,{error:error.message});return;}
   if(req.method!=='POST'){jsonResponse(res,405,{error:'Use POST for source analysis.'});return;}
   const controller=new AbortController();res.once('close',()=>{if(!res.writableEnded)controller.abort();});
   try{const result=await analyzeRequest(req,{signal:controller.signal});if(!res.destroyed)jsonResponse(res,200,result);}
   catch(error){if(!res.destroyed)jsonResponse(res,error.status||400,{error:error.message});}return;
  }
  const path=resolve(root,'.'+(pathname==='/'?'/dist/skill-blueprint-studio.html':pathname));
  if(path===dataDirectory||path.startsWith(dataDirectory+sep)||/\.sqlite(?:-wal|-shm)?$/i.test(path)){res.writeHead(403);res.end();return;}
  if(!path.startsWith(root.endsWith(sep)?root:root+sep)){res.writeHead(403);res.end();return;}
  const physical=await realpath(path),physicalRoot=await realpath(root);
  if(!physical.startsWith(physicalRoot+sep)){res.writeHead(403);res.end();return;}
  const content=await readFile(physical);
  res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.md':'text/markdown; charset=utf-8','.json':'application/json; charset=utf-8','.zip':'application/zip'}[extname(path)]||'application/octet-stream'),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(content);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log('Skill Blueprint Studio: http://127.0.0.1:'+port+'\nProjects: '+workspaceDatabase.path)).on('error',error=>{workspaceDatabase.close();console.error(error.code==='EADDRINUSE'?'Port '+port+' is already in use. If Studio is already running, use its existing browser tab. Otherwise choose another STUDIO_PORT.':'Studio could not start: '+error.message);process.exitCode=1;});
function shutdown(){server.close(()=>{workspaceDatabase.close();process.exit(0);});}
process.once('SIGINT',shutdown);process.once('SIGTERM',shutdown);
