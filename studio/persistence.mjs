// The browser keeps the working copy; the local server owns durable storage.
export function createWorkspacePersistence({request=globalThis.fetch?.bind(globalThis),preview=false,onStatus=()=>{},delay=200}={}){
  let revision=0,lastSaved='',pending='',inFlight=null,timer=null,blocked=false,loaded=false,status=preview?'preview':'loading';
  const report=(state,message='')=>{status=state;onStatus({state,message});};
  const hasChanges=()=>Boolean(pending||inFlight);
  async function load(){
    if(preview){loaded=true;report('preview');return null;}
    report('loading');
    try{
      const response=await request('/api/workspace',{cache:'no-store'}),result=await response.json();
      if(!response.ok)throw new Error(result.error||'The local database could not be opened.');
      if(!Number.isSafeInteger(result.revision)||!result.workspace)throw new Error('Invalid database response.');
      revision=result.revision;lastSaved=JSON.stringify(result.workspace);pending='';blocked=false;loaded=true;report('saved');return result.workspace;
    }catch(error){loaded=false;blocked=true;report('unavailable',error.message);throw error;}
  }
  function schedule(workspace){
    if(preview){report('preview');return;}
    if(!loaded)return;
    const payload=JSON.stringify(workspace);
    if(payload===lastSaved&&!inFlight){pending='';clearTimeout(timer);if(!blocked)report('saved');return;}
    pending=payload;
    if(blocked)return;
    report('saving');clearTimeout(timer);timer=setTimeout(()=>{flush().catch(()=>{});},delay);
  }
  async function flush(){
    clearTimeout(timer);
    if(preview||!loaded||blocked)return false;
    if(inFlight){await inFlight;return pending&&!blocked?flush():!blocked;}
    if(!pending||pending===lastSaved){pending='';report('saved');return true;}
    const payload=pending;pending='';report('saving');
    inFlight=(async()=>{
      try{
        const response=await request('/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,workspace:JSON.parse(payload)})}),result=await response.json();
        if(!response.ok){const error=new Error(result.error||'The database save failed.');error.conflict=response.status===409;throw error;}
        if(!Number.isSafeInteger(result.revision))throw new Error('Invalid save acknowledgment.');
        revision=result.revision;lastSaved=payload;if(pending===lastSaved)pending='';
        if(!pending)report('saved');return true;
      }catch(error){if(!pending)pending=payload;blocked=true;report(error.conflict?'conflict':'error',error.message);return false;}
    })();
    const result=await inFlight;inFlight=null;
    if(pending&&!blocked){timer=setTimeout(()=>{flush().catch(()=>{});},delay);}return result;
  }
  async function retry(){if(status==='conflict')return false;blocked=false;return loaded?flush():load();}
  async function reload(){if(inFlight)await inFlight;return load();}
  return {load,schedule,flush,retry,reload,hasChanges,get status(){return status;},get revision(){return revision;}};
}
