export function safePath(path) {
  return typeof path==='string' && path.length>0 && path.length<240 && !/^[\/\\]|^[a-z]:/i.test(path) && !/[\\\x00-\x1f\x7f]|\p{Surrogate}/u.test(path) && !path.split('/').some(x=>!x||x==='.'||x==='..');
}
export function encodeMarkdownPath(path) {
  return path.split('/').map(part=>encodeURIComponent(part).replace(/[!'()*]/g,char=>'%'+char.charCodeAt(0).toString(16).toUpperCase())).join('/');
}
export function markdownLinks(text) {
  return [...String(text).matchAll(/!?\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)].map(m=>m[1]);
}
export function resolveRelative(from,target) {
  if(!safePath(from))return '__invalid__';
  if (/^[a-z][a-z\d+.-]*:|^#|^\/\//i.test(target)) return null;
  let decoded; try { decoded=decodeURIComponent(target.split('#')[0]); } catch { return '__invalid__'; }
  if (!decoded) return null;
  if (/^[\/]|^[a-z]:|[\\\x00-\x1f\x7f]/i.test(decoded)) return '__invalid__';
  const parts=from.split('/');parts.pop();
  for(const part of decoded.split('/')) {if(part==='..'){if(!parts.length)return '__invalid__';parts.pop();}else if(part!=='.'&&part)parts.push(part);}
  const resolved=parts.join('/');return safePath(resolved)?resolved:'__invalid__';
}
export function relocateLinks(text,from,to) {
  if(!safePath(to))return String(text);
  return String(text).replace(/(!?\[[^\]]*\]\()([^\s)]+)([^)]*\))/g,(match,start,target,end)=>{const resolved=resolveRelative(from,target);if(!resolved||resolved==='__invalid__')return match;const fromParts=to.split('/');fromParts.pop();const targetParts=resolved.split('/');while(fromParts.length&&targetParts.length&&fromParts[0]===targetParts[0]){fromParts.shift();targetParts.shift();}const relative='../'.repeat(fromParts.length)+targetParts.join('/');const anchor=target.includes('#')?'#'+target.split('#').slice(1).join('#'):'';return start+encodeMarkdownPath(relative)+anchor+end;});
}
