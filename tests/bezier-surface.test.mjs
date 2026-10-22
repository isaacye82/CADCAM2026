import test from 'node:test';
import assert from 'node:assert/strict';
import {bernsteinWeights,bernsteinBezier} from '../src/math.js';
import {surfaceTypes,surfaceGrid,surfacePoint,auxiliaryPoints,tensorPoint,surfaceNormal} from '../src/bezier-surface.js';
import {surfaceShaders} from '../src/surface-shaders.js';
const close=(a,b,tol=1e-10)=>a.forEach((x,i)=>assert.ok(Math.abs(x-b[i])<tol,`${a} != ${b}`));
for(const [type,{m,n}]of Object.entries(surfaceTypes)){
  test(`${type}: (${m},${n}) 网格、四角、边界、凸包与两种张量积次序`,()=>{
    const grid=surfaceGrid(m,n);assert.equal(grid.length,m+1);assert.ok(grid.every(row=>row.length===n+1));
    for(const [u,v,i,j]of [[0,0,0,0],[1,0,m,0],[0,1,0,n],[1,1,m,n]])close(surfacePoint(grid,u,v),grid[i][j]);
    for(const u of [0,.001,.23,.5,.87,1])for(const v of [0,.16,.5,.93,1]){
      const point=surfacePoint(grid,u,v);close(point,tensorPoint(grid,u,v,'u'));close(point,tensorPoint(grid,u,v,'v'));
      const bu=bernsteinWeights(m,u),bv=bernsteinWeights(n,v),weights=bu.flatMap(a=>bv.map(b=>a*b));assert.ok(weights.every(w=>w>=0));assert.ok(Math.abs(weights.reduce((a,b)=>a+b)-1)<1e-12);
      // A supporting halfspace containing all controls must contain the surface.
      for(const normal of [[1,0,0],[0,1,0],[0,0,1],[1,-2,3],[-2,1,.5]]){const project=p=>p.reduce((s,x,i)=>s+x*normal[i],0),values=grid.flat().map(project);assert.ok(project(point)>=Math.min(...values)-1e-10&&project(point)<=Math.max(...values)+1e-10);}
    }
    for(const t of [0,.27,.9,1]){close(surfacePoint(grid,0,t),bernsteinBezier(grid[0],t));close(surfacePoint(grid,t,1),bernsteinBezier(grid.map(row=>row[n]),t));}
  });
}
test('辅助点数量、控制点编辑的权重响应和构造联动',()=>{
  const grid=surfaceGrid(2,3),u=.31,v=.62,before=surfacePoint(grid,u,v),oldAux=auxiliaryPoints(grid,v,'u');
  assert.equal(oldAux.length,3);assert.equal(auxiliaryPoints(grid,u,'v').length,4);
  grid[1][2][1]+=2;
  const after=surfacePoint(grid,u,v),weight=bernsteinWeights(2,u)[1]*bernsteinWeights(3,v)[2];close(after,[before[0],before[1]+2*weight,before[2]]);
  assert.notEqual(auxiliaryPoints(grid,v,'u')[1][1],oldAux[1][1]);close(after,tensorPoint(grid,u,v,'u'));close(after,tensorPoint(grid,u,v,'v'));
});
test('解析曲面法线与差分切矢垂直，平面和退化网格均有限',()=>{
  const grid=surfaceGrid(4,4),u=.32,v=.67,h=1e-6,normal=surfaceNormal(grid,u,v);
  assert.ok(Math.abs(Math.hypot(...normal)-1)<1e-10);
  for(const [a,b]of [[surfacePoint(grid,u+h,v),surfacePoint(grid,u-h,v)],[surfacePoint(grid,u,v+h),surfacePoint(grid,u,v-h)]])assert.ok(Math.abs(a.reduce((s,x,i)=>s+(x-b[i])*normal[i]/(2*h),0))<1e-8);
  close(surfaceNormal(surfaceGrid(2,2).map(row=>row.map(p=>[p[0],0,p[2]])),.5,.5),[0,1,0]);
  assert.ok(surfaceNormal(Array.from({length:3},()=>Array.from({length:3},()=>[0,0,0])),.5,.5).every(Number.isFinite));
});
test('三个 Shader 策略使用共享反射模型，并在不同阶段求光照',()=>{
  const flat=surfaceShaders('flat'),gouraud=surfaceShaders('gouraud'),phong=surfaceShaders('phong');
  assert.match(flat.vertexShader,/lit=illuminate\(\(modelViewMatrix\*vec4\(faceCenter/);assert.match(flat.vertexShader,/normalMatrix\*faceNormal/);
  assert.match(gouraud.vertexShader,/lit=illuminate\(p.xyz,normalMatrix\*normal\)/);assert.match(gouraud.fragmentShader,/vec3 color=lit;/);
  assert.doesNotMatch(phong.vertexShader,/lit=illuminate/);assert.match(phong.fragmentShader,/vec3 color=illuminate\(viewPos,normalize\(viewNormal\)\)/);
  for(const shaders of [flat,gouraud,phong])for(const shader of Object.values(shaders))assert.match(shader,/float s=d>0.0\?pow/);
});
