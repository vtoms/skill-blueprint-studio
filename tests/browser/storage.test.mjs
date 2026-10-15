import test from 'node:test';
import {startTestServer,startTestBrowser,repositoryRoot} from './helpers.mjs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';

test('storage browser regression', {timeout:120000}, async t=>{
const server=await startTestServer(t),browser=await startTestBrowser(t);
const first=await browser.newContext({acceptDownloads:true}),second=await browser.newContext();
const a=await first.newPage(),b=await second.newPage(),errors=[];for(const page of [a,b])page.on('pageerror',error=>errors.push(error.message));
const state=(page,value='saved')=>page.waitForFunction(value=>document.querySelector('#save-state').dataset.state===value,value);
async function create(page,name){await page.locator('#project-actions [data-action="create-workspace-project"]').click();await page.locator('#dialog [name="projectName"]').fill(name);await page.locator('#dialog button[type="submit"]').click();}
try{
 await a.goto(server.base);await state(a);await create(a,'Shared collection');await state(a);
 await b.goto(server.base);await state(b);assert.equal(await b.locator('.directory-card').count(),1);assert.match(await b.locator('.directory-card').textContent(),/Shared collection/);assert.equal(await a.evaluate(()=>localStorage.length),0);assert.equal(await b.evaluate(()=>localStorage.length),0);
 await a.locator('#project-actions [data-action="edit-workspace-project"]').click();await a.locator('#dialog [name="projectName"]').fill('Updated collection');await a.locator('#dialog button[type="submit"]').click();await state(a);
 await create(b,'Unsaved collection');await state(b,'conflict');assert.equal((await server.read()).projects.length,1);assert.equal((await server.read()).projects[0].name,'Updated collection');
 const output=resolve(repositoryRoot,'test-results/browser/storage');await mkdir(output,{recursive:true});const event=b.waitForEvent('download');await b.locator('.top-actions [data-action="save-project"]').click();const download=await event;const backup=resolve(output,'unsaved-project.json');await download.saveAs(backup);assert.equal(JSON.parse(await readFile(backup,'utf8')).project.name,'Unsaved collection');
 await b.locator('[data-action="reload-database"]').click();await b.locator('#dialog [name="confirmReload"]').check();await b.locator('#dialog button[type="submit"]').click();await state(b);assert.equal(await b.locator('.directory-card').count(),1);assert.match(await b.locator('.directory-card').textContent(),/Updated collection/);
 await a.route('**/api/workspace',route=>route.request().method()==='PUT'?route.abort():route.continue());
 await a.locator('#project-actions [data-action="edit-workspace-project"]').click();await a.locator('#dialog [name="projectDescription"]').fill('Preserved through a temporary save failure.');await a.locator('#dialog button[type="submit"]').click();await state(a,'error');assert.notEqual((await server.read()).projects[0].description,'Preserved through a temporary save failure.');
 await a.unroute('**/api/workspace');await a.locator('[data-action="retry-storage"]').click();await state(a);assert.equal((await server.read()).projects[0].description,'Preserved through a temporary save failure.');assert.equal(await a.evaluate(()=>localStorage.length),0);
 await b.reload();await state(b);assert.match(await b.locator('.directory-card').textContent(),/Preserved through/);
 const previewContext=await browser.newContext(),preview=await previewContext.newPage();preview.on('pageerror',error=>errors.push(error.message));await preview.goto(pathToFileURL(resolve(repositoryRoot,'studio/dist/skill-blueprint-studio.html')).href);await state(preview,'preview');await create(preview,'Temporary preview');assert.equal(await preview.evaluate(()=>localStorage.length),0);await preview.reload();await state(preview,'preview');assert.equal(await preview.locator('.directory-card').count(),0);await previewContext.close();
 assert.deepEqual(errors,[]);console.log('Passed: isolated browser profiles share one database without browser writes, stale edits cannot overwrite newer data, unsaved work can be backed up, reload resolves conflicts, and failed saves can be retried.');
}finally{await browser.close();await server.close();}
});
