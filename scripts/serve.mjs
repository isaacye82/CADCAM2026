import http from 'node:http';import {readFile} from 'node:fs/promises';import path from 'node:path';
const host=process.env.HOST||'127.0.0.1';
const port=Number(process.env.PORT||4173);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be an integer between 1 and 65535');
const base=path.resolve('dist');const server=http.createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(base,'.'+(name.endsWith('/')?name+'index.html':name));if(file!==base&&!file.startsWith(base+path.sep)){res.writeHead(403);return res.end();}const bytes=await readFile(file);res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream');res.end(bytes);}catch{res.writeHead(404);res.end('Not found');}});server.listen(port,host,()=>console.log(`Preview: http://${host.includes(':')?`[${host}]`:host}:${port}`));
