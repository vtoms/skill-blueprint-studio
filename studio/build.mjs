import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join,resolve} from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url));
export async function buildHtml(){
const modules=await Promise.all(['appearance.mjs','resources.mjs','attachments.mjs','reference-import.mjs','independent-review.mjs','review-report.mjs','optimization-record.mjs','diagram-layout.mjs','skill-model.mjs','paths.mjs','skill-validation.mjs','skill-compiler.mjs','skill-reader.mjs','skill-import.mjs','core.mjs','skill-optimization.mjs','ux-content.mjs','context-help.mjs','chapter-view.mjs','resource-view.mjs','review-view.mjs','screen-view.mjs','zip.mjs','demo.mjs','workspace.mjs','workspace-view.mjs','workflow-order.mjs','tool-guidance.mjs','workflow-review.mjs','diagram-view.mjs','diagram-controller.mjs','workflow-view.mjs','persistence.mjs','app.mjs'].map(file=>readFile(join(root,file),'utf8')));
const script=modules.map(source=>source.replace(/\r\n/g,'\n').replace(/^(?:import .*?;|export \{.*?\} from .*?;)\n/gm,'').replace(/^export /gm,'')).join('\n');
const css=(await readFile(join(root,'styles.css'),'utf8')).replace(/\r\n/g,'\n');const template=(await readFile(join(root,'index.html'),'utf8')).replace(/\r\n/g,'\n');
const output=template.replace('<link rel="stylesheet" href="styles.css">',()=>'<style>'+css+'</style>').replace('<script type="module" src="app.mjs"></script>',()=>'<script type="module">'+script.replace(/<\/script/gi,'<\\/script')+'</script>');
return output;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){const output=await buildHtml();await mkdir(join(root,'dist'),{recursive:true});await writeFile(join(root,'dist','skill-blueprint-studio.html'),output);console.log('Built studio/dist/skill-blueprint-studio.html ('+output.length+' characters)');}
