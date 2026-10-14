import {blankProject,newStep} from './core.mjs';

export function demoProject(){
 const p=blankProject('Data processing workflow');
 p.slug='data-processing-workflow';
 p.description='Collect a task, read approved source data, apply explicit processing rules, and present traceable results. Use for a guided data review.';
 p.purpose='Make each transformation, shared rule, and expected result reviewable before exporting a skill.';
 p.input='Task request';
 p.outcome='Present results with status, evidence, and explicit missing-information states.';
 p.instructions='Ask for missing required inputs. Use only the configured read-only connection. If it is unavailable, explain what is needed. Preserve the agreed scope and evidence. Do not invent data or silently assume defaults.';
 p.definitions=[
  {id:'missing-policy',name:'Missing information policy',value:'Ask for clarification',runtimeInput:'Missing information policy',intent:'Use the same missing-information decision in every linked step.'},
  {id:'evidence-policy',name:'Evidence policy',value:'Keep source identifiers',runtimeInput:'',intent:'Each result must identify the records or rules supporting it.'}
 ];
 p.references=[{id:'processing-rules',path:'references/processing-rules.md',content:'# Processing rules\n\nIllustrative rules for this demonstration. Review and replace them for your task.\n\n## Records\nProcess only the selected records. Preserve source identifiers and original values.\n\n## Missing information\nUse the selected shared policy. Ask for clarification or mark the affected result unavailable. Never silently invent a value.\n\n## Results\nFor each item, show the result, its status, and its evidence. Record uncertainty and any rule that could not be applied.\n'}];
 const facet=(id,title,type,instructions,extra={})=>({id,title,type,instructions,definitionId:'',override:'',connection:'',operation:'',...extra});
 const steps=[
  ['brief','Collect inputs','Input','Confirmed task','Collect the task, source, output format, and missing-information policy. Confirm the scope before proceeding.',[
   facet('scope','Required input','Instruction','Ask for all required input values.'),
   facet('input-policy','Missing information','Business rule','Use the shared policy for incomplete inputs.',{definitionId:'missing-policy'})
  ],'Task: Review selected records; source: approved collection; output: table.','A confirmed task and processing scope.'],
  ['plan','Define processing rules','Select','Processing plan','Read the reference rules. Identify the required fields, transformations, and expected results.',[
   facet('rules-link','Approved rules','Reference','Use the processing reference. Ask for a definition when a required rule is missing.'),
   facet('contracts','Data contract','Business rule','Make required input fields and result meanings explicit.')
  ],'Confirmed task and selected source.','An ordered plan of transformations and required evidence.'],
  ['retrieve','Read source data','Retrieve','Source records','Read the records needed by the processing plan using the configured connection. Preserve the source identifiers and agreed scope.',[
   facet('connection','Read through a tool','Tool','Read only the approved records. Report authorization or connection failures.',{connection:'Configured read-only connection',operation:'Read selected records'}),
   facet('retrieval-policy','Incomplete records','Business rule','Use the shared policy for incomplete source records.',{definitionId:'missing-policy',override:'Assume a default'}),
   facet('traceability','Preserve evidence','Instruction','Keep source identifiers with the records.',{definitionId:'evidence-policy'})
  ],'Processing plan and confirmed scope.','Selected records, their identifiers, and any missing information.'],
  ['process','Apply processing rules','Transform','Reviewed results','Apply each approved rule to the selected records. Keep the original values, result status, and evidence.',[
   facet('transformation','Apply the plan','Instruction','Apply the ordered transformations. Explain any rule that could not be applied.'),
   facet('missing','Unavailable result','Exception','Use the shared policy when required information is missing.',{definitionId:'missing-policy'})
  ],'Source records and processing plan.','Results, status, evidence, and reasons for unavailable results.'],
  ['present','Present results','Output','Results table','Present the output screen in the specified column order. Include the agreed scope and ask the user to review the results.',[
   facet('screen','Output presentation','Instruction','Preserve the Item, Result, Status, Evidence column order.'),
   facet('review','User review','Decision','Record corrections to the scope or processing rules.')
  ],'Reviewed results and supporting evidence.','A results table ready for user review.']
 ];
 p.steps=steps.map(([id,title,kind,output,job,facets,exampleInput,exampleOutput])=>({...newStep(title),id,kind,output,job,facets,exampleInput,exampleOutput,references:id==='brief'||id==='present'?[]:['references/processing-rules.md']}));
 p.screens={
  instructions:'Show the input screen before reading data. Keep the scope visible on the output screen. Preserve field and column order. Show unavailable results with their reasons. Use the host\'s supported UI capabilities.',
  input:[
   {id:'task',label:'Task',type:'Text',required:true,defaultValue:'Review selected records',options:[]},
   {id:'source',label:'Source',type:'Text',required:true,defaultValue:'Approved collection',options:[]},
   {id:'format',label:'Output format',type:'Select',required:true,defaultValue:'Table',options:['Table','Summary']},
   {id:'policy',label:'Missing information policy',type:'Select',required:true,defaultValue:'Ask for clarification',options:['Ask for clarification','Mark unavailable'],definitionId:'missing-policy'}
  ],
  output:['Item','Result','Status','Evidence'],
  sampleRows:[
   {Item:'Record A',Result:'Rule applied',Status:'Complete',Evidence:'Source A'},
   {Item:'Record B',Result:'Needs clarification',Status:'Pending',Evidence:'Source B'},
   {Item:'Record C',Result:'Unavailable',Status:'Incomplete',Evidence:'Required field missing'}
  ]
 };
 p.scenarios=[
  {id:'normal',name:'Complete source records',input:'All required fields and the approved processing rules are available.',expected:'Apply the plan and present each result with its status and evidence.',status:'Not tested',testedRevision:null,observations:''},
  {id:'gap',name:'Missing required field',input:'One selected record is missing a required field.',expected:'Apply the shared policy, explain the gap, and keep unaffected results visible.',status:'Not tested',testedRevision:null,observations:''}
 ];
 return p;
}
