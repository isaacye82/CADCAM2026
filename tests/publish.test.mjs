import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {validateSite,siteRoot} from '../scripts/validate-site.mjs';

test('发布目录全部页面、导航锚点及静态资源完整',async()=>{
  assert.equal((await validateSite()).length,13);
});
test('发布验证拒绝过期页面和失效资源引用',async()=>{
  const temporary=await mkdtemp(path.join(tmpdir(),'cadcam-publish-'));
  try{
    await cp(siteRoot,temporary,{recursive:true});
    await writeFile(path.join(temporary,'courses/stale.html'),'stale');
    await assert.rejects(validateSite(temporary),/Missing, stale or unexpected/);
    await rm(path.join(temporary,'courses/stale.html'));
    const home=path.join(temporary,'index.html');
    await writeFile(home,(await readFile(home,'utf8')).replace('</body>','<img src="missing.png"></body>'));
    await assert.rejects(validateSite(temporary),/Broken reference/);
  }finally{await rm(temporary,{recursive:true,force:true});}
});
