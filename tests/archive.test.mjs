import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {unzipSync} from 'fflate';
import {expectedFiles,siteRoot} from '../scripts/validate-site.mjs';
test('自动生成的 ZIP 与当前发布目录逐文件一致且仅有一个顶层目录',async()=>{
  const archive=unzipSync(new Uint8Array(await readFile(new URL('../CADCAM2026_Show.zip',import.meta.url))));
  assert.deepEqual(Object.keys(archive).sort(),expectedFiles.map(file=>`CADCAM2026_Show/${file}`).sort());
  for(const file of expectedFiles)assert.deepEqual(archive[`CADCAM2026_Show/${file}`],new Uint8Array(await readFile(`${siteRoot}/${file}`)),file);
});
