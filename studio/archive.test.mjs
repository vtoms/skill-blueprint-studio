import test from 'node:test';
import assert from 'node:assert/strict';
import {writeZip,readZip} from './zip.mjs';
import {compile,importMarkdownFiles,sourceBytes} from './core.mjs';
import {safePath,resolveRelative,relocateLinks} from './paths.mjs';

test('special object-key filenames survive ZIP, import, source backup and compiler output without prototype changes',async()=>{
 const data=Object.fromEntries([['SKILL.md','# Example\n\n## Review\nInspect records.'],...['__proto__','constructor','toString'].map(name=>[name,new Uint8Array([0,255,1])])]);
 const before=Object.getPrototypeOf({}),files=await readZip(await writeZip(data).arrayBuffer());assert.equal(Object.getPrototypeOf(files),null);assert.deepEqual(Object.keys(files),Object.keys(data));assert.equal(Object.getPrototypeOf({}),before);
 const skill=importMarkdownFiles(files),compiled=compile(skill,{allowInvalid:true});
 for(const name of ['__proto__','constructor','toString']){assert.ok(Object.hasOwn(files,name));assert.deepEqual(sourceBytes(skill.originals.find(file=>file.path===name)),data[name]);assert.deepEqual(compiled[name],data[name]);}
 const restored=await readZip(await writeZip(compiled).arrayBuffer());assert.deepEqual(restored.__proto__,data.__proto__);
});

test('malformed ZIP counts, local metadata, bounds, encryption and truncated data fail as a whole',async()=>{
 const original=new Uint8Array(await writeZip({'SKILL.md':'# Example'}).arrayBuffer());
 const reject=async change=>{const bytes=original.slice(),view=new DataView(bytes.buffer),end=bytes.length-22,central=view.getUint32(end+16,true);change(view,{end,central});await assert.rejects(readZip(bytes.buffer));};
 await reject((view,{end})=>view.setUint16(end+8,2,true));
 await reject((view,{end})=>{view.setUint16(end+8,0,true);view.setUint16(end+10,0,true);});
 await reject(view=>view.setUint16(8,8,true));
 await reject(view=>view.setUint32(18,999999,true));
 await reject((view,{central})=>view.setUint16(central+8,0x801,true));
 await reject((view,{central})=>view.setUint32(central+42,central,true));
 await reject((view,{central})=>view.setUint32(central+24,2*1024*1024+1,true));
 for(const length of [0,5,21,original.length-1])await assert.rejects(readZip(original.slice(0,length).buffer));
});

test('duplicate ZIP names are rejected even when they are special dictionary keys',async()=>{
 const bytes=new Uint8Array(await writeZip(Object.fromEntries([['__proto__','a'],['__protx__','b']])).arrayBuffer());
 const pattern=new TextEncoder().encode('__protx__'),replacement=new TextEncoder().encode('__proto__');
 for(let i=0;i<=bytes.length-pattern.length;i++)if(pattern.every((byte,index)=>bytes[i+index]===byte))bytes.set(replacement,i);
 await assert.rejects(readZip(bytes.buffer),/duplicate/);
});

test('literal Unicode and percent filenames are preserved; decoded URL links cannot escape or use backslashes',async()=>{
 const names=['references/Café.md','references/Cafe\u0301.md','references/%2e.md'];
 const files=await readZip(await writeZip(Object.fromEntries(names.map(name=>[name,'Content']))).arrayBuffer());assert.deepEqual(Object.keys(files),names);
 for(const path of ['../x.md','/x.md','X:/example.md','a\\b.md','a/./b.md','a/../b.md','a//b.md','a/\u0000b'])assert.equal(safePath(path),false,path);
 for(const target of ['%2e%2e/x.md','%2fprivate.md','a%5cb.md','a%00b.md','%zz'])assert.equal(resolveRelative('SKILL.md',target),'__invalid__',target);
 assert.equal(relocateLinks('[guide](references/Caf%C3%A9.md#part)','SKILL.md','references/process.md'),'[guide](Caf%C3%A9.md#part)');
 assert.equal(resolveRelative('references/process.md','../assets/data.csv'),'assets/data.csv');
 assert.equal(resolveRelative('SKILL.md','https://example.com/a.md'),null);
});
