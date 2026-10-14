import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspacePersistence} from './persistence.mjs';
import {emptyWorkspace,createWorkspaceProject,addWorkspaceProject} from './workspace.mjs';

function api(){let workspace=emptyWorkspace(),revision=0;const writes=[];return {writes,get workspace(){return workspace;},request:async(url,options={})=>{if(options.method==='PUT'){const input=JSON.parse(options.body);if(input.revision!==revision)return {ok:false,status:409,json:async()=>({error:'A newer revision exists.'})};workspace=input.workspace;revision++;writes.push(input);return {ok:true,json:async()=>({revision})};}return {ok:true,json:async()=>JSON.parse(JSON.stringify({workspace,revision}))};}};}

test('changes are coalesced and saved only after the server acknowledges them',async()=>{
 const service=api(),states=[],client=createWorkspacePersistence({request:service.request,onStatus:value=>states.push(value.state),delay:100000});
 const workspace=await client.load();addWorkspaceProject(workspace,createWorkspaceProject('A'));client.schedule(workspace);workspace.projects[0].name='Updated A';client.schedule(workspace);assert.equal(client.status,'saving');await client.flush();assert.equal(service.writes.length,1);assert.equal(service.workspace.projects[0].name,'Updated A');assert.equal(client.status,'saved');assert.equal(client.hasChanges(),false);client.schedule(workspace);await client.flush();assert.equal(service.writes.length,1);
});

test('a stale browser keeps its unsaved changes and does not retry over a newer revision',async()=>{
 const service=api(),first=createWorkspacePersistence({request:service.request,delay:100000}),second=createWorkspacePersistence({request:service.request,delay:100000});
 const a=await first.load(),b=await second.load();addWorkspaceProject(a,createWorkspaceProject('First'));first.schedule(a);await first.flush();addWorkspaceProject(b,createWorkspaceProject('Second'));second.schedule(b);assert.equal(await second.flush(),false);assert.equal(second.status,'conflict');assert.equal(second.hasChanges(),true);assert.equal(await second.retry(),false);assert.equal(service.writes.length,1);assert.equal(b.projects[0].name,'Second');assert.equal((await second.reload()).projects[0].name,'First');
});

test('a failed save remains unsaved and a deliberate retry writes the retained changes',async()=>{
 const service=api();let fail=false;const client=createWorkspacePersistence({delay:100000,request:async(...args)=>{if(fail)throw new Error('Connection lost');return service.request(...args);}});
 const workspace=await client.load();addWorkspaceProject(workspace,createWorkspaceProject('A'));client.schedule(workspace);fail=true;assert.equal(await client.flush(),false);assert.equal(client.status,'error');assert.equal(client.hasChanges(),true);fail=false;assert.equal(await client.retry(),true);assert.equal(service.workspace.projects[0].name,'A');assert.equal(client.hasChanges(),false);
});

test('a failed load cannot trigger a blank database save and file preview makes no requests',async()=>{
 let calls=0;const client=createWorkspacePersistence({request:async()=>{calls++;throw new Error('Unavailable');}});await assert.rejects(client.load());client.schedule(emptyWorkspace());await client.flush();assert.equal(calls,1);assert.equal(client.status,'unavailable');const preview=createWorkspacePersistence({preview:true,request:async()=>{throw new Error('Must not request');}});assert.equal(await preview.load(),null);preview.schedule(emptyWorkspace());await preview.flush();assert.equal(preview.status,'preview');
});
