import {verifyOptimizationEvidence} from './independent-review.mjs';
import {workspaceSkill} from './workspace.mjs';
import {optimizationDigest} from './skill-optimization.mjs';

export async function requestOptimization({readWorkspace,engine},input,{signal}={}){
 const conflict=()=>{const error=new Error('The source skill changed or is no longer available. Reload its saved version before optimizing.');error.status=409;throw error;};
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['projectId','skillId','sourceDigest','goals','allowResequence','checkOnly'].includes(key))||['projectId','skillId'].some(key=>typeof input[key]!=='string'||!input[key]||input[key].length>150)||typeof input.sourceDigest!=='string'||!/^[a-f0-9]{64}$/.test(input.sourceDigest)||input.checkOnly!==undefined&&typeof input.checkOnly!=='boolean'||input.goals!==undefined&&(typeof input.goals!=='string'||input.goals.length>4000)||input.allowResequence!==undefined&&typeof input.allowResequence!=='boolean')throw new Error('Invalid skill optimization request.');
 const source=workspaceSkill(readWorkspace(),input.projectId,input.skillId);
 if(!source||await optimizationDigest(source)!==input.sourceDigest)conflict();
 await verifyOptimizationEvidence(source);
 if(input.checkOnly)return {sourceDigest:input.sourceDigest};
 const skill=await engine.optimize(source,{goals:input.goals||'',allowResequence:input.allowResequence??true},{signal});
 const latest=workspaceSkill(readWorkspace(),input.projectId,input.skillId);
 if(!latest||await optimizationDigest(latest)!==input.sourceDigest)conflict();
 return {skill};
}
