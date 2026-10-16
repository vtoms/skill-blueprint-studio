import {REVIEW_POLICY_VERSION,REVIEW_TOPICS} from './independent-review.mjs';

export function parseReviewerReport(text){
 if(typeof text!=='string'||text.length>2*1024*1024)throw new Error('Review reports must be text up to 2 MB.');
 const trimmed=text.trim(),fence=trimmed.match(/^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/i);
 try{return JSON.parse(fence?fence[1]:trimmed);}catch{throw new Error('Paste the completed JSON report, with or without its surrounding JSON code fence.');}
}

export function reviewerPrompt(packet){return packet.reviewInstructions+'\n\nReview the attached packet. Return only the completed JSON report from reportTemplate. Keep this exact reviewedDigest: '+packet.reviewedDigest+'. Do not calculate a replacement digest or claim tests were run unless there is real execution evidence.';}

const reviewSchemaText=(maxLength=4000)=>({type:'string',minLength:1,maxLength});
const reviewSchemaObject=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
export function reviewerReportSchema(packet,identity){
 return reviewSchemaObject({
  type:{type:'string',enum:['independent-skill-review']},schemaVersion:{type:'integer',enum:[1]},policyVersion:{type:'string',enum:[REVIEW_POLICY_VERSION]},reviewedDigest:{type:'string',enum:[packet.reviewedDigest]},
  reviewer:reviewSchemaObject({identity:{type:'string',enum:[identity]},role:{type:'string',enum:['independent-reviewer']},context:{type:'string',enum:['fresh']},independentOfAuthors:{type:'boolean',enum:[true]}}),
  scopes:{type:'array',items:{type:'string',enum:['original-source','converted-draft']},minItems:2,maxItems:2},outcome:{type:'string',enum:['pass','changes-required']},summary:reviewSchemaText(8000),
  checks:{type:'array',minItems:REVIEW_TOPICS.length,maxItems:REVIEW_TOPICS.length,items:reviewSchemaObject({topic:{type:'string',enum:REVIEW_TOPICS},result:{type:'string',enum:['pass','finding','not-applicable']},reason:reviewSchemaText(),evidence:{type:'array',items:reviewSchemaText(2000),minItems:1,maxItems:8}})},
  licensing:reviewSchemaObject({status:{type:'string',enum:['permitted','unknown','restricted']},basis:reviewSchemaText()}),
  findings:{type:'array',maxItems:20,items:reviewSchemaObject({id:reviewSchemaText(100),severity:{type:'string',enum:['critical','high','medium','low']},status:{type:'string',enum:['open','resolved']},description:reviewSchemaText(),location:reviewSchemaText(),evidence:reviewSchemaText(),expected:reviewSchemaText(),actual:reviewSchemaText(),adversarialCase:reviewSchemaText(),resolutionEvidence:{type:'string',maxLength:4000}})}
 });
}
