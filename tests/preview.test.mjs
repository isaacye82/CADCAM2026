import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {pages} from '../src/catalog.js';
import {siteRoot} from '../scripts/validate-site.mjs';

test('预览从任意工作目录提供全部课程及404响应', {timeout:15000},async()=>{
  const reservation=createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');
  const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
  const server=spawn(process.execPath,[fileURLToPath(new URL('../scripts/serve.mjs',import.meta.url))],{
    cwd:tmpdir(),env:{...process.env,HOST:'127.0.0.1',PORT:String(port)},stdio:['ignore','pipe','pipe']
  });
  const closed=once(server,'exit');
  try{
    await Promise.race([once(server.stdout,'data'),closed.then(()=>{throw new Error('Preview exited before readiness');})]);
    for(const file of ['index.html',...pages.map(p=>`courses/${p.slug}.html`)]){
      const response=await fetch(`http://127.0.0.1:${port}/${file}`);
      assert.equal(response.status,200,file);
      assert.match(response.headers.get('content-type'),/text\/html/);
      assert.equal(await response.text(),await readFile(`${siteRoot}/${file}`,'utf8'));
    }
    assert.equal((await fetch(`http://127.0.0.1:${port}/`)).status,200);
    assert.equal((await fetch(`http://127.0.0.1:${port}/missing.html`)).status,404);
  }finally{server.kill();await closed;}
});
