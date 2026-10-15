export const DIAGRAM_STEP_SIZE={width:248,height:160};
export const DIAGRAM_BOUNDARY_SIZE={width:176,height:74};

export function autoDiagramPositions(steps){const columns=steps.length<=6?2:steps.length<=12?3:Math.ceil(Math.sqrt(steps.length));return steps.map((step,index)=>{const row=Math.floor(index/columns),column=row%2?columns-1-index%columns:index%columns;return {stepId:step.id,x:72+column*356,y:160+row*220};});}
export function diagramPositions(skill){const ids=new Set(skill.steps.map(step=>step.id)),saved=new Map((skill.diagram?.positions||[]).filter(position=>ids.has(position.stepId)).map(position=>[position.stepId,position])),occupied=[...saved.values()];return autoDiagramPositions(skill.steps).map(position=>{if(saved.has(position.stepId))return {...saved.get(position.stepId)};const candidate={...position};for(let attempt=0;occupied.some(other=>Math.abs(other.x-candidate.x)<DIAGRAM_STEP_SIZE.width+24&&Math.abs(other.y-candidate.y)<DIAGRAM_STEP_SIZE.height+24)&&attempt<1000;attempt++){candidate.y+=220;if(candidate.y>50000){candidate.y=160;candidate.x=(candidate.x+356)%49900;}}occupied.push(candidate);return candidate;});}
export function reconcileDiagramLayout(skill){if(skill.diagram)skill.diagram={schemaVersion:1,positions:diagramPositions(skill)};return skill;}
export function validateDiagramLayout(skill){
 const diagram=skill.diagram;if(diagram===undefined)return;
 if(!diagram||Object.keys(diagram).some(key=>!['schemaVersion','positions'].includes(key))||diagram.schemaVersion!==1||!Array.isArray(diagram.positions)||diagram.positions.length>skill.steps.length)throw new Error('Invalid workflow diagram layout.');
 const ids=new Set(skill.steps.map(step=>step.id)),seen=new Set();for(const position of diagram.positions){if(!position||Object.keys(position).some(key=>!['stepId','x','y'].includes(key))||!ids.has(position.stepId)||seen.has(position.stepId)||['x','y'].some(key=>typeof position[key]!=='number'||!Number.isFinite(position[key])||position[key]<0||position[key]>50000))throw new Error('Invalid workflow diagram position.');seen.add(position.stepId);}
}
export function diagramGeometry(skill,positions=diagramPositions(skill)){
 const nodes=positions.map(position=>({...position,...DIAGRAM_STEP_SIZE})),first=nodes[0],last=nodes.at(-1);
 const start={id:'diagram-input',x:first?first.x+36:72,y:first?Math.max(16,first.y-128):24,...DIAGRAM_BOUNDARY_SIZE};
 const end={id:'diagram-output',x:last?last.x+36:72,y:last?last.y+DIAGRAM_STEP_SIZE.height+50:160,...DIAGRAM_BOUNDARY_SIZE};
 const all=[start,...nodes,end],bounds={left:Math.max(0,Math.min(...all.map(node=>node.x))-40),top:Math.max(0,Math.min(...all.map(node=>node.y))-24),right:Math.max(...all.map(node=>node.x+node.width))+40,bottom:Math.max(...all.map(node=>node.y+node.height))+40};
 return {nodes,start,end,bounds,edges:all.slice(0,-1).map((node,index)=>({from:node,to:all[index+1],index}))};
}
export function diagramConnector(from,to){
 const dx=to.x+to.width/2-from.x-from.width/2,dy=to.y+to.height/2-from.y-from.height/2;let start,end,path,midpoint;
 if(Math.abs(dx)>Math.abs(dy)*1.1){const forward=dx>=0;start={x:from.x+(forward?from.width:0),y:from.y+from.height/2};end={x:to.x+(forward?0:to.width),y:to.y+to.height/2};const middle=(start.x+end.x)/2;path=`M ${start.x} ${start.y} H ${middle} V ${end.y} H ${end.x}`;midpoint={x:middle,y:(start.y+end.y)/2};}
 else{const forward=dy>=0;start={x:from.x+from.width/2,y:from.y+(forward?from.height:0)};end={x:to.x+to.width/2,y:to.y+(forward?0:to.height)};const middle=(start.y+end.y)/2;path=`M ${start.x} ${start.y} V ${middle} H ${end.x} V ${end.y}`;midpoint={x:(start.x+end.x)/2,y:middle};}
 return {path,start,end,midpoint};
}
