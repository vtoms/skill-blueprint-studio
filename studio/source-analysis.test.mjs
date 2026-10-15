import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createSourceAnalysis,validateAnalysisEntries,ANALYSIS_LIMITS} from './source-analysis.mjs';
import {readJsonRequest} from './http-request.mjs';

function request(value,headers={}){const stream=Readable.from([Buffer.from(JSON.stringify(value))]);stream.headers={'content-type':'application/json',...headers};return stream;}
const entry={path:'scripts/example.py',data:Buffer.from('def example(): return 1').toString('base64')};

test('analysis validates filenames, canonical base64, counts and decoded sizes before invoking Python',async()=>{
 for(const entries of [[null],[{...entry,path:'../bad.py'}],[entry,entry],[{...entry,data:'!!!!'}],[{...entry,data:'YR=='}],Array(121).fill(entry)])assert.throws(()=>validateAnalysisEntries(entries));
 assert.deepEqual(validateAnalysisEntries([entry]),[entry]);
 const tooLarge={...entry,data:Buffer.alloc(ANALYSIS_LIMITS.fileBytes+1).toString('base64')};assert.throws(()=>validateAnalysisEntries([tooLarge]),/8 MB/);
 let runs=0;const analyze=createSourceAnalysis({run:async()=>{runs++;return [];}});
 await assert.rejects(analyze(request([entry],{'content-type':'text/plain'})));await assert.rejects(analyze(request([null])));assert.equal(runs,0);assert.deepEqual(await analyze(request([])),[]);assert.equal(runs,0);
});

test('analysis reserves one slot through body parsing and worker completion; failures and cancellation release it',async()=>{
 const upload=new Readable({read(){}});upload.headers={'content-type':'application/json'};
 const duringUpload=createSourceAnalysis(),uploading=duringUpload(upload);await assert.rejects(duringUpload(request([])),error=>error.status===429);upload.push('[]');upload.push(null);await uploading;
 let release,runs=0;const controller=new AbortController(),analyze=createSourceAnalysis({run:async(_python,_script,_entries,{signal})=>{runs++;assert.equal(signal,controller.signal);return new Promise(resolve=>release=resolve);}});
 const first=analyze(request([entry]),{signal:controller.signal});while(!release)await new Promise(resolve=>setImmediate(resolve));
 await assert.rejects(analyze(request([entry])),error=>error.status===429);assert.equal(runs,1);release([{sourcePath:entry.path}]);await first;assert.deepEqual(await analyze(request([])),[]);
 const failed=createSourceAnalysis({run:async()=>{throw new Error('Failed');}});await assert.rejects(failed(request([entry])));assert.deepEqual(await failed(request([])),[]);
 controller.abort();await assert.rejects(analyze(request([entry]),{signal:controller.signal}),error=>error.status===499);assert.deepEqual(await analyze(request([])),[]);
});

test('JSON limits count bytes, reject oversized declared bodies and do not accept invalid JSON',async()=>{
 await assert.rejects(readJsonRequest(request({}, {'content-length':'999'}),10),error=>error.status===413);
 const bytes=Readable.from([Buffer.from('"'),Buffer.from('éé'),Buffer.from('"')]);bytes.headers={'content-type':'application/json'};await assert.rejects(readJsonRequest(bytes,5),error=>error.status===413);
 const bad=Readable.from([Buffer.from('{bad')]);bad.headers={'content-type':'application/json'};await assert.rejects(readJsonRequest(bad,100),error=>error.status===400);
});
