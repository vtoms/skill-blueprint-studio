import {uid,copy,readProject} from './core.mjs';

export const WORKSPACE_STORE='skill-blueprint-studio-workspace-v1';
export const LEGACY_SKILL_STORE='agentic-studio-public-project-v1';
const WORKSPACE_TYPE='skill-blueprint-workspace';
const PROJECT_TYPE='skill-blueprint-project';

export function emptyWorkspace(){return {type:WORKSPACE_TYPE,schemaVersion:1,projects:[]};}
export function createWorkspaceProject(name,description=''){
  const title=String(name).trim();
  if(!title||title.length>100)throw new Error('Use a project name between 1 and 100 characters.');
  const now=new Date().toISOString();
  return {id:uid(),name:title,description:String(description).trim(),createdAt:now,updatedAt:now,skills:[]};
}
export function addWorkspaceProject(workspace,container){
  if(workspace.projects.some(item=>item.id===container.id))throw new Error('That project already exists.');
  if(workspace.projects.length>=200)throw new Error('This workspace supports up to 200 projects.');
  workspace.projects.push(container);return container;
}
export function workspaceProject(workspace,id){return workspace.projects.find(item=>item.id===id)||null;}
export function workspaceSkill(workspace,projectId,skillId){return workspaceProject(workspace,projectId)?.skills.find(item=>item.id===skillId)||null;}
export function addWorkspaceSkill(workspace,projectId,skill){
  const container=workspaceProject(workspace,projectId);
  if(!container)throw new Error('Choose a project before adding a skill.');
  if(container.skills.some(item=>item.id===skill.id))throw new Error('That skill is already in this project.');
  if(container.skills.length>=100)throw new Error('This project supports up to 100 skills.');
  container.skills.push(copy(skill));container.updatedAt=new Date().toISOString();return skill;
}
export function updateWorkspaceSkill(workspace,projectId,skill){
  const container=workspaceProject(workspace,projectId),index=container?.skills.findIndex(item=>item.id===skill.id)??-1;
  if(index<0)throw new Error('The skill no longer belongs to this project.');
  container.skills[index]=copy(skill);container.updatedAt=new Date().toISOString();
}
function checkedWorkspaceProject(value){
  if(!value||typeof value.id!=='string'||!value.id||typeof value.name!=='string'||!value.name.trim()||value.name.length>100||typeof value.description!=='string'||!Array.isArray(value.skills)||value.skills.length>100)throw new Error('Invalid project in the backup.');
  const result={...value,skills:value.skills.map(skill=>readProject(JSON.stringify(skill)))};
  if(result.skills.some(skill=>typeof skill.id!=='string'||!skill.id)||new Set(result.skills.map(skill=>skill.id)).size!==result.skills.length)throw new Error('Skill identities must be unique within a project.');
  for(const field of ['createdAt','updatedAt'])if(typeof result[field]!=='string'||!Number.isFinite(Date.parse(result[field])))throw new Error('Invalid project date in the backup.');
  return result;
}
export function readWorkspace(text){
  if(text.length>128*1024*1024)throw new Error('Workspace backups must be under 128 MB.');
  const value=JSON.parse(text);
  if(value?.type!==WORKSPACE_TYPE||value.schemaVersion!==1||!Array.isArray(value.projects)||value.projects.length>200)throw new Error('This is not a workspace backup.');
  const projects=value.projects.map(checkedWorkspaceProject);
  if(new Set(projects.map(container=>container.id)).size!==projects.length)throw new Error('Project identities must be unique.');
  return {type:WORKSPACE_TYPE,schemaVersion:1,projects};
}
export function workspaceProjectBackup(container){return {type:PROJECT_TYPE,schemaVersion:1,project:copy(container)};}
export function readWorkspaceProjectBackup(text){
  if(text.length>64*1024*1024)throw new Error('Project backups must be under 64 MB.');
  const value=JSON.parse(text);
  if(value?.type===PROJECT_TYPE&&value.schemaVersion===1)return checkedWorkspaceProject(value.project);
  const skill=readProject(text),container=createWorkspaceProject(skill.title||'Recovered draft','Restored from a single-skill backup.');
  container.skills=[skill];return container;
}
export function restoreWorkspaceProject(workspace,container){
  const restored=checkedWorkspaceProject(container);
  restored.id=uid();restored.updatedAt=new Date().toISOString();
  if(workspace.projects.some(item=>item.name===restored.name)){const original=restored.name;let suffix=' (restored)',counter=1;while(workspace.projects.some(item=>item.name===original.slice(0,100-suffix.length)+suffix)){suffix=' (restored '+(++counter)+')';}restored.name=original.slice(0,100-suffix.length)+suffix;}
  addWorkspaceProject(workspace,restored);return restored;
}
export function recoverLegacyWorkspace(text){
  const workspace=emptyWorkspace();if(!text)return workspace;
  const skill=readProject(text),container=createWorkspaceProject('Recovered drafts','Your previously saved skill is preserved here.');
  container.skills=[skill];workspace.projects.push(container);return workspace;
}
