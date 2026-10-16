import {draftResource} from './resources.mjs';
import {uid,sourceBytes,PATHS} from './skill-model.mjs';
import {safePath} from './paths.mjs';

export function originalUse(skill,original){
 if(original.encoding==='unavailable')return null;
 if(/\.md$/i.test(original.path)){
  const path=original.referencePath||original.path;
  if(!safePath(path)||!path.endsWith('.md')||path==='SKILL.md'||Object.values(PATHS).includes(path))return null;
  return {kind:'reference',path,active:skill.references.some(reference=>reference.sourcePath===original.path||reference.path===path)};
 }
 return {kind:'resource',path:original.path,active:skill.resources.some(resource=>resource.sourcePath===original.path)};
}

// Both Original source and the package's source dialog use these actions.
export function originalActionsMarkup(skill,original,button,escape){
 const use=originalUse(skill,original),attributes='data-path="'+escape(original.path)+'"';
 return (use?button(use.active?'In skill':'Use in skill','restore-resource',attributes+(use.active?' disabled':''),'small-button'):'')+button('Download source file','download-source',attributes+(original.encoding==='unavailable'?' disabled':''),'quiet small-button');
}

export function attachmentUses(skill,id){
 const resource=skill.resources.find(item=>item.id===id);
 if(!resource)throw new Error('That supporting file is no longer attached.');
 return {resource,steps:skill.steps.filter(step=>step.resourceIds.includes(id)),dependents:skill.resources.filter(item=>item.id!==id&&item.dependencies.includes(resource.sourcePath))};
}

export function detachAttachment(skill,id){
 const uses=attachmentUses(skill,id);
 skill.resources=skill.resources.filter(resource=>resource.id!==id);
 for(const step of uses.steps){step.resourceIds=step.resourceIds.filter(value=>value!==id);step.reviewed=false;}
 // Keep original bytes and dependency declarations. Missing uses remain visible
 // to validation until the author supplies a replacement or edits the contract.
 return uses;
}

export function restoreAttachment(skill,path){
 const original=skill.originals.find(source=>source.path===path);
 const use=original&&originalUse(skill,original);
 if(!use)throw new Error('Choose an available supporting source file.');
 if(use.active)throw new Error('That file or reference path is already in the skill.');
 if(use.kind==='reference'){
  if(skill.references.length>=100)throw new Error('A skill supports up to 100 reference documents.');
  const content=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(sourceBytes(original));
  const reference={id:uid(),path:use.path,content,sourcePath:path};skill.references.push(reference);return {reference};
 }
 const resource=draftResource(original);skill.resources.push(resource);return resource;
}
