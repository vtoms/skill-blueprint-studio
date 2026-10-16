import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url));
const modules=await Promise.all(['appearance.mjs','resources.mjs','independent-review.mjs','optimization-record.mjs','diagram-layout.mjs','skill-model.mjs','paths.mjs','skill-validation.mjs','skill-compiler.mjs','skill-reader.mjs','skill-import.mjs','core.mjs','skill-optimization.mjs','ux-content.mjs','context-help.mjs','chapter-view.mjs','resource-view.mjs','screen-view.mjs','zip.mjs','demo.mjs','workspace.mjs','workspace-view.mjs','workflow-order.mjs','tool-guidance.mjs','workflow-review.mjs','diagram-view.mjs','diagram-controller.mjs','workflow-view.mjs','persistence.mjs','app.mjs'].map(file=>readFile(join(root,file),'utf8')));
const script=modules.map(source=>source.replace(/^(?:import .*?;|export \{.*?\} from .*?;)\r?\n/gm,'').replace(/^export /gm,'')).join('\n');
const css=await readFile(join(root,'styles.css'),'utf8');const template=await readFile(join(root,'index.html'),'utf8');
const output=template.replace('<link rel="stylesheet" href="styles.css">',()=>'<style>'+css+'</style>').replace('<script type="module" src="app.mjs"></script>',()=>'<script type="module">'+script.replace(/<\/script/gi,'<\\/script')+'</script>');
await mkdir(join(root,'dist'),{recursive:true});await writeFile(join(root,'dist','skill-blueprint-studio.html'),output);console.log('Built studio/dist/skill-blueprint-studio.html ('+output.length+' characters)');
