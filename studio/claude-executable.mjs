import {accessSync,constants,statSync} from 'node:fs';
import {win32,posix} from 'node:path';

function executableFile(filename,platform){
 try{if(!statSync(filename).isFile())return false;accessSync(filename,platform==='win32'?constants.F_OK:constants.X_OK);return true;}catch{return false;}
}

// Resolve a file directly; user prompts never pass through a shell or npm shim.
export function claudeExecutable(environment=process.env,{platform=process.platform,isExecutable=filename=>executableFile(filename,platform)}={}){
 if(environment.STUDIO_CLAUDE_PATH)return environment.STUDIO_CLAUDE_PATH;
 const windows=platform==='win32',paths=windows?win32:posix,name=windows?'claude.exe':'claude';
 const directories=(environment.PATH||environment.Path||'').split(windows?';':':').map(value=>value.trim().replace(/^"(.*)"$/,'$1')).filter(Boolean);
 const candidates=[];
 if(windows&&environment.USERPROFILE)candidates.push(paths.join(environment.USERPROFILE,'.local','bin',name));
 for(const directory of directories){
  candidates.push(paths.resolve(directory,name));
  if(windows)candidates.push(paths.resolve(directory,'node_modules','@anthropic-ai','claude-code','bin','claude.exe'));
 }
 if(windows&&environment.APPDATA)candidates.push(paths.join(environment.APPDATA,'npm','node_modules','@anthropic-ai','claude-code','bin','claude.exe'));
 if(!windows&&environment.HOME)candidates.push(paths.join(environment.HOME,'.local','bin','claude'));
 return [...new Set(candidates)].find(isExecutable)||name;
}
