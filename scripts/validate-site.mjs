import assert from 'node:assert/strict';
import {readFile,readdir,lstat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {pages} from '../src/catalog.js';

export const siteRoot=fileURLToPath(new URL('../CADCAM2026_Show/',import.meta.url));
export const expectedFiles=['404.html','THIRD_PARTY_LICENSES.txt','index.html',...pages.map(p=>`courses/${p.slug}.html`)].sort();

export async function validateSite(root=siteRoot){
  const files=[];
  async function walk(dir=''){
    for(const name of await readdir(path.join(root,dir))){
      const relative=path.posix.join(dir,name),stat=await lstat(path.join(root,relative));
      assert.ok(!stat.isSymbolicLink(),`Unexpected symlink: ${relative}`);
      if(stat.isDirectory())await walk(relative);
      else {assert.ok(stat.isFile(),`Unexpected file type: ${relative}`);files.push(relative);}
    }
  }
  await walk();
  assert.deepEqual(files.sort(),expectedFiles,'Missing, stale or unexpected publish files');
  for(const file of files){
    const bytes=await readFile(path.join(root,file));
    assert.ok(bytes.length>0,`Empty file: ${file}`);
    if(!file.endsWith('.html'))continue;
    const html=bytes.toString();
    assert.ok(html.startsWith('<!doctype html>'),`Invalid HTML: ${file}`);
    const markup=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
    const references=[...markup.matchAll(/\b(?:href|src|poster)\s*=\s*["']([^"']*)["']/gi)].map(m=>m[1]);
    for(const [,css] of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)){
      for(const m of css.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/gi))references.push(m[1]);
    }
    assert.doesNotMatch(html,/<script\b[^>]*\bsrc\s*=/i,`Script must be embedded: ${file}`);
    for(const reference of references){
      if(!reference||reference.startsWith('#')||reference.startsWith('data:'))continue;
      const url=new URL(reference,`https://site.invalid/${file}`);
      assert.equal(url.origin,'https://site.invalid',`External dependency in ${file}: ${reference}`);
      let target=decodeURIComponent(url.pathname.slice(1));
      if(!target||target.endsWith('/'))target+='index.html';
      assert.ok(files.includes(target),`Broken reference in ${file}: ${reference}`);
      if(url.hash){
        const targetHTML=await readFile(path.join(root,target),'utf8');
        const id=decodeURIComponent(url.hash.slice(1));
        assert.ok(targetHTML.includes(`id="${id}"`)||targetHTML.includes(`id='${id}'`),`Missing anchor: ${reference}`);
      }
    }
    if(file!=='404.html'){
      assert.match(html,/<script>/,`Missing embedded application: ${file}`);
      assert.match(html,/<html lang="zh-CN">/);
    }
  }
  return files;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const files=await validateSite();
  console.log(`Validated ${files.length} publish files: homepage, ${pages.length} lessons, 404 and licenses; links and resource paths resolve.`);
}
