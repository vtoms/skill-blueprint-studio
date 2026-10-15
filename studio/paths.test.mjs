import test from 'node:test';
import assert from 'node:assert/strict';
import {safePath,resolveRelative,relocateLinks,markdownLinks} from './paths.mjs';
import {compile,importMarkdownFiles,sourceBytes} from './core.mjs';
import {demoProject} from './demo.mjs';
import {readZip,writeZip} from './zip.mjs';

test('local links decode once, reject encoded root escapes and drives, and preserve literal percent filenames',()=>{
 for(const target of ['%58%3A/private.md','%2fprivate.md','%5cprivate.md','references/%00guide.md','references/%7fguide.md','%2e%2e/guide.md','references/../../guide.md','references/%','references/%C3%28'])assert.equal(resolveRelative('SKILL.md',target),'__invalid__',target);
 for(const [target,expected]of [['references%2fguide.md','references/guide.md'],['references/%252e%252e/guide.md','references/%2e%2e/guide.md'],['references/a%252fb.md','references/a%2fb.md'],['references/Caf%C3%A9.md#part','references/Café.md'],['references/Cafe%CC%81.md','references/Cafe\u0301.md'],['./references/../assets/data.csv','assets/data.csv']])assert.equal(resolveRelative('SKILL.md',target),expected,target);
 for(const target of ['#part','https://example.com/guide.md','mailto:reader@example.com','//example.com/guide.md'])assert.equal(resolveRelative('SKILL.md',target),null);
 for(const path of ['references/guide\u007f.md','references/bad\ud800.md','references/bad\udc00.md'])assert.equal(safePath(path),false);
 for(const path of ['references/guide #1 (draft) %.md','references/Café.md','references/Cafe\u0301.md','assets/😀.csv'])assert.equal(safePath(path),true);
});

test('link relocation keeps reserved filename characters encoded and preserves anchors and targets across round trips',()=>{
 const path='assets/guide%20%231%20%28draft%29%20%25%3F.csv',original='[data]('+path+'#column-2 "Attached data") ![image](assets/sample%282%29.png) [web](https://example.com/a?q=1#part) [here](#part)';
 const relocated=relocateLinks(original,'SKILL.md','references/deeper/process.md');assert.ok(relocated.includes('../../'+path+'#column-2'));assert.equal(relocateLinks(relocated,'references/deeper/process.md','SKILL.md'),original);
 for(const [before,after]of markdownLinks(original).map((target,index)=>[target,markdownLinks(relocated)[index]]))assert.equal(resolveRelative('SKILL.md',before),resolveRelative('references/deeper/process.md',after));
 const twice='[literal](references/%252e%252e/a%252fb.md)';assert.equal(relocateLinks(relocateLinks(twice,'SKILL.md','references/process.md'),'references/process.md','SKILL.md'),twice);
 const unsafe='[escape](%2e%2e/private.md)';assert.equal(relocateLinks(unsafe,'SKILL.md','references/process.md'),unsafe);
});

test('compiled reference and retained-asset links resolve to exact ZIP entries after import and re-export',async()=>{
 const project=demoProject();project.steps[2].facets[1].override='';
 const referencePath='references/guide #1 (draft) %.md',assetPath='assets/data #1 (draft) %?.csv',guidePath='references/data #1 (guide).md';
 project.references.push({id:'reserved-reference',path:referencePath,content:'# Supporting notes'});
 project.originals.push({path:assetPath,content:'Name,Value\nExample,1\n'});
 project.resources.push({id:'reserved-asset',sourcePath:assetPath,policy:'retain',referencePath:guidePath,reviewed:true,structure:'Columns: Name and Value.',dependencies:[],untranslated:[],sourceHash:'',functionCount:0});
 project.steps[0].job+='\nRead [notes](references/guide%20%231%20%28draft%29%20%25.md#details).';
 const compiled=compile(project,{allowInvalid:true});
 for(const [from,content]of Object.entries(compiled))if(typeof content==='string')for(const target of markdownLinks(content)){const resolved=resolveRelative(from,target);if(resolved!==null)assert.ok(Object.hasOwn(compiled,resolved),from+' → '+target+' → '+resolved);}
 const files=await readZip(await writeZip(compiled).arrayBuffer()),imported=importMarkdownFiles(files),again=compile(imported,{allowInvalid:true});
 assert.equal(again[referencePath],compiled[referencePath]);assert.deepEqual(sourceBytes(imported.originals.find(file=>file.path===assetPath)),compiled[assetPath]);
 for(const [from,content]of Object.entries(again))if(typeof content==='string')for(const target of markdownLinks(content)){const resolved=resolveRelative(from,target);if(resolved!==null)assert.ok(Object.hasOwn(again,resolved),from+' → '+target+' → '+resolved);}
});
