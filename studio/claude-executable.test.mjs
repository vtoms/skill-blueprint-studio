import test from 'node:test';
import assert from 'node:assert/strict';
import {claudeExecutable} from './claude-executable.mjs';

test('Windows discovers native and npm-installed Claude without executing a command shim',()=>{
 const environment={USERPROFILE:'X:\\Example User',APPDATA:'X:\\Example User\\Roaming',PATH:'"X:\\Tools With Spaces";X:\\npm'},native='X:\\Example User\\.local\\bin\\claude.exe',npm='X:\\npm\\node_modules\\@anthropic-ai\\claude-code\\bin\\claude.exe',appdata='X:\\Example User\\Roaming\\npm\\node_modules\\@anthropic-ai\\claude-code\\bin\\claude.exe';
 for(const expected of [native,npm,appdata,'X:\\Tools With Spaces\\claude.exe'])assert.equal(claudeExecutable(environment,{platform:'win32',isExecutable:path=>path===expected}),expected);
 const checked=[];assert.equal(claudeExecutable(environment,{platform:'win32',isExecutable:path=>{checked.push(path);return path===native||path===npm;}}),native);assert.ok(checked.every(path=>path.endsWith('.exe')));
});
test('Mac/Linux support PATH and native user installs; explicit configuration retains priority',()=>{
 for(const platform of ['darwin','linux'])for(const expected of ['/tools/claude','/example-home/.local/bin/claude'])assert.equal(claudeExecutable({HOME:'/example-home',PATH:'/tools:/usr/bin'},{platform,isExecutable:path=>path===expected}),expected);
 assert.equal(claudeExecutable({STUDIO_CLAUDE_PATH:'/explicit/claude'},{platform:'linux',isExecutable:()=>{throw new Error('Override must not search.');}}),'/explicit/claude');
 assert.equal(claudeExecutable({},{platform:'linux',isExecutable:()=>false}),'claude');assert.equal(claudeExecutable({},{platform:'win32',isExecutable:()=>false}),'claude.exe');
});
