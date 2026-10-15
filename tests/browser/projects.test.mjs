import test from 'node:test';
import {startTestServer,startTestBrowser,repositoryRoot} from './helpers.mjs';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {blankProject} from '../../studio/core.mjs';

test('projects browser regression', {timeout:120000}, async t=>{
const server=await startTestServer(t);const app=server.base;
const output=resolve(repositoryRoot,'test-results/browser/projects');await mkdir(output,{recursive:true});
const browser=await startTestBrowser(t);
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
const heading=()=>page.locator('#project-title').textContent();
async function createContainer(name){await page.locator('#project-actions [data-action="create-workspace-project"]').click();await page.locator('#dialog [name="projectName"]').fill(name);await page.locator('#dialog button[type="submit"]').click();assert.equal(await heading(),name);}
async function freshSkill(name){await page.locator('#project-actions [data-action="add-skill"]').click();await page.locator('#dialog [data-action="new"]').click();await page.locator('#dialog [data-new-mode="manual"]').click();await page.locator('#dialog [name="title"]').fill(name);await page.locator('#dialog [name="description"]').fill('Review sample records using explicit rules.');await page.locator('#dialog button[type="submit"]').click();assert.equal(await heading(),name);}
try{
 await page.goto(app);
 assert.equal(await heading(),'Projects');assert.equal(await page.locator('.directory-card').count(),0);
 assert.equal(await page.locator('#content').getByText('Start with a project',{exact:true}).count(),1);
 await page.screenshot({path:resolve(output,'empty-projects-desktop.png'),fullPage:true});
 await createContainer('Example collection');assert.equal(await page.locator('.directory-card').count(),0);
 await freshSkill('First skill');await page.locator('.sidebar [data-page="workflow"]').click();assert.equal(await page.locator('[data-view="guided"]').getAttribute('aria-pressed'),'true');
 await page.locator('.sidebar [data-page="brief"]').click();await page.locator('#brief-fields [name="input"]').fill('Task request');await page.locator('#brief-fields [name="outcome"]').fill('A reviewed summary');await page.locator('.sidebar [data-page="workflow"]').click();
 await page.locator('#content [data-action="add-step"]').first().click();await page.locator('.inspector [data-edit="step"][data-key="title"]').fill('Collect information');await page.locator('.inspector [data-key="job"]').fill('Collect the required records and confirm the scope.');await page.locator('.inspector [data-key="output"]').fill('Confirmed records');
 await page.locator('[data-tab="facets"]').click();await page.locator('#content [data-action="inline-add-facet"]').click();await page.locator('.inspector [data-edit="facet"][data-key="title"]').fill('Confirm required fields');await page.locator('.inspector [data-key="instructions"]').fill('Ask for clarification when a required field is absent.');
 for(const view of ['flow','list','guided']){await page.locator('[data-view="'+view+'"]').click();assert.equal(await page.locator('.inspector').getByText('Collect information',{exact:true}).count(),1);assert.equal(await page.locator('.inspector').getByText('Confirm required fields',{exact:false}).count(),1);}
 await page.locator('[data-view="flow"]').click();await page.screenshot({path:resolve(output,'canvas-editor-desktop.png'),fullPage:true});
 await page.locator('[data-page="skills"]').click();await freshSkill('Second skill');await page.locator('[data-page="skills"]').click();assert.equal(await page.locator('.directory-card').count(),2);
 await page.locator('#project-actions [data-action="add-skill"]').click();await page.locator('#dialog [data-action="import"]').click();
 const markdown='---\nname: imported-review\ndescription: Review a supplied record.\n---\n# Imported review\n## Collect records\nAsk for the input records.\n## Present results\nShow the findings with evidence.\n';
 await page.locator('#skill-file').setInputFiles({name:'SKILL.md',mimeType:'text/markdown',buffer:Buffer.from(markdown)});
 await page.locator('#dialog button[type="submit"]').click();assert.match(await heading(),/Imported review/i);
 await page.locator('[data-page="skills"]').click();assert.equal(await page.locator('.directory-card').count(),3);
 await page.screenshot({path:resolve(output,'project-skills-desktop.png'),fullPage:true});
 const backupEvent=page.waitForEvent('download');await page.locator('.top-actions [data-action="save-project"]').click();const backup=await backupEvent;const backupPath=resolve(output,'project-backup.json');await backup.saveAs(backupPath);
 const saved=JSON.parse(await readFile(backupPath,'utf8'));assert.equal(saved.type,'skill-blueprint-project');assert.equal(saved.project.skills.length,3);assert.equal(saved.project.skills[0].steps[0].facets.length,1);assert.equal(saved.project.skills[2].originals[0].content,markdown);
 await page.locator('[data-page="projects"]').click();await createContainer('Another collection');await freshSkill('Separate skill');await page.locator('[data-page="projects"]').click();
 await page.waitForFunction(()=>document.querySelector('#save-state').dataset.state==='saved');await page.reload();await page.waitForFunction(()=>document.querySelector('#save-state').dataset.state==='saved');assert.equal(await heading(),'Projects');assert.equal(await page.locator('.directory-card').count(),2);
 const workspace=await server.read();assert.equal(workspace.projects[0].skills.length,3);assert.equal(workspace.projects[1].skills.length,1);assert.equal(workspace.projects[0].skills[0].steps[0].facets.length,1);
 await page.locator('#project-actions [data-action="restore-project"]').click();await page.locator('#project-file').setInputFiles(backupPath);await page.waitForFunction(()=>document.querySelector('#project-title').textContent==='Example collection (restored)');assert.equal(await page.locator('.directory-card').count(),3);
 await page.locator('[data-page="projects"]').click();assert.equal(await page.locator('.directory-card').count(),3);
 await page.screenshot({path:resolve(output,'projects-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:resolve(output,'projects-mobile.png'),fullPage:true});
 const legacyContext=await browser.newContext();const legacySkill=blankProject('Earlier draft');legacySkill.originals=[{path:'assets/sample.bin',encoding:'base64',data:'AP+A'}];
 await legacyContext.addInitScript(value=>{try{if(!localStorage.getItem('skill-blueprint-studio-workspace-v1'))localStorage.setItem('agentic-studio-public-project-v1',JSON.stringify(value));}catch{}},legacySkill);
 const legacyPage=await legacyContext.newPage();await legacyPage.goto(app);assert.equal(await legacyPage.locator('#project-title').textContent(),'Projects');await legacyPage.waitForFunction(()=>document.querySelector('#save-state').dataset.state==='saved');assert.equal(await legacyPage.locator('.directory-card').count(),3);await legacyPage.locator('[data-action="browser-migration"]').click();await legacyPage.locator('#dialog button[type="submit"]').click();await legacyPage.waitForFunction(()=>document.querySelector('#save-state').dataset.state==='saved');
 const recovered=await server.read();assert.deepEqual(recovered.projects.at(-1).skills[0],legacySkill);await legacyPage.reload();await legacyPage.waitForFunction(()=>document.querySelector('#save-state').dataset.state==='saved');assert.equal(await legacyPage.locator('[data-action="browser-migration"]').count(),0);assert.equal(await legacyPage.evaluate(()=>localStorage.getItem('skill-blueprint-studio-workspace-v1')),null);await legacyContext.close();
 const corruptContext=await browser.newContext();await corruptContext.addInitScript(()=>{try{localStorage.setItem('skill-blueprint-studio-workspace-v1','unreadable saved data');}catch{}});const corruptPage=await corruptContext.newPage();await corruptPage.goto(app);
 await corruptPage.waitForFunction(()=>document.querySelector('#save-state').dataset.state==='saved');assert.equal((await server.read()).projects.length,4);assert.ok(await corruptPage.locator('[data-action="download-recovery"]').isVisible());assert.equal(await corruptPage.evaluate(()=>localStorage.getItem('skill-blueprint-studio-workspace-v1')),'unreadable saved data');await corruptContext.close();
 assert.deepEqual(errors,[]);console.log('Passed: empty landing, project creation, multiple skills, fresh/import, editing, synchronized views, backups, restore, reload, isolation, and mobile width.');
}finally{await browser.close();await server.close();}
});
