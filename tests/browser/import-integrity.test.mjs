import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {startTestServer,startTestBrowser} from './helpers.mjs';
import {emptyWorkspace,createWorkspaceProject} from '../../studio/workspace.mjs';
import {sourceBytes} from '../../studio/core.mjs';
import {writeZip} from '../../studio/zip.mjs';

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
