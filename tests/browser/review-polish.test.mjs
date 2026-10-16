import test from 'node:test';
import assert from 'node:assert/strict';
import {startTestServer,startTestBrowser} from './helpers.mjs';
import {emptyWorkspace,createWorkspaceProject} from '../../studio/workspace.mjs';
import {blankProject,newStep,sourceBytes} from '../../studio/core.mjs';
import {needsIndependentReview} from '../../studio/independent-review.mjs';

async function polishSetup(t,skill,viewport={width:1440,height:1000}){
 const server=await startTestServer(t),browser=await startTestBrowser(t),page=await browser.newPage({viewport,hasTouch:true}),workspace=emptyWorkspace(),container=createWorkspaceProject('Process examples'),errors=[];
 container.skills=[skill];workspace.projects=[container];await server.seed(workspace);page.on('pageerror',error=>errors.push(error.message));await page.goto(server.base);await page.locator('[data-action="continue-skill"]').click();
 return {page,errors,async saved(){await page.waitForFunction(()=>document.querySelector('#save-state').dataset.state==='saved');return (await server.read()).projects[0].skills[0];}};
}
function polishSkill(count=5){const skill=blankProject('Record review');Object.assign(skill,{description:'Review supplied records.',input:'Review request',outcome:'Final report'});skill.steps=Array.from({length:count},(_,index)=>({...newStep(index%2?'Review the supplied records':'Collect inputs'),job:'Preserve the supplied identifiers and report missing values.',output:index?'Draft findings':'Confirmed review request'}));return skill;}

test('Canvas labels avoid shape content, overview titles retain two lines, and every mobile view switches panes',{timeout:120000},async t=>{
 const skill=polishSkill(20),{page,errors}=await polishSetup(t,skill);
 await page.locator('.sidebar [data-page="workflow"]').click();await page.locator('[data-view="flow"]').click();await page.locator('[data-diagram-action="focus"]').click();
 const overlap=await page.evaluate(()=>{const shapes=[...document.querySelectorAll('.diagram-node,.diagram-boundary')].map(element=>element.getBoundingClientRect());return [...document.querySelectorAll('.diagram-edge-label:not([hidden])')].filter(element=>{const label=element.getBoundingClientRect();return shapes.some(shape=>Math.min(label.right,shape.right)>Math.max(label.left,shape.left)&&Math.min(label.bottom,shape.bottom)>Math.max(label.top,shape.top));}).map(element=>element.textContent);});assert.deepEqual(overlap,[]);
 await page.locator('[data-diagram-action="fit"]').click();await page.locator('.diagram-overview').waitFor();
 const titles=await page.locator('.diagram-node-title').evaluateAll(elements=>elements.map(element=>({height:element.clientHeight,scroll:element.scrollHeight,line:parseFloat(getComputedStyle(element).lineHeight)})));assert.ok(titles.every(title=>title.height>=title.line&&title.height+1>=Math.min(title.line*2,title.scroll)),JSON.stringify(titles));
 await page.setViewportSize({width:390,height:844});
 for(const view of ['guided','list','flow']){
  await page.locator('[data-view="'+view+'"]').click();assert.equal(await page.locator('.stage').isVisible(),true);assert.equal(await page.locator('.inspector').isVisible(),false);
  if(view==='list'){const clipped=await page.locator('.workflow-table td').evaluateAll(elements=>elements.filter(element=>{const rect=element.getBoundingClientRect();return rect.left<0||rect.right>innerWidth;}).length);assert.equal(clipped,0);const order=await page.locator('.workflow-table .step-order').first().boundingBox();assert.ok(order.x>=0&&order.x+order.width<=390);}
  if(view==='flow'){const rect=await page.locator('.diagram-viewport').boundingBox();assert.ok(Math.min(844,rect.y+rect.height)-Math.max(0,rect.y)>=300,JSON.stringify(rect));}
  await page.locator('[data-action="mobile-editor"]').click();assert.equal(await page.locator('.stage').isVisible(),false);assert.equal(await page.locator('.inspector').isVisible(),true);
  await page.locator('[data-action="workflow-overview"]').click();await page.waitForFunction(()=>document.querySelector('.mobile-process-switch').getBoundingClientRect().top>=-1);assert.equal(await page.locator('.stage').isVisible(),true);assert.equal(await page.locator('.inspector').isVisible(),false);
 }
 await page.locator('[data-action="mobile-editor"]').click();await page.locator('[data-tab="facets"]').click();await page.locator('.inspector [data-key="title"]').fill('A temporary name');await page.locator('.top-actions [data-action="undo"]').click();await page.locator('[data-action="mobile-editor"]').click();await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
 await page.waitForFunction(()=>parseFloat(document.documentElement.style.getPropertyValue('--toast-clearance'))>0);await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
 const blocked=await page.evaluate(()=>{const toast=document.querySelector('#toast').getBoundingClientRect();return [...document.querySelectorAll('.bound-files [data-action],.chapter-footer button')].filter(element=>{const rect=element.getBoundingClientRect();return Math.min(rect.right,toast.right)>Math.max(rect.left,toast.left)&&Math.min(rect.bottom,toast.bottom)>Math.max(rect.top,toast.top);}).map(element=>element.textContent);});assert.deepEqual(blocked,[]);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
});

