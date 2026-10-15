// Validate persisted proposal evidence without a dependency on the model or server.
export function validateOptimizationRecord(record,readSkill){
 const fail=()=>{throw new Error('Invalid optimization version metadata.');};
 const string=(value,max=12000)=>typeof value==='string'&&value.length<=max;
 const keys=['schemaVersion','provider','model','createdAt','sourceId','sourceRevision','sourceDigest','baselineDigest','baseline','goals','allowResequence','summary','assumptions','questions','mapping','reviewed','proposalSnapshot'];
 if(!record||typeof record!=='object'||Array.isArray(record)||Object.keys(record).some(key=>!keys.includes(key))||keys.some(key=>!Object.hasOwn(record,key)))fail();
 if(record.schemaVersion!==1||record.provider!=='claude-cli'||!string(record.model,1000)||!string(record.sourceId,150)||!record.sourceId||!Number.isSafeInteger(record.sourceRevision)||record.sourceRevision<1||!Number.isFinite(Date.parse(record.createdAt))||!string(record.createdAt,100)||!string(record.goals,4000)||!string(record.summary,4000)||typeof record.allowResequence!=='boolean'||typeof record.reviewed!=='boolean'||!/^[a-f0-9]{64}$/.test(record.sourceDigest)||!/^[a-f0-9]{64}$/.test(record.baselineDigest))fail();
 if(!record.baseline||Object.hasOwn(record.baseline,'optimization')||Object.hasOwn(record.baseline,'independentReview'))fail();
 const baseline=readSkill(JSON.stringify(record.baseline));
 if(baseline.id!==record.sourceId||baseline.revision!==record.sourceRevision||!baseline.steps.length)fail();
 if(!Array.isArray(record.assumptions)||record.assumptions.length>200||record.assumptions.some(text=>!string(text))||!Array.isArray(record.questions)||record.questions.length>200||record.questions.some(question=>!question||Object.keys(question).some(key=>!['id','text','answer','definitionId'].includes(key))||!string(question.id,150)||!question.id||!string(question.text)||!string(question.answer)||!string(question.definitionId,150))||new Set(record.questions.map(question=>question.id)).size!==record.questions.length)fail();
 const snapshot=record.proposalSnapshot;
 if(!snapshot||Object.keys(snapshot).length!==2||!string(snapshot.instructions)||!Array.isArray(snapshot.steps)||!snapshot.steps.length||snapshot.steps.length>100)fail();
 // Baseline coordinates refer to the source identities, not the new proposal steps.
 const proposalValue={...baseline,instructions:snapshot.instructions,steps:snapshot.steps};delete proposalValue.diagram;
 const proposal=readSkill(JSON.stringify(proposalValue));
 const oldSteps=new Map(baseline.steps.map(step=>[step.id,step])),oldFacets=new Map(baseline.steps.flatMap(step=>step.facets.map(facet=>[facet.id,{step,facet}]))),seenSteps=new Set(),seenFacets=new Set(),proposalIds=new Set(),facetIds=new Set();
 if(oldSteps.size!==baseline.steps.length||oldFacets.size!==baseline.steps.reduce((total,step)=>total+step.facets.length,0)||!Array.isArray(record.mapping)||record.mapping.length!==proposal.steps.length||!record.allowResequence&&proposal.steps.length!==baseline.steps.length)fail();
 const equalSet=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===new Set(a).size&&a.length===new Set(b).size&&a.every(value=>b.includes(value));
 for(let index=0;index<proposal.steps.length;index++){
  const step=proposal.steps[index],mapping=record.mapping[index];
  if(proposalIds.has(step.id)||oldSteps.has(step.id)||step.reviewed!==false||step.inputReview)fail();proposalIds.add(step.id);
  if(!mapping||Object.keys(mapping).some(key=>!['stepId','sourceStepIds','reason','handoff','facetSources'].includes(key))||mapping.stepId!==step.id||!string(mapping.reason,4000)||!string(mapping.handoff,4000)||!Array.isArray(mapping.sourceStepIds)||!mapping.sourceStepIds.length||mapping.sourceStepIds.length>100||new Set(mapping.sourceStepIds).size!==mapping.sourceStepIds.length||mapping.sourceStepIds.some(id=>!oldSteps.has(id)))fail();
  if(!record.allowResequence&&(mapping.sourceStepIds.length!==1||mapping.sourceStepIds[0]!==baseline.steps[index].id))fail();
  const mapped=mapping.sourceStepIds.map(id=>oldSteps.get(id));mapped.forEach(step=>seenSteps.add(step.id));
  if(!equalSet(step.references,mapped.flatMap(step=>step.references))||!equalSet(step.resourceIds,mapped.flatMap(step=>step.resourceIds))||!Array.isArray(mapping.facetSources)||mapping.facetSources.length!==step.facets.length)fail();
  step.facets.forEach((facet,i)=>{
   const link=mapping.facetSources[i];if(!link||Object.keys(link).length!==2||link.facetId!==facet.id||!string(link.sourceFacetId,150)||facetIds.has(facet.id)||oldFacets.has(facet.id))fail();facetIds.add(facet.id);
   if(!link.sourceFacetId){if(facet.type!=='Instruction'||facet.definitionId||facet.override||facet.connection||facet.operation)fail();return;}
   const original=oldFacets.get(link.sourceFacetId);if(!original||seenFacets.has(link.sourceFacetId)||!mapping.sourceStepIds.includes(original.step.id))fail();seenFacets.add(link.sourceFacetId);
   for(const key of ['type','definitionId','override','connection','operation'])if((facet[key]||'')!==(original.facet[key]||''))fail();
  });
 }
 if(seenSteps.size!==oldSteps.size||seenFacets.size!==oldFacets.size)fail();
 return record;
}
