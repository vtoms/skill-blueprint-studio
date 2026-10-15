import test from 'node:test';
import assert from 'node:assert/strict';
import {zipFixture,arrayBuffer} from '../tests/helpers/zip-fixture.mjs';
import {readZip,writeZip} from './zip.mjs';

test('ZIP32 accepts signed and unsigned descriptors for stored and deflated files in either directory order',async()=>{
 for(const method of [0,8])for(const descriptor of ['signed','unsigned'])for(const reverseDirectory of [false,true]){
  const fixture=zipFixture([{path:'sample/',descriptor},{path:'sample/SKILL.md',data:'# Example\nCafé → review',method,descriptor},{path:'sample/empty.md',descriptor,method}],{reverseDirectory,comment:'Synthetic archive'});
  const files=await readZip(arrayBuffer(fixture.bytes));assert.equal(new TextDecoder().decode(files['sample/SKILL.md']),'# Example\nCafé → review');assert.deepEqual(files['sample/empty.md'],new Uint8Array());assert.equal(Object.hasOwn(files,'sample/'),false);
 }
});

test('an unsigned descriptor whose CRC equals the optional signature remains readable',async()=>{
 // These four bytes have CRC32 0x08074b50, independently checked with Python zlib.
 const data=new Uint8Array([0xac,0x0a,0x7a,0xd5]);
 for(const method of [0,8]){const fixture=zipFixture([{path:'assets/sample.bin',data,method,descriptor:'unsigned'}]);assert.deepEqual((await readZip(arrayBuffer(fixture.bytes)))['assets/sample.bin'],data);}
});

test('missing, truncated and inconsistent descriptors fail even with correct data and central metadata',async()=>{
 for(const method of [0,8])for(const descriptor of ['signed','unsigned']){
  const entry={path:'SKILL.md',data:'# Example',method,descriptor};
  for(const descriptorLength of [0,1,4,8,11,...(descriptor==='signed'?[12,15]:[])]){
   const fixture=zipFixture([{...entry,descriptorLength}]);await assert.rejects(readZip(arrayBuffer(fixture.bytes)),/descriptor/i);
  }
  for(const field of [0,4,8]){
   const fixture=zipFixture([entry]),view=new DataView(fixture.bytes.buffer),at=fixture.records[0].descriptor+(descriptor==='signed'?4:0)+field;view.setUint32(at,view.getUint32(at,true)^1,true);
   await assert.rejects(readZip(arrayBuffer(fixture.bytes)),/descriptor/i);
  }
  const fixture=zipFixture([entry]),view=new DataView(fixture.bytes.buffer);view.setUint32(fixture.records[0].local+14,1,true);await assert.rejects(readZip(arrayBuffer(fixture.bytes)),/local.*mismatch/i);
 }
});

test('explicit and implicit file/directory conflicts are rejected regardless of archive order',async()=>{
 for(const paths of [['sample','sample/'],['sample','sample/child.md'],['sample','sample/deeper/child.md'],['sample/','sample/']])for(const reverse of [false,true]){
  const entries=paths.map(path=>({path,data:''}));if(reverse)entries.reverse();await assert.rejects(readZip(arrayBuffer(zipFixture(entries).bytes)),/conflict|duplicate/i);
 }
 const valid=zipFixture([{path:'sample/child.md',data:'Child'},{path:'sample/'},{path:'sample/deeper/'},{path:'sample/deeper/notes.md',data:'Notes'}],{reverseDirectory:true});
 assert.deepEqual(Object.keys(await readZip(arrayBuffer(valid.bytes))).sort(),['sample/child.md','sample/deeper/notes.md']);
 assert.throws(()=>writeZip({'sample':'File','sample/child.md':'Child'}),/conflict/i);assert.throws(()=>writeZip({'sample/child.md':'Child','sample':'File'}),/conflict/i);
});

test('empty stored and deflated directory entries are verified and omitted; directory payloads and bad checksums fail',async()=>{
 for(const method of [0,8])for(const descriptor of [undefined,'signed','unsigned']){
  const fixture=zipFixture([{path:'references/',method,descriptor},{path:'SKILL.md',data:'# Example'}]);assert.deepEqual(Object.keys(await readZip(arrayBuffer(fixture.bytes))),['SKILL.md']);
  const view=new DataView(fixture.bytes.buffer),record=fixture.records[0];view.setUint32(record.central+16,1,true);
  if(descriptor)view.setUint32(record.descriptor+(descriptor==='signed'?4:0),1,true);else view.setUint32(record.local+14,1,true);
  await assert.rejects(readZip(arrayBuffer(fixture.bytes)),/integrity/i);
  await assert.rejects(readZip(arrayBuffer(zipFixture([{path:'references/',data:'Hidden content',method,descriptor}]).bytes)),/directory/i);
 }
});

test('ZIP32 extra fields are bounded and unsupported ZIP64 metadata fails explicitly',async()=>{
 const ordinaryExtra=[0xfe,0xca,2,0,1,2],fixture=zipFixture([{path:'SKILL.md',data:'# Example',descriptor:'signed',localExtra:ordinaryExtra,centralExtra:ordinaryExtra}]);assert.equal(new TextDecoder().decode((await readZip(arrayBuffer(fixture.bytes)))['SKILL.md']),'# Example');
 for(const field of ['localExtra','centralExtra']){
  for(const extra of [[1,0,0,0],[1,0,8,0,0,0,0,0,0,0,0,0]])await assert.rejects(readZip(arrayBuffer(zipFixture([{path:'SKILL.md',data:'# Example',descriptor:'signed',[field]:extra}]).bytes)),/ZIP64/i);
  for(const extra of [[1],[0xfe,0xca,3,0,1,2]])await assert.rejects(readZip(arrayBuffer(zipFixture([{path:'SKILL.md',data:'# Example',[field]:extra}]).bytes)),/extra field/i);
 }
});

test('bounded deterministic archive mutations either reject the whole input or preserve every file byte',async()=>{
 const expected={'sample/SKILL.md':'# Example\nCafé → review','sample/references/guide.md':'Keep the source.'},fixture=zipFixture([{path:'sample/'},...Object.entries(expected).map(([path,data])=>({path,data,method:8,descriptor:'signed'}))],{comment:'Synthetic fixture'});
 let seed=0x5eed1234,accepted=0,rejected=0;
 for(let i=0;i<256;i++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;const bytes=fixture.bytes.slice();bytes[seed%bytes.length]^=1<<(i%8);
  let files;try{files=await readZip(arrayBuffer(bytes));}catch{rejected++;continue;}
  accepted++;assert.deepEqual(Object.keys(files).sort(),Object.keys(expected).sort());for(const [path,text]of Object.entries(expected))assert.deepEqual(files[path],new TextEncoder().encode(text));
 }
 assert.ok(accepted>0);assert.ok(rejected>0);
 for(let length=0;length<fixture.bytes.length;length++)await assert.rejects(readZip(arrayBuffer(fixture.bytes.subarray(0,length))));
});
