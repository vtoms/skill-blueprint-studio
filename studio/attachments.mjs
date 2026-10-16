import {draftResource} from './resources.mjs';

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
 if(!original||/\.md$/i.test(path)||original.encoding==='unavailable')throw new Error('Choose an available supporting source file.');
 if(skill.resources.some(resource=>resource.sourcePath===path))throw new Error('That file is already attached.');
 const resource=draftResource(original);skill.resources.push(resource);return resource;
}
