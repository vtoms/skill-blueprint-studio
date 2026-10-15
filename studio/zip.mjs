import {safePath} from './paths.mjs';
export function crc32(data){let crc=0xffffffff;for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
export function writeZip(files){const enc=new TextEncoder(),locals=[],centrals=[];let offset=0;for(const [name,content]of Object.entries(files)){if(!safePath(name))throw new Error('Unsafe export path.');const nb=enc.encode(name),data=typeof content==='string'?enc.encode(content):content;if(!(data instanceof Uint8Array))throw new Error('Unsupported ZIP file data.');const crc=crc32(data),head=new Uint8Array(30+nb.length),v=new DataView(head.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,nb.length,true);head.set(nb,30);locals.push(head,data);const cen=new Uint8Array(46+nb.length),c=new DataView(cen.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,nb.length,true);c.setUint32(42,offset,true);cen.set(nb,46);centrals.push(cen);offset+=head.length+data.length;}const size=centrals.reduce((a,b)=>a+b.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,centrals.length,true);v.setUint16(10,centrals.length,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);return new Blob([...locals,...centrals,end],{type:'application/zip'});}
export async function readZip(buffer){
 const bytes=new Uint8Array(buffer),view=new DataView(buffer),decoder=new TextDecoder('utf-8',{fatal:true});
 if(bytes.length>8*1024*1024)throw new Error('Import archives up to 8 MB.');
 let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){
  if(view.getUint32(i,true)===0x06054b50&&i+22+view.getUint16(i+20,true)===bytes.length){end=i;break;}
 }
 if(end<0)throw new Error('This is not a readable ZIP archive.');
 if(view.getUint16(end+4,true)||view.getUint16(end+6,true))throw new Error('Multi-volume ZIP archives are unsupported.');
 const count=view.getUint16(end+10,true),centralSize=view.getUint32(end+12,true),centralStart=view.getUint32(end+16,true),centralEnd=centralStart+centralSize;
 if(count>120||view.getUint16(end+8,true)!==count)throw new Error('Import a single skill with up to 120 files.');
 if(centralEnd!==end)throw new Error('Malformed ZIP directory bounds.');
 const files=Object.create(null),names=new Set(),ranges=[];let cursor=centralStart,total=0;
 for(let i=0;i<count;i++){
  if(cursor+46>centralEnd||view.getUint32(cursor,true)!==0x02014b50)throw new Error('Malformed ZIP directory.');
  const flags=view.getUint16(cursor+8,true),method=view.getUint16(cursor+10,true),crc=view.getUint32(cursor+16,true),compressed=view.getUint32(cursor+20,true),size=view.getUint32(cursor+24,true),nameLength=view.getUint16(cursor+28,true),extraLength=view.getUint16(cursor+30,true),commentLength=view.getUint16(cursor+32,true),offset=view.getUint32(cursor+42,true),next=cursor+46+nameLength+extraLength+commentLength;
  if(next>centralEnd||view.getUint16(cursor+34,true)!==0)throw new Error('Malformed ZIP filename or disk reference.');
  const path=decoder.decode(bytes.subarray(cursor+46,cursor+46+nameLength)),directory=path.endsWith('/');cursor=next;
  if(!safePath(directory?path.slice(0,-1):path)||names.has(path))throw new Error('Unsafe or duplicate file path in ZIP: '+path);
  names.add(path);
  if(flags&0x41)throw new Error('Encrypted ZIP archives are unsupported.');
  if(![0,8].includes(method))throw new Error('Unsupported ZIP compression; use a standard stored or deflated ZIP.');
  total+=size;if(size>2*1024*1024||total>8*1024*1024)throw new Error('Expanded skill exceeds the 8 MB import limit.');
  if(offset+30>centralStart||view.getUint32(offset,true)!==0x04034b50)throw new Error('Malformed ZIP file entry.');
  const localNameLength=view.getUint16(offset+26,true),localExtra=view.getUint16(offset+28,true),start=offset+30+localNameLength+localExtra,stop=start+compressed;
  if(start>centralStart||stop>centralStart)throw new Error('Truncated or overlapping ZIP file data.');
  if(view.getUint16(offset+6,true)!==flags||view.getUint16(offset+8,true)!==method||decoder.decode(bytes.subarray(offset+30,offset+30+localNameLength))!==path)throw new Error('ZIP local header mismatch.');
  if(!(flags&8)&&[crc,compressed,size].some((value,index)=>view.getUint32(offset+14+index*4,true)!==value))throw new Error('ZIP local size or checksum mismatch.');
  if(ranges.some(range=>offset<range.stop&&stop>range.start))throw new Error('Overlapping ZIP entries.');
  ranges.push({start:offset,stop});
  if(directory){if(size||compressed)throw new Error('ZIP directory contains file data.');continue;}
  const data=bytes.subarray(start,stop);let expanded;
  if(method===0)expanded=data.slice();
  else{
   let stream;try{stream=new DecompressionStream('deflate-raw');}catch{throw new Error('This browser cannot expand compressed ZIPs. Use an uncompressed ZIP or import SKILL.md.');}
   const reader=new Blob([data]).stream().pipeThrough(stream).getReader(),chunks=[];let length=0;
   try{while(true){const result=await reader.read();if(result.done)break;length+=result.value.length;if(length>size||length>2*1024*1024)throw new Error('ZIP entry expands beyond its declared size.');chunks.push(result.value);}}
   catch(error){await reader.cancel().catch(()=>{});throw error;}
   expanded=new Uint8Array(length);let at=0;for(const chunk of chunks){expanded.set(chunk,at);at+=chunk.length;}
  }
  if(expanded.length!==size||crc32(expanded)!==crc)throw new Error('ZIP integrity check failed for '+path);
  files[path]=expanded;
 }
 if(cursor!==centralEnd)throw new Error('ZIP directory entry count mismatch.');
 return files;
}
