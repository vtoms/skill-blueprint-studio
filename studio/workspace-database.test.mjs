import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {openWorkspaceDatabase,WorkspaceConflict} from './workspace-database.mjs';
import {emptyWorkspace,createWorkspaceProject,addWorkspaceProject,addWorkspaceSkill} from './workspace.mjs';
import {blankProject} from './core.mjs';

const template=fileURLToPath(new URL('./seed/workspace.sqlite',import.meta.url));
async function temporaryDatabase(t){const folder=await mkdtemp(join(tmpdir(),'blueprint-database-'));t.after(()=>rm(folder,{recursive:true,force:true}));return join(folder,'workspace.sqlite');}

test('the committed database template has valid schema and an empty workspace',()=>{
 const database=new DatabaseSync(template,{readOnly:true});
 try{assert.equal(database.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(database.prepare('PRAGMA user_version').get().user_version,1);const row=database.prepare('SELECT * FROM workspace_state').get();assert.equal(row.revision,0);assert.deepEqual(JSON.parse(row.payload),emptyWorkspace());assert.equal(database.prepare('SELECT count(*) count FROM workspace_history').get().count,0);}
 finally{database.close();}
});

test('first startup copies the template and later startups preserve all project data',async t=>{
 const filename=await temporaryDatabase(t);let store=openWorkspaceDatabase(filename,{template});
 const workspace=emptyWorkspace(),container=addWorkspaceProject(workspace,createWorkspaceProject('Collection')),skill=blankProject('Review records');skill.originals=[{path:'assets/records.bin',encoding:'base64',data:'AP+A'}];addWorkspaceSkill(workspace,container.id,skill);
 store.write(workspace,0);store.close();store=openWorkspaceDatabase(filename,{template});
 try{assert.equal(store.read().revision,1);assert.deepEqual(store.read().workspace,workspace);}finally{store.close();}
});

test('two connections cannot overwrite a newer workspace with a stale revision',async t=>{
 const filename=await temporaryDatabase(t),first=openWorkspaceDatabase(filename),second=openWorkspaceDatabase(filename);
 try{const a=first.read(),b=second.read();addWorkspaceProject(a.workspace,createWorkspaceProject('First browser'));first.write(a.workspace,a.revision);addWorkspaceProject(b.workspace,createWorkspaceProject('Second browser'));assert.throws(()=>second.write(b.workspace,b.revision),WorkspaceConflict);assert.equal(first.read().workspace.projects[0].name,'First browser');assert.equal(first.read().workspace.projects.length,1);}finally{first.close();second.close();}
});

test('invalid writes preserve existing data and snapshots are bounded',async t=>{
 const filename=await temporaryDatabase(t),store=openWorkspaceDatabase(filename);
 try{for(let revision=0;revision<8;revision++){const workspace=emptyWorkspace();addWorkspaceProject(workspace,createWorkspaceProject('Revision '+revision));store.write(workspace,revision);}assert.equal(store.history().length,5);const before=store.read();assert.throws(()=>store.write({projects:[]},before.revision));assert.deepEqual(store.read(),before);assert.throws(()=>store.write(before.workspace,-1),/revision/);}finally{store.close();}
});

test('corrupt stored content fails rather than being replaced by an empty workspace',async t=>{
 const filename=await temporaryDatabase(t),store=openWorkspaceDatabase(filename);store.close();
 const database=new DatabaseSync(filename);database.prepare('UPDATE workspace_state SET payload=?').run('unreadable data');database.close();
 assert.throws(()=>openWorkspaceDatabase(filename,{template}));const check=new DatabaseSync(filename,{readOnly:true});try{assert.equal(check.prepare('SELECT payload FROM workspace_state').get().payload,'unreadable data');}finally{check.close();}
});
