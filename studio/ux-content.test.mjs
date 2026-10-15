import test from 'node:test';
import assert from 'node:assert/strict';
import {blankProject,newStep} from './core.mjs';
import {SKILL_CHAPTERS,HELP_TOPICS,chapterStates} from './ux-content.mjs';
import {briefChapterMarkup,improveChapterMarkup,rulesFilesMarkup,testsChapterMarkup} from './chapter-view.mjs';
import {workflowDiagramMarkup} from './diagram-view.mjs';

test('chapter progress distinguishes unrun, current and stale observations without inventing successful tests',()=>{
 const skill=blankProject('Example');skill.scenarios=[{id:'case',name:'Missing field',input:'No identifier',expected:'Ask for it',status:'Not tested',testedRevision:skill.revision,observations:''}];
 assert.equal(chapterStates(skill).scenarios,'0 of 1 run');skill.scenarios[0].status='Fail';assert.equal(chapterStates(skill).scenarios,'1 of 1 run');skill.revision++;assert.equal(chapterStates(skill).scenarios,'0 of 1 run');
 const html=testsChapterMarkup(skill,{button:()=>''});assert.match(html,/Re-run needed/);assert.doesNotMatch(html,/Passed/);assert.ok(SKILL_CHAPTERS.findIndex(chapter=>chapter.page==='package')<SKILL_CHAPTERS.findIndex(chapter=>chapter.page==='scenarios'));assert.ok(SKILL_CHAPTERS.every(chapter=>HELP_TOPICS[chapter.help]));
});

test('untrusted imported names stay text in chapter and diagram markup; controls remain distinct from order',()=>{
 const skill=blankProject('<img src=x onerror=alert(1)>');skill.steps=[newStep(skill.title)];skill.steps[0].output='<svg onload=alert(1)>';skill.scenarios=[{id:'test',name:skill.title,input:skill.title,expected:skill.title,status:'Not tested',testedRevision:null,observations:''}];skill.references=[{id:'ref',path:'references/example.md',content:skill.title}];
 const button=()=>'',field=()=>'';
 for(const html of [briefChapterMarkup(skill,{field,button}),improveChapterMarkup(skill,{button}),rulesFilesMarkup(skill,{tab:'files',referenceId:'ref',button}).body,testsChapterMarkup(skill,{button}),workflowDiagramMarkup(skill,{selected:skill.steps[0].id,checks:{errors:[]}})]){assert.doesNotMatch(html,/<img|<svg onload/);}
 const diagram=workflowDiagramMarkup(skill,{selected:skill.steps[0].id,checks:{errors:[]}});assert.match(diagram,/data-diagram-action="shape-right"/);assert.match(diagram,/data-diagram-action="pan-right"/);assert.match(diagram,/data-action="move-down"/);assert.match(diagram,/Read the process in order/);
});
