// Appearance belongs to the local workspace, never to a skill's instructions.
export function createAppearance({document=globalThis.document,media=globalThis.matchMedia('(prefers-color-scheme: dark)'),onChange=()=>{}}={}){
 const button=document.querySelector('#theme-toggle');let preference;
 function apply(){
  const theme=preference||(media.matches?'dark':'light'),dark=theme==='dark';
  document.documentElement.dataset.theme=theme;
  button.setAttribute('aria-pressed',String(dark));
  button.setAttribute('aria-label',dark?'Switch to light theme':'Switch to dark theme');
  button.title=dark?'Switch to light theme':'Switch to dark theme';
  button.querySelector('[data-theme-label]').textContent=dark?'Dark':'Light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#101722':'#f5f7fb');
 }
 function setPreference(value){preference=['light','dark'].includes(value)?value:undefined;apply();}
 const systemChanged=()=>{if(!preference)apply();};
 media.addEventListener('change',systemChanged);
 button.addEventListener('click',()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';setPreference(theme);onChange(theme);});
 apply();return {setPreference,destroy(){media.removeEventListener('change',systemChanged);}};
}
