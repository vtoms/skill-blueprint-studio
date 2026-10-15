import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {startTestServer,startTestBrowser} from './helpers.mjs';
import {emptyWorkspace,createWorkspaceProject} from '../../studio/workspace.mjs';
import {sourceBytes} from '../../studio/core.mjs';
import {writeZip} from '../../studio/zip.mjs';
import {zipFixture} from '../helpers/zip-fixture.mjs';

test('archive source integrity and independent review remain enforced through actual UI import', {timeout:120000}, async t=>{
 const server=await startTestServer(t),browser=await startTestBrowser(t),page=await browser.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const workspace=emptyWorkspace();workspace.projects.push(createWorkspaceProject('Import collection'));await server.seed(workspace);
 const original=new Uint8Array([0,255,42]),entries=Object.fromEntries([['SKILL.md','---\nname: record-review\ndescription: Review supplied records.\n---\n# Record review\n## Inspect records\nInspect the supplied records.'],['__proto__',original]]),archive=Buffer.from(await writeZip(entries).arrayBuffer());
 await page.goto(server.base);await page.locator('[data-action="open-workspace-project"]').first().click();await page.locator('#project-actions [data-action="add-skill"]').click();await page.locator('#dialog [data-action="import"]').click();
 await page.locator('#skill-file').setInputFiles({name:'example.zip',mimeType:'application/zip',buffer:archive});await page.waitForFunction(()=>document.querySelector('#dialog-title').textContent==='Review the proposed steps');await page.locator('#dialog button[type="submit"]').click();await page.waitForFunction(()=>document.querySelector('#save-state').dataset.state==='saved');
 const skill=(await server.read()).projects[0].skills[0];assert.deepEqual(sourceBytes(skill.originals.find(file=>file.path==='__proto__')),original);
 await page.locator('.sidebar [data-page="references"]').click();await page.locator('[data-reference-tab="originals"]').click();const downloaded=page.waitForEvent('download');await page.locator('[data-action="download-source"][data-path="__proto__"]').click();assert.deepEqual(new Uint8Array(await readFile(await (await downloaded).path())),original);
 await page.locator('.sidebar [data-page="package"]').click();assert.equal(await page.locator('[data-action="export"]').isDisabled(),true);assert.match(await page.locator('.independent-review').innerText(),/Review has not been performed/);assert.deepEqual(errors,[]);
});

test('malformed streamed ZIPs leave the project unchanged and valid retry preserves encoded reference names', {timeout:120000}, async t=>{
 const server=await startTestServer(t),browser=await startTestBrowser(t),page=await browser.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const workspace=emptyWorkspace();workspace.projects.push(createWorkspaceProject('Archive checks'));await server.seed(workspace);
 await page.goto(server.base);await page.locator('[data-action="open-workspace-project"]').first().click();await page.locator('#project-actions [data-action="add-skill"]').click();await page.locator('#dialog [data-action="import"]').click();
 const markdown='---\nname: record-review\ndescription: Review supplied records.\n---\n# Record review\n## Inspect records\nRead [the guide](references/guide%20%231%20%28draft%29%20%25.md#details).';
 const invalid=zipFixture([{path:'SKILL.md',data:markdown,descriptor:'signed',descriptorLength:0}]);
 await page.locator('#skill-file').setInputFiles({name:'invalid.zip',mimeType:'application/zip',buffer:Buffer.from(invalid.bytes)});await page.locator('#dialog-error').waitFor({state:'visible'});assert.match(await page.locator('#dialog-error').innerText(),/descriptor/i);assert.equal((await server.read()).projects[0].skills.length,0);
 const reference='references/guide #1 (draft) %.md',guide='# Guide\n## Details\nKeep the supplied evidence.',valid=zipFixture([{path:'references/',method:8,descriptor:'signed'},{path:'SKILL.md',data:markdown,method:8,descriptor:'unsigned'},{path:reference,data:guide,method:8,descriptor:'signed'}],{reverseDirectory:true});
 await page.locator('#skill-file').setInputFiles({name:'valid.zip',mimeType:'application/zip',buffer:Buffer.from(valid.bytes)});await page.waitForFunction(()=>document.querySelector('#dialog-title').textContent==='Review the proposed steps');await page.locator('#dialog button[type="submit"]').click();await page.waitForFunction(()=>document.querySelector('#save-state').dataset.state==='saved');
 const skills=(await server.read()).projects[0].skills;assert.equal(skills.length,1);assert.equal(skills[0].references.find(file=>file.path===reference).content,guide);assert.deepEqual(sourceBytes(skills[0].originals.find(file=>file.path===reference)),new TextEncoder().encode(guide));
 await page.locator('.sidebar [data-page="package"]').click();assert.equal(await page.locator('[data-action="export"]').isDisabled(),true);assert.deepEqual(errors,[]);
});
