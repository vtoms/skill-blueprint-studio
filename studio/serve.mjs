import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
import {execFile} from 'node:child_process';

const root=fileURLToPath(new URL('.',import.meta.url));
const port=Number(process.env.STUDIO_PORT||8766);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('STUDIO_PORT must be between 1 and 65535.');
const python=process.env.STUDIO_PYTHON||(process.platform==='win32'?'python':'python3');

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
createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  if(pathname==='/api/analyze'&&req.method==='POST'){
   try{const result=await analyzeRequest(req);res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(result);}
   catch(error){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:error.message}));}
   return;
  }
  const path=resolve(root,'.'+(pathname==='/'?'/dist/skill-blueprint-studio.html':pathname));
  if(!path.startsWith(root.endsWith(sep)?root:root+sep)){res.writeHead(403);res.end();return;}
  const content=await readFile(path);
  res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.md':'text/markdown; charset=utf-8','.json':'application/json; charset=utf-8','.zip':'application/zip'}[extname(path)]||'application/octet-stream'),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(content);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log('Skill Blueprint Studio: http://127.0.0.1:'+port));
