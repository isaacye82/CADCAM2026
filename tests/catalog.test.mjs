import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {lessons,pages,experimentLabel} from '../src/catalog.js';
test('12 个作业具有14个唯一入口，作业11按A/B/C连接10与12',()=>{
  assert.equal(lessons.length,12);assert.equal(new Set(pages.map(p=>p.slug)).size,14);
  const start=pages.findIndex(p=>p.id===10);
  assert.deepEqual(pages.slice(start,start+5).map(p=>p.slug),['10.bezier','11.bezier-surface','11.bezier-interpolation','11.bezier-tensor-product_surface','12.bspline']);
  assert.deepEqual(pages.filter(p=>p.id===11).map(experimentLabel),['作业 11 · 实验 A','作业 11 · 实验 B','作业 11 · 实验 C']);
});
test('新增独立页面保留原教学脚本并带有课程目录与正确前后导航',async()=>{
  for(const page of pages.filter(p=>p.standalone)){
    const source=await readFile(`src/standalone/${page.slug}.html`,'utf8'),output=await readFile(`CADCAM2026_Show/courses/${page.slug}.html`,'utf8');
    const scripts=[...source.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    for(const [,script]of scripts)assert.ok(output.includes(script),'Teaching script preserved');
    const i=pages.indexOf(page);for(const href of ['../index.html',pages[i-1].slug+'.html',pages[i+1].slug+'.html'])assert.ok(output.includes(`href="${href}"`));
  }
});
