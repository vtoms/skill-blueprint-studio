import test from 'node:test';
import assert from 'node:assert/strict';
import {blankProject,newStep,readProject,copy} from './core.mjs';
import {autoDiagramPositions,diagramPositions,reconcileDiagramLayout,diagramGeometry,diagramConnector,diagramHandoff} from './diagram-layout.mjs';
import {reviewSnapshot,independentReviewState} from './independent-review.mjs';
import {syntheticReviewForGateTestsOnly} from './review-test-support.mjs';
import {optimizationSource,optimizationProposal} from './optimization-test-support.mjs';
import {skillFromOptimization} from './skill-optimization.mjs';

function diagramSkill(){const skill=blankProject('Example process');skill.steps=['Collect','Review','Summarize','Present'].map(newStep);return skill;}
test('handoff labels stay outside shapes in normal and reverse layouts; START prefers an upper lane',()=>{
 const skill=diagramSkill();
 for(const positions of [autoDiagramPositions(skill.steps),skill.steps.map((step,index)=>({stepId:step.id,x:72,y:160+(3-index)*220}))]){
  const graph=diagramGeometry(skill,positions),obstacles=[graph.start,...graph.nodes,graph.end];
  assert.ok(graph.start.y<graph.nodes[0].y);
  for(const edge of graph.edges){const point=diagramHandoff(edge,obstacles);if(!point.label)continue;const rect={x:point.x+point.label.x,y:point.y+point.label.y,width:point.label.width,height:24};assert.ok(obstacles.every(node=>rect.x>=node.x+node.width||rect.x+rect.width<=node.x||rect.y>=node.y+node.height||rect.y+rect.height<=node.y));}
 }
});
test('start and finish boundaries avoid shapes after reverse spatial arrangement',()=>{
 const skill=diagramSkill(),positions=skill.steps.map((step,index)=>({stepId:step.id,x:72,y:160+(3-index)*220})),graph=diagramGeometry(skill,positions);
 const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
 for(const boundary of [graph.start,graph.end])assert.ok(graph.nodes.every(node=>!overlap(boundary,node)));
 assert.equal(overlap(graph.start,graph.end),false);assert.deepEqual(graph.nodes.map(node=>node.stepId),skill.steps.map(step=>step.id));
});
test('diagram layout is spatial, preserves execution order and restores custom positions',()=>{
 const skill=diagramSkill(),order=skill.steps.map(step=>step.id),positions=autoDiagramPositions(skill.steps);assert.notEqual(positions[0].x,positions[1].x);assert.notEqual(positions[1].y,positions[2].y);skill.diagram={schemaVersion:1,positions:[{stepId:skill.steps[1].id,x:900,y:400}]};assert.deepEqual(diagramPositions(skill)[1],skill.diagram.positions[0]);assert.deepEqual(skill.steps.map(step=>step.id),order);assert.deepEqual(readProject(JSON.stringify(skill)).diagram,skill.diagram);
 const removed=skill.steps.shift();reconcileDiagramLayout(skill);assert.ok(!skill.diagram.positions.some(position=>position.stepId===removed.id));assert.equal(skill.diagram.positions.length,skill.steps.length);const restored=readProject(JSON.stringify(skill));assert.equal(restored.diagram.positions.find(position=>position.stepId===order[1]).x,900);
});
test('diagram metadata rejects unknown nodes, duplicate identities and unsafe geometry',()=>{
 const skill=diagramSkill();for(const positions of [[{stepId:'unknown',x:20,y:20}],[{stepId:skill.steps[0].id,x:-1,y:20}],[{stepId:skill.steps[0].id,x:50001,y:20}],[{stepId:skill.steps[0].id,x:'20',y:20}],[{stepId:skill.steps[0].id,x:null,y:20}],[{stepId:skill.steps[0].id,x:20,y:20},{stepId:skill.steps[0].id,x:30,y:40}]]){const value=copy(skill);value.diagram={schemaVersion:1,positions};assert.throws(()=>readProject(JSON.stringify(value)),/diagram/);}
});
test('connectors follow source order through moved shapes, with finite bounds and ports',()=>{
 const skill=diagramSkill(),positions=autoDiagramPositions(skill.steps);positions[2].x=1000;positions[2].y=900;const graph=diagramGeometry(skill,positions);assert.equal(graph.edges.length,skill.steps.length+1);assert.ok(graph.bounds.right>=1248&&graph.bounds.bottom>=1060);for(const edge of graph.edges){const route=diagramConnector(edge.from,edge.to);assert.ok(/^M /.test(route.path));assert.ok(Object.values(route.start).every(Number.isFinite));assert.ok(Object.values(route.end).every(Number.isFinite));assert.ok(!/NaN|undefined|Infinity/.test(route.path));}assert.equal(graph.nodes[2].stepId,skill.steps[2].id);
});


test('large diagrams occupy two dimensions and inserted shapes do not overlap saved nodes',()=>{
 const skill=diagramSkill();skill.steps=Array.from({length:100},(_,index)=>newStep('Step '+index));const positions=autoDiagramPositions(skill.steps);assert.equal(new Set(positions.map(position=>position.x+':'+position.y)).size,100);assert.ok(new Set(positions.map(position=>position.x)).size>2);assert.ok(diagramGeometry(skill).bounds.bottom<5000);
 skill.diagram={schemaVersion:1,positions};const existing=skill.steps.map(step=>step.id),added=newStep('Inserted step');skill.steps.splice(1,0,added);skill.steps.pop();reconcileDiagramLayout(skill);const inserted=skill.diagram.positions.find(position=>position.stepId===added.id);assert.ok(!skill.diagram.positions.some(position=>position!==inserted&&Math.abs(position.x-inserted.x)<248&&Math.abs(position.y-inserted.y)<184));for(const position of skill.diagram.positions.filter(position=>existing.includes(position.stepId)))assert.deepEqual(position,positions.find(original=>original.stepId===position.stepId));
});

test('layout survives backups without changing review evidence; new optimization identities get fresh layout',async()=>{
 const skill=optimizationSource();await syntheticReviewForGateTestsOnly(skill);const snapshot=reviewSnapshot(skill),revision=skill.revision;
 skill.diagram={schemaVersion:1,positions:autoDiagramPositions(skill.steps)};skill.diagram.positions[0].x+=100;
 const restored=readProject(JSON.stringify(skill));assert.equal(reviewSnapshot(restored),snapshot);assert.equal(restored.revision,revision);assert.equal(independentReviewState(restored).status,'passed');
 const improved=await skillFromOptimization(restored,optimizationProposal(restored));assert.equal(improved.diagram,undefined);assert.deepEqual(improved.optimization.baseline.diagram,restored.diagram);assert.ok(improved.steps.every(step=>!restored.steps.some(original=>original.id===step.id)));assert.equal(diagramPositions(improved).length,improved.steps.length);
});