test('standalone Markdown import retains source bytes and restores from both source entry points with review gating',{timeout:120000},async t=>{
 const {page,saved,errors}=await polishSetup(t,polishSkill()),bytes=Buffer.from('\uFEFF# Imported guide\r\nPreserve the supplied evidence.\r\n');
 await page.locator('.sidebar [data-page="references"]').click();await page.locator('[data-reference-tab="files"]').click();await page.locator('#reference-file').setInputFiles({name:'guide.md',mimeType:'text/markdown',buffer:bytes});let current=await saved();
 assert.deepEqual(Buffer.from(sourceBytes(current.originals[0])),bytes);assert.equal(needsIndependentReview(current),true);assert.equal(current.sourceOrigin,'authored');
 await page.locator('[data-action="edit-reference"]').click();await page.locator('#dialog [name="path"]').fill('references/renamed.md');await page.locator('#dialog [name="content"]').fill('Edited guide.');await page.locator('#dialog button[type="submit"]').click();current=await saved();assert.equal(current.references[0].sourcePath,'references/guide.md');
 await page.locator('[data-action="remove-reference"]').click();assert.equal(needsIndependentReview(await saved()),false);
 await page.locator('[data-reference-tab="originals"]').click();await page.locator('[data-action="restore-resource"]:enabled').click();current=await saved();assert.equal(current.references[0].path,'references/guide.md');assert.equal(needsIndependentReview(current),true);
 await page.locator('[data-action="remove-reference"]').click();await saved();await page.locator('.sidebar [data-page="package"]').click();await page.locator('[data-action="originals"]').click();await page.locator('#dialog details summary').click();await page.locator('#dialog [data-action="restore-resource"]:enabled').click();assert.equal(needsIndependentReview(await saved()),true);
 await page.locator('[data-action="remove-reference"]').click();await saved();await page.locator('#reference-file').setInputFiles({name:'guide.md',mimeType:'text/markdown',buffer:Buffer.from('Second imported version.')});await saved();await page.locator('[data-reference-tab="originals"]').click();assert.equal(await page.getByRole('button',{name:'In skill',exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:'Path in use',exact:true}).count(),1);assert.match(await page.locator('.original-row').first().innerText(),/Rename or remove/);assert.doesNotMatch(await page.locator('.original-row>strong').last().innerText(),/reference-imports|id-/);
 assert.equal(await page.locator('#toast').isVisible(),true);await page.locator('#review-report-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{invalid')});await page.locator('#action-error').waitFor({state:'visible'});assert.equal(await page.locator('#toast').isVisible(),false);await page.waitForFunction(()=>document.documentElement.style.getPropertyValue('--toast-clearance')==='0px');assert.deepEqual(errors,[]);
});
