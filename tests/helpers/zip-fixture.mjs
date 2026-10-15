import {deflateRawSync} from 'node:zlib';
import {crc32} from '../../studio/zip.mjs';

// Authored test data only. Unlike the application writer, this can model stream
// descriptors, directories and intentionally inconsistent archive records.
export function zipFixture(entries,{reverseDirectory=false,comment=''}={}){
 const chunks=[],records=[];let offset=0;
 for(const entry of entries){
  const name=Buffer.from(entry.path),data=Buffer.from(entry.data??''),method=entry.method??0,compressed=method===8?deflateRawSync(data):data;
  const crc=crc32(data),flags=0x800|(entry.descriptor?8:0),localExtra=Buffer.from(entry.localExtra??[]),centralExtra=Buffer.from(entry.centralExtra??[]);
  const local=Buffer.alloc(30+name.length+localExtra.length);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(flags,6);local.writeUInt16LE(method,8);
  if(!entry.descriptor){local.writeUInt32LE(crc,14);local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(data.length,22);}
  local.writeUInt16LE(name.length,26);local.writeUInt16LE(localExtra.length,28);name.copy(local,30);localExtra.copy(local,30+name.length);
  let descriptor=Buffer.alloc(entry.descriptor==='signed'?16:entry.descriptor?12:0);
  if(entry.descriptor){const at=entry.descriptor==='signed'?4:0;if(at)descriptor.writeUInt32LE(0x08074b50);descriptor.writeUInt32LE(crc,at);descriptor.writeUInt32LE(compressed.length,at+4);descriptor.writeUInt32LE(data.length,at+8);}
  if(entry.descriptorLength!==undefined)descriptor=descriptor.subarray(0,entry.descriptorLength);
  const central=Buffer.alloc(46+name.length+centralExtra.length);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(flags,8);central.writeUInt16LE(method,10);
  central.writeUInt32LE(crc,16);central.writeUInt32LE(compressed.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(name.length,28);central.writeUInt16LE(centralExtra.length,30);central.writeUInt32LE(offset,42);name.copy(central,46);centralExtra.copy(central,46+name.length);
  records.push({path:entry.path,local:offset,data:offset+local.length,descriptor:offset+local.length+compressed.length,centralRecord:central});
  chunks.push(local,compressed,descriptor);offset+=local.length+compressed.length+descriptor.length;
 }
 const centralStart=offset;
 for(const record of reverseDirectory?[...records].reverse():records){record.central=offset;chunks.push(record.centralRecord);offset+=record.centralRecord.length;}
 const archiveComment=Buffer.from(comment),end=Buffer.alloc(22+archiveComment.length);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(records.length,8);end.writeUInt16LE(records.length,10);end.writeUInt32LE(offset-centralStart,12);end.writeUInt32LE(centralStart,16);end.writeUInt16LE(archiveComment.length,20);archiveComment.copy(end,22);chunks.push(end);
 return {bytes:new Uint8Array(Buffer.concat(chunks)),records,centralStart,end:offset};
}

export function arrayBuffer(bytes){return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);}
