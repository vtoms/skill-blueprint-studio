export const FORMAT = 'Skill Blueprint Studio format 1';
export const PATHS = { process:'references/studio-process.md', definitions:'references/studio-definitions.md', screens:'references/studio-screens.md', examples:'references/studio-examples.md' };
export const uid = () => 'id-' + (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
export const copy = value => JSON.parse(JSON.stringify(value));
export const slugify = text => String(text).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,64).replace(/-$/,'');
export const oneLine = value => String(value ?? '').replace(/[\r\n]+/g,' ').trim();
export const quote = value => String(value ?? '').split('\n').map(line => '> ' + line).join('\n');
export const unquote = value => value.trim().split('\n').map(line => line.replace(/^> ?/,'')).join('\n').trim();

export function blankProject(title='Untitled skill') {
  return {schemaVersion:1,sourceOrigin:'authored',id:uid(),title,slug:slugify(title),description:'',purpose:'',input:'',outcome:'',instructions:'Ask for missing inputs. Do not invent facts or treat unavailable data as zero.',extraFrontmatter:'',revision:1,
    steps:[],definitions:[],references:[],resources:[],screens:{input:[],output:[],instructions:'',sampleRows:[]},scenarios:[],originals:[],importWarnings:[],warningsAcknowledged:false,createdAt:new Date().toISOString()};
}
export function newStep(title='New step') {
  return {id:uid(),title,kind:'Process',job:'',output:'',facets:[],references:[],resourceIds:[],exampleInput:'',exampleOutput:'',reviewed:true,source:null};
}
export function resourceKind(path){if(path.endsWith('.md'))return 'Markdown';if(/\.py$/i.test(path))return 'Python helper';if(/\.html?$/i.test(path))return 'HTML screen';if(/\.xsd$/i.test(path))return 'Schema';if(/\.xml$/i.test(path))return 'XML template';if(/(?:^|\/)license(?:\.[^/]*)?$/i.test(path))return 'License';return 'Source asset';}
function base64Bytes(bytes){let text='';for(let offset=0;offset<bytes.length;offset+=8192)text+=String.fromCharCode(...bytes.subarray(offset,offset+8192));return btoa(text);}
export function sourceBytes(resource){if(resource.encoding==='unavailable')throw new Error('Re-import the original archive to recover '+resource.path);if(resource.encoding==='base64')return Uint8Array.from(atob(resource.data),c=>c.charCodeAt(0));return new TextEncoder().encode(resource.content||'');}
export function preserveSource(path,payload){
  const bytes=typeof payload==='string'?new TextEncoder().encode(payload):payload;
  if(!(bytes instanceof Uint8Array))throw new Error('Unsupported source data: '+path);
  let content;try{content=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}catch{if(path.endsWith('.md'))throw new Error('Invalid UTF-8 Markdown: '+path);}
  return content===undefined?{path,kind:resourceKind(path),encoding:'base64',data:base64Bytes(bytes),content:null,size:bytes.length}:{path,kind:resourceKind(path),encoding:'utf-8',content,size:bytes.length};
}
export function inputFor(project,index) { return index ? project.steps[index-1].output : project.input; }
export function definitionValue(project,facet) {
  const definition=project.definitions.find(d=>d.id===facet.definitionId);
  return facet.override || definition?.value || '';
}
export function embeddedCode(text) {
  const source=String(text??'');
  if(/^(?:\s*>\s*)?\s*(`{3,}|~{3,})\s*(python\b|py\b|html\b|htm\b)/im.test(source))return true;
  // A single quoted tag name can describe a prohibition in English. Attributes,
  // tag bodies and executable blocks remain source content rather than prose.
  const prose=source.replace(/(`+)([^`\r\n]+?)\1/g,(whole,ticks,body)=>/^<\/?[a-z][\w:-]*\s*\/?>$/i.test(body.trim())?'':whole);
  return /<(?:html|head|body|script|div|iframe|style)\b[^>]*>/i.test(prose);
}
