import test from 'node:test';
import assert from 'node:assert/strict';
import {blankProject} from './core.mjs';
import {emptyWorkspace,createWorkspaceProject,addWorkspaceProject,addWorkspaceSkill,updateWorkspaceSkill,workspaceSkill,readWorkspace,workspaceProjectBackup,readWorkspaceProjectBackup,restoreWorkspaceProject,recoverLegacyWorkspace} from './workspace.mjs';

test('a fresh workspace contains no demo and a project starts without skills',()=>{
  const workspace=emptyWorkspace(),container=createWorkspaceProject('Research');
  addWorkspaceProject(workspace,container);assert.equal(workspace.projects.length,1);assert.deepEqual(container.skills,[]);assert.deepEqual(emptyWorkspace().projects,[]);
});
test('adding and editing skills preserves siblings and isolates projects',()=>{
  const workspace=emptyWorkspace(),a=addWorkspaceProject(workspace,createWorkspaceProject('A')),b=addWorkspaceProject(workspace,createWorkspaceProject('B'));
  const first=blankProject('First'),second=blankProject('Second');addWorkspaceSkill(workspace,a.id,first);addWorkspaceSkill(workspace,a.id,second);addWorkspaceSkill(workspace,b.id,first);
  first.title='Edited first';updateWorkspaceSkill(workspace,a.id,first);
  assert.equal(workspaceSkill(workspace,a.id,second.id).title,'Second');assert.equal(workspaceSkill(workspace,b.id,first.id).title,'First');assert.equal(workspaceSkill(workspace,a.id,first.id).title,'Edited first');
  assert.throws(()=>addWorkspaceSkill(workspace,a.id,first),/already/);assert.throws(()=>updateWorkspaceSkill(workspace,b.id,second),/no longer belongs/);
});
test('legacy migration preserves originals and review evidence without creating a demo',()=>{
  const skill=blankProject('Existing draft');skill.originals=[{path:'assets/data.bin',encoding:'base64',data:'AP+A'}];skill.independentReview={report:{summary:'Retained evidence'}};
  const migrated=recoverLegacyWorkspace(JSON.stringify(skill));assert.equal(migrated.projects.length,1);assert.deepEqual(migrated.projects[0].skills[0],skill);assert.deepEqual(recoverLegacyWorkspace(null).projects,[]);
});
test('project and workspace backups restore every skill without overwriting existing projects',()=>{
  const workspace=emptyWorkspace(),container=addWorkspaceProject(workspace,createWorkspaceProject('Collection'));
  addWorkspaceSkill(workspace,container.id,blankProject('One'));addWorkspaceSkill(workspace,container.id,blankProject('Two'));
  const restored=restoreWorkspaceProject(workspace,readWorkspaceProjectBackup(JSON.stringify(workspaceProjectBackup(container))));
  assert.notEqual(restored.id,container.id);assert.equal(workspace.projects.length,2);assert.deepEqual(restored.skills,container.skills);assert.deepEqual(readWorkspace(JSON.stringify(workspace)),workspace);
  const legacy=readWorkspaceProjectBackup(JSON.stringify(container.skills[0]));assert.equal(legacy.skills.length,1);assert.equal(legacy.skills[0].id,container.skills[0].id);
});
test('corrupt backups and duplicate identities are rejected rather than partly loaded',()=>{
  assert.throws(()=>readWorkspace('{broken'));const workspace=emptyWorkspace(),container=addWorkspaceProject(workspace,createWorkspaceProject('Collection'));
  container.skills.push(blankProject('One'));container.skills.push({...container.skills[0]});assert.throws(()=>readWorkspace(JSON.stringify(workspace)),/identities/);
  container.skills.pop();workspace.projects.push({...container});assert.throws(()=>readWorkspace(JSON.stringify(workspace)),/identities/);
});
test('browser migration markers survive backups and malformed markers are rejected',()=>{
  const workspace=emptyWorkspace();workspace.browserImports=['a'.repeat(64)];assert.deepEqual(readWorkspace(JSON.stringify(workspace)),workspace);workspace.browserImports=['invalid'];assert.throws(()=>readWorkspace(JSON.stringify(workspace)),/migration record/);
});
test('workspace appearance is optional, survives backups and rejects unsupported settings',()=>{
  const workspace=emptyWorkspace();assert.equal(readWorkspace(JSON.stringify(workspace)).appearance,undefined);
  for(const appearance of ['light','dark']){workspace.appearance=appearance;assert.equal(readWorkspace(JSON.stringify(workspace)).appearance,appearance);}
  for(const appearance of [null,{},'invalid']){workspace.appearance=appearance;assert.throws(()=>readWorkspace(JSON.stringify(workspace)),/appearance/);}
});
