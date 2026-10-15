import {execFile} from 'node:child_process';
import {HttpError,readJsonRequest} from './http-request.mjs';
import {safePath} from './paths.mjs';

export const ANALYSIS_LIMITS={requestBytes:12*1024*1024,fileBytes:8*1024*1024,totalBytes:8*1024*1024,files:120,timeout:30000,outputBytes:16*1024*1024};

export function validateAnalysisEntries(entries){
 if(!Array.isArray(entries)||entries.length>ANALYSIS_LIMITS.files)throw new HttpError(400,'Analyze up to 120 source files at a time.');
 const seen=new Set();let total=0;
 for(const entry of entries){
  if(!entry||typeof entry!=='object'||Object.keys(entry).some(key=>!['path','data'].includes(key))||!safePath(entry.path)||seen.has(entry.path)||typeof entry.data!=='string'||entry.data.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(entry.data))throw new HttpError(400,'Use unique safe source paths and valid base64 data.');
  seen.add(entry.path);const bytes=Buffer.from(entry.data,'base64');
  if(bytes.toString('base64')!==entry.data)throw new HttpError(400,'Use canonical base64 source data.');
  total+=bytes.length;if(bytes.length>ANALYSIS_LIMITS.fileBytes||total>ANALYSIS_LIMITS.totalBytes)throw new HttpError(413,'Source analysis accepts up to 8 MB of decoded files.');
 }
 return entries;
}

export function runSourceAnalyzer(python,script,entries,{signal}={}){
 return new Promise((resolve,reject)=>{
  const child=execFile(python,['-X','utf8',script,'--stdin'],{signal,timeout:ANALYSIS_LIMITS.timeout,maxBuffer:ANALYSIS_LIMITS.outputBytes,windowsHide:true,encoding:'utf8'},(error,stdout)=>{
   if(error){reject(new HttpError(error.name==='AbortError'?499:422,error.name==='AbortError'?'Source analysis was cancelled.':'Source analysis could not finish within its limits. Check the files and Python configuration.'));return;}
   try{const result=JSON.parse(stdout);if(!Array.isArray(result))throw new Error();resolve(result);}catch{reject(new HttpError(502,'The source analyzer returned an invalid result.'));}
  });
  child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(entries));
 });
}

export function createSourceAnalysis({python,script,run=runSourceAnalyzer}={}){
 let busy=false;
 return async function analyzeRequest(req,{signal}={}){
  // Reserve before reading the body, so concurrent uploads cannot each buffer and spawn.
  if(busy)throw new HttpError(429,'Another source analysis is running. Wait for it to finish, then retry.');
  busy=true;
  try{const entries=validateAnalysisEntries(await readJsonRequest(req,ANALYSIS_LIMITS.requestBytes));if(signal?.aborted)throw new HttpError(499,'Source analysis was cancelled.');return entries.length?await run(python,script,entries,{signal}):[];}
  finally{busy=false;}
 };
}
