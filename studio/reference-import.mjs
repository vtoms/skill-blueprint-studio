import {uid,preserveSource,PATHS} from './skill-model.mjs';
import {safePath} from './paths.mjs';

// Loading files happens outside this function. Validate the whole selection
// before changing the skill so a rejected file cannot leave a partial import.
export function importReferenceSources(skill,files){
 if(skill.references.length+files.length>100)throw new Error('A skill supports up to 100 reference documents.');
 const paths=new Set(skill.references.map(reference=>reference.path)),originalPaths=new Set(skill.originals.map(source=>source.path));
 const entries=files.map(file=>{
  const path='references/'+file.name;
  if(!safePath(path)||/[\\/]/.test(file.name)||!file.name.endsWith('.md')||!(file.bytes instanceof Uint8Array)||file.bytes.length>2*1024*1024)throw new Error('Choose UTF-8 Markdown files up to 2 MB each.');
  if(paths.has(path)||Object.values(PATHS).includes(path))throw new Error('A reference with that name already exists or is reserved. Rename the incoming file.');
  paths.add(path);
  let sourcePath=path;
  if(originalPaths.has(sourcePath))sourcePath='reference-imports/'+uid()+'/'+file.name;
  if(!safePath(sourcePath))throw new Error('The source history path is too long. Shorten the incoming filename before importing it again.');
  originalPaths.add(sourcePath);
  const original={...preserveSource(sourcePath,file.bytes),referencePath:path};
  return {original,reference:{id:uid(),path,content:original.content,sourcePath}};
 });
 skill.originals.push(...entries.map(entry=>entry.original));
 skill.references.push(...entries.map(entry=>entry.reference));
 return entries.map(entry=>entry.reference);
}
