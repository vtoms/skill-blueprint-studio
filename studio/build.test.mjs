import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

test('distributed browser bundle parses as a JavaScript module',async()=>{
 const html=await readFile(new URL('./dist/skill-blueprint-studio.html',import.meta.url),'utf8'),script=html.match(/<script type="module">([\s\S]*)<\/script>/)?.[1];assert.ok(script,'The distributed application must include its module.');
 execFileSync(process.execPath,['--check','--input-type=module'],{input:script,encoding:'utf8',windowsHide:true});
});
