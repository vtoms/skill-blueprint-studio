// A shared, text-only help layer. The active modal owns it when one is open.
export function createContextHelp({document:helpDocument=globalThis.document,window:helpWindow=globalThis.window,topics={}}={}){
 const layer=helpDocument.createElement('aside');layer.id='context-help';layer.className='context-help';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','false');layer.setAttribute('aria-labelledby','context-help-title');layer.tabIndex=-1;
 const nativePopover=typeof layer.showPopover==='function';if(nativePopover)layer.setAttribute('popover','auto');else layer.hidden=true;
 const header=helpDocument.createElement('header'),heading=helpDocument.createElement('h2'),closeButton=helpDocument.createElement('button'),body=helpDocument.createElement('div');
 heading.id='context-help-title';closeButton.type='button';closeButton.className='help-close';closeButton.setAttribute('aria-label','Close information');closeButton.textContent='×';body.id='context-help-body';body.className='context-help-body';layer.setAttribute('aria-describedby',body.id);header.append(heading,closeButton);layer.append(header,body);helpDocument.body.append(layer);
 let trigger=null,opened=false,frame=0;
 const viewport=()=>{const view=helpWindow.visualViewport;return {left:view?.offsetLeft||0,top:view?.offsetTop||0,width:view?.width||helpWindow.innerWidth,height:view?.height||helpWindow.innerHeight};};
 function close({restoreFocus=true}={}){
  if(!opened)return;opened=false;const previous=trigger;trigger=null;previous?.setAttribute('aria-expanded','false');
  if(nativePopover){if(layer.matches(':popover-open'))layer.hidePopover();}else layer.hidden=true;
  if(restoreFocus&&previous?.isConnected)previous.focus({preventScroll:true});
 }
 function position(){
  frame=0;if(!opened)return;if(!trigger?.isConnected){close({restoreFocus:false});return;}
  const area=viewport(),gap=16,anchor=trigger.getBoundingClientRect();layer.style.width=Math.min(360,area.width-gap*2)+'px';layer.style.maxHeight=Math.max(100,area.height-gap*2)+'px';
  const size=layer.getBoundingClientRect();let left=Math.min(Math.max(area.left+gap,anchor.left),area.left+area.width-size.width-gap),top=anchor.bottom+10;
  if(area.width<=600){left=area.left+gap;top=area.top+area.height-size.height-gap;}
  else if(top+size.height>area.top+area.height-gap)top=anchor.top-size.height-10;
  top=Math.max(area.top+gap,Math.min(top,area.top+area.height-size.height-gap));layer.style.left=left+'px';layer.style.top=top+'px';
 }
 function queuePosition(){if(opened&&!frame)frame=helpWindow.requestAnimationFrame(position);}
 function open(button,key){
  const topic=topics[key];if(!topic)return false;
  if(opened&&trigger===button){close();return true;}close({restoreFocus:false});
  trigger=button;heading.textContent=topic.title;body.replaceChildren();
  for(const text of topic.body){const paragraph=helpDocument.createElement('p');paragraph.textContent=text;body.append(paragraph);}
  if(topic.example){const example=helpDocument.createElement('div'),label=helpDocument.createElement('strong'),text=helpDocument.createElement('p');example.className='context-help-example';label.textContent='Example';text.textContent=topic.example;example.append(label,text);body.append(example);}
  const host=button.closest('dialog[open]')||helpDocument.body;host.append(layer);opened=true;button.setAttribute('aria-expanded','true');button.setAttribute('aria-controls',layer.id);
  if(nativePopover)layer.showPopover();else layer.hidden=false;position();layer.focus({preventScroll:true});return true;
 }
 closeButton.addEventListener('click',()=>close());
 layer.addEventListener('toggle',event=>{if(event.newState==='closed'&&opened&&(!nativePopover||!layer.matches(':popover-open')))close({restoreFocus:layer.contains(helpDocument.activeElement)});});
 helpDocument.addEventListener('click',event=>{const button=event.target.closest?.('[data-help]');if(!button)return;event.preventDefault();event.stopPropagation();open(button,button.dataset.help);},true);
 helpDocument.addEventListener('keydown',event=>{
  if(!opened)return;
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();return;}
  if(event.key==='Tab'&&layer.contains(helpDocument.activeElement)){
   const controls=[...layer.querySelectorAll('button,a[href],input,select,textarea,[tabindex]')].filter(element=>element.tabIndex>=0&&!element.disabled&&element.getClientRects().length),active=helpDocument.activeElement;
   if(event.shiftKey&&(active===layer||active===controls[0])){event.preventDefault();close();}
   else if(!event.shiftKey&&(!controls.length||active===controls.at(-1))){const previous=trigger,host=previous.closest('dialog[open]')||helpDocument;close({restoreFocus:false});const pageControls=[...host.querySelectorAll('button,a[href],input,select,textarea,[tabindex]')].filter(element=>element.tabIndex>=0&&!element.disabled&&!layer.contains(element)&&element.getClientRects().length);event.preventDefault();(pageControls[pageControls.indexOf(previous)+1]||previous).focus({preventScroll:true});}
  }
 },true);
 helpDocument.addEventListener('pointerdown',event=>{if(opened&&!layer.contains(event.target)&&!trigger?.contains(event.target))close({restoreFocus:false});},true);
 helpDocument.addEventListener('focusin',event=>{if(opened&&!layer.contains(event.target)&&event.target!==trigger)close({restoreFocus:false});});
 helpDocument.addEventListener('scroll',queuePosition,true);helpWindow.addEventListener('resize',queuePosition);helpWindow.visualViewport?.addEventListener('resize',queuePosition);helpWindow.visualViewport?.addEventListener('scroll',queuePosition);
 return {open,close,refresh:queuePosition,get isOpen(){return opened;},element:layer};
}
