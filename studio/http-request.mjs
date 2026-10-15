export class HttpError extends Error {
 constructor(status,message){super(message);this.status=status;}
}

export function assertLocalRequest(req,port){
 const hosts=['127.0.0.1:'+port,'localhost:'+port];
 if(!hosts.includes(req.headers.host)||req.headers.origin&&!hosts.map(host=>'http://'+host).includes(req.headers.origin)||req.headers['sec-fetch-site']==='cross-site')throw new HttpError(403,'Use the local application to access its services.');
}

export function jsonResponse(res,status,value){
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 res.end(JSON.stringify(value));
}

export async function readJsonRequest(req,limit){
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))throw new HttpError(400,'Send a JSON request.');
 const declared=Number(req.headers['content-length']);
 if(Number.isFinite(declared)&&declared>limit)throw new HttpError(413,'The request exceeds its size limit.');
 const chunks=[];let length=0;
 for await(const chunk of req){length+=chunk.length;if(length>limit)throw new HttpError(413,'The request exceeds its size limit.');chunks.push(chunk);}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new HttpError(400,'Send valid JSON.');}
}
