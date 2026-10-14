import {mkdir,writeFile} from 'node:fs/promises';
import {demoProject} from './demo.mjs';
import {compile} from './core.mjs';
import {writeZip} from './zip.mjs';
const p=demoProject();p.steps[2].facets[1].override='';
const files=compile(p);await mkdir(new URL('./dist/',import.meta.url),{recursive:true});
await writeFile(new URL('./dist/data-processing-workflow.zip',import.meta.url),new Uint8Array(await writeZip(Object.fromEntries(Object.entries(files).map(([path,text])=>[p.slug+'/'+path,text]))).arrayBuffer()));
await writeFile(new URL('./dist/data-processing-workflow.agentic.json',import.meta.url),JSON.stringify(p,null,2));
console.log('Prepared a reviewed-structure example ZIP and editable project; neither asserts runtime tests passed.');
