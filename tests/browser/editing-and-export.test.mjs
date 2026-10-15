import test from 'node:test';
import {startTestServer,startTestBrowser,repositoryRoot} from './helpers.mjs';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {demoProject} from '../../studio/demo.mjs';
import {emptyWorkspace,createWorkspaceProject,addWorkspaceProject,addWorkspaceSkill,WORKSPACE_STORE} from '../../studio/workspace.mjs';
import {readZip} from '../../studio/zip.mjs';

test('editing-and-export browser regression', {timeout:120000}, async t=>{
const server=await startTestServer(t);const app=server.base;
const output=resolve(repositoryRoot,'test-results/browser/editing-and-export');await mkdir(output,{recursive:true});
const skill=demoProject();skill.steps[2].facets[1].override='';
const workspace=emptyWorkspace(),container=createWorkspaceProject('Example collection');addWorkspaceProject(workspace,container);addWorkspaceSkill(workspace,container.id,skill);
const browser=await startTestBrowser(t);
const context=await browser.newContext({viewport:{width:1536,height:1050},acceptDownloads:true});
await server.seed(workspace);
const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
const saved=async()=>{await page.waitForFunction(()=>document.querySelector('#save-state').dataset.state==='saved');return (await server.read()).projects[0].skills[0];};
const stepField=key=>page.locator(`.inspector [data-edit="step"][data-key="${key}"]`);
async function openSkill(){await page.locator('[data-action="open-workspace-project"]').first().click();await page.locator('[data-action="open-skill"]').first().click();await page.locator('.sidebar [data-page="workflow"]').click();}
try{
 await page.goto(app);await openSkill();assert.equal(await page.locator('[data-view="guided"]').getAttribute('aria-pressed'),'true');
 await stepField('title').fill('Collect & confirm <records>');await stepField('job').fill('Request the records, then confirm the scope.');await stepField('output').fill('Confirmed records');
 for(const view of ['list','flow','guided']){await page.locator(`[data-view="${view}"]`).click();assert.equal(await stepField('title').inputValue(),'Collect & confirm <records>');assert.equal(await stepField('job').inputValue(),'Request the records, then confirm the scope.');assert.equal(await page.locator('.inspector records').count(),0);}
 const beforeTyping=(await saved()).steps[0].job;const job=stepField('job');await job.focus();await job.press('End');await job.pressSequentially(' Review.');await page.locator('[data-action="undo"]').first().click();assert.equal((await saved()).steps[0].job,beforeTyping);
 await page.locator('[data-tab="facets"]').click();await page.locator('[data-action="inline-add-facet"]').click();
 const facet=page.locator('[data-facet-container]').last();await facet.locator('[data-key="title"]').fill('Handle unavailable records');await facet.locator('[data-key="instructions"]').fill('Ask for clarification and stop when records are unavailable.');await facet.locator('[data-key="type"]').selectOption('Exception');
 for(const view of ['flow','list','guided']){await page.locator(`[data-view="${view}"]`).click();assert.equal(await page.locator('[data-facet-container]').last().getAttribute('open'),'');assert.equal(await page.locator('[data-facet-container]').last().locator('[data-key="instructions"]').inputValue(),'Ask for clarification and stop when records are unavailable.');}
 await page.locator('[data-facet-container]').last().locator('[data-action="move-facet-up"]').click();assert.equal((await saved()).steps[0].facets.at(-2).title,'Handle unavailable records');
 await page.locator('[data-view="flow"]').click();const movedId=(await saved()).steps[1].id;await page.locator('.stage [data-diagram-step] [data-step]').nth(1).click();await page.locator('.diagram-run-order [data-action="move-down"]').click();assert.equal((await saved()).steps.filter(step=>step.inputReview).length,3);assert.equal((await saved()).steps[2].id,movedId);assert.ok(await page.locator('.input-change').isVisible());
 await page.locator('[data-page="package"]').first().click();assert.equal(await page.locator('[data-action="export"]').isDisabled(),true);
 await page.reload();await openSkill();assert.equal((await saved()).steps.filter(step=>step.inputReview).length,3);
 await page.locator('[data-view="list"]').click();await page.locator('.stage [data-action="move-up"]').nth(2).click();assert.equal((await saved()).steps.filter(step=>step.inputReview).length,0);
 await page.locator('[data-view="flow"]').click();await page.locator('[data-action="insert-step"][data-index="2"]').click();await stepField('title').fill('Verify records');await stepField('job').fill('Verify that the record set is complete.');await stepField('output').fill('Verified records');assert.equal((await saved()).steps.filter(step=>step.inputReview).length,1);
 await page.locator('[data-action="undo"]').first().click();assert.equal(await stepField('output').inputValue(),'');await stepField('output').fill('Verified records');
 const affected=(await saved()).steps.find(step=>step.inputReview);await page.locator(`.stage [data-diagram-step] [data-step="${affected.id}"]`).click();await page.locator('[data-action="confirm-input"]').click();assert.equal((await saved()).steps.filter(step=>step.inputReview).length,0);
 await page.locator('.sidebar [data-page="package"]').click();await page.locator('[data-action="workflow-markdown"]').click();assert.match(await page.locator('.workflow-markdown').textContent(),/Verify records/);
 await page.locator('[data-action="workflow-markdown"]').click();await page.locator('.sidebar [data-page="workflow"]').click();
 await page.locator('[data-tab="facets"]').click();const rule=page.locator('[data-facet-container]').filter({hasText:'Apply shared rule'}); // Locate a bound rule by its model ID below.
 const current=(await saved()).steps.find(step=>step.id===affected.id),bound=current.facets.find(f=>f.definitionId);
 if(bound){
   const row=page.locator(`[data-facet-container="${bound.id}"]`);await row.locator('summary').click();await row.locator('[data-key="override"]').fill('Separate value');await row.locator('[data-action="split-override"]').click();await page.locator('#dialog [name="ruleName"]').fill('Separate processing rule');await page.locator('#dialog button[type="submit"]').click();const state=await saved();assert.ok(state.definitions.some(d=>d.name==='Separate processing rule'));assert.equal(state.steps.find(step=>step.id===affected.id).facets.find(f=>f.id===bound.id).override,'');
 }
 await page.locator('[data-tab="definition"]').click();await page.locator('[data-view="flow"]').click();assert.ok(await page.evaluate(()=>{const stage=document.querySelector('.diagram-viewport'),card=document.querySelector('.diagram-node.selected');const a=stage.getBoundingClientRect(),b=card.getBoundingClientRect();return b.top>=a.top&&b.bottom<=a.bottom;}));await page.screenshot({path:resolve(output,'canvas-desktop.png'),fullPage:false});
 await page.locator('[data-view="guided"]').click();await page.screenshot({path:resolve(output,'step-editor-desktop.png'),fullPage:false});
 await page.locator('[data-page="package"]').first().click();assert.equal(await page.locator('[data-action="export"]').isDisabled(),false);
 const downloadEvent=page.waitForEvent('download');await page.locator('[data-action="export"]').click();const download=await downloadEvent,zipPath=resolve(output,'sample-export.zip');await download.saveAs(zipPath);const zipBytes=await readFile(zipPath);const zip=await readZip(zipBytes.buffer.slice(zipBytes.byteOffset,zipBytes.byteOffset+zipBytes.byteLength));
 assert.ok(Object.keys(zip).some(path=>path.endsWith('/SKILL.md')));
 await page.locator('.sidebar [data-page="workflow"]').click();await page.setViewportSize({width:390,height:844});await page.locator('[data-view="flow"]').click();await page.locator('.stage [data-step]').first().click();assert.equal(await page.locator('[data-view="flow"]').getAttribute('aria-pressed'),'true');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:resolve(output,'canvas-mobile.png'),fullPage:true});
 await page.locator('[data-view="list"]').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);console.log('Passed: inline editing, synchronized views, typing undo, facet editing/order, input-change gates and persistence, move-back recovery, insertion, Markdown, shared-rule split, ZIP export, and mobile Canvas/List.');
}finally{await browser.close();await server.close();}
});
