// The workflow is an ordered sequence. Connections are derived from that order.
export function captureWorkflowInputs(skill){
  return new Map(skill.steps.map((step,index)=>{
    const previous=skill.steps[index-1];
    return [step.id,previous?{id:previous.id,title:previous.title,output:previous.output}:{id:'$overall-input',title:'Overall input',output:skill.input}];
  }));
}

export function reviewChangedInputs(skill,before){
  const current=captureWorkflowInputs(skill);
  for(const step of skill.steps){
    const previous=step.inputReview?.previous||before.get(step.id);
    if(!previous)continue; // A new step has no previously reviewed predecessor.
    if(previous.id!==current.get(step.id).id)step.inputReview={previous:{...previous}};
    else delete step.inputReview;
  }
}
