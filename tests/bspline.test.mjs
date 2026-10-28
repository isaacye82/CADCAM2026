import test from 'node:test';
import assert from 'node:assert/strict';
import {uniformKnots,clampedKnots,splineError,knotSpans,domain,findSpan,basisLevels,basisValues,basisPoint,deBoor,splineDerivative,heartKnots,heartPoints,sampledSpans} from '../src/bspline.js';
import {bernsteinWeights,bernsteinBezier,casteljau,bezierDerivativeOrder,seededPoints} from '../src/math.js';
const close=(a,b,tol=1e-9)=>a.forEach((x,i)=>assert.ok(Math.abs(x-b[i])<tol,`${a} != ${b}`));
for(const k of [0,1,2,3,4,5])test(`${k} 次：节点关系、分段、独立求值、端点与局部支撑`,()=>{
  const d=seededPoints(9,721).map(x=>x.p),U=uniformKnots(d.length,k);
  assert.equal(splineError(d,U,k),'');assert.equal(U.length,d.length+k+1);assert.equal(knotSpans(U,k).length,d.length-k);close(domain(U,k),[0,d.length-k]);
  for(const u of [0,.17,1,2.43,d.length-k]){const w=basisValues(U,k,u);assert.ok(w.every(x=>x>=-1e-12));assert.ok(Math.abs(w.reduce((a,b)=>a+b)-1)<1e-10);assert.ok(w.filter(x=>x>1e-12).length<=k+1);close(deBoor(d,U,k,u).point,basisPoint(d,U,k,u));}
  const d2=[...d,[4,2,1]],U2=uniformKnots(d2.length,k);assert.equal(knotSpans(U2,k).length,knotSpans(U,k).length+1);
  for(const u of [.1,.6,1.2])close(deBoor(d,U,k,u).point,deBoor(d2,U2,k,u).point);
  const changed=d.map(p=>p.slice());changed[3][1]+=2;
  for(const u of [0,.2,1.5,3.2,Math.min(4.9,d.length-k)]){
    const before=deBoor(d,U,k,u).point,after=deBoor(changed,U,k,u).point;close(after,[before[0],before[1]+2*basisValues(U,k,u)[3],before[2]]);
  }
});
test('均匀三次各段与独立显式三次公式一致',()=>{
  const d=seededPoints(8,18).map(x=>x.p),U=uniformKnots(8,3);
  for(let s=0;s<5;s++)for(const u of [0,.12,.5,.98,1]){
    const w=[(1-u)**3,3*u**3-6*u*u+4,-3*u**3+3*u*u+3*u+1,u**3].map(x=>x/6);
    close(deBoor(d,U,3,s+u).point,[0,1,2].map(h=>w.reduce((sum,x,j)=>sum+x*d[s+j][h],0)));
  }
});
test('所有次数的简单内部节点以解析左右导数验证 C^(k-1)',()=>{
  for(const k of [1,2,3,4,5]){const d=seededPoints(9,83).map(x=>x.p),U=uniformKnots(9,k);
    for(let u=1;u<9-k;u++){
      close(deBoor(d,U,k,u,'left').point,deBoor(d,U,k,u,'right').point);
      for(let order=1;order<k;order++)close(splineDerivative(d,U,k,u,order,'left'),splineDerivative(d,U,k,u,order,'right'),1e-8);
    }
  }
});
test('非均匀、夹持、重复节点与端点：de Boor 等于独立基函数加权',()=>{
  const d=heartPoints();for(const U of [...heartKnots(),[0,0,0,0,.2,.2,1.7,2,2,2,2]]){
    assert.equal(splineError(d,U,3),'');const [a,b]=domain(U,3);
    for(const u of [a,a+(b-a)*.13,a+(b-a)*.5,a+(b-a)*.93,b])close(deBoor(d,U,3,u).point,basisPoint(d,U,3,u));
    for(const s of knotSpans(U,3)){close(deBoor(d,U,3,s.b,'left').point,basisPoint(d,U,3,s.b,'left'));assert.ok(deBoor(d,U,3,s.a).layers.flat(2).every(Number.isFinite));}
  }
  for(const U of heartKnots().slice(1)){close(deBoor(d,U,3,0).point,d[0]);close(deBoor(d,U,3,domain(U,3)[1]).point,d.at(-1));}
});
test('心形节点产生4、4、2段；右图等于两段Bezier及各递推层',()=>{
  const d=heartPoints(),sets=heartKnots();assert.deepEqual(sets.map(U=>knotSpans(U,3).length),[4,4,2]);
  for(let s=0;s<2;s++)for(const u of [0,.2,.67,1]){const result=deBoor(d,sets[2],3,s+u,u===1?'left':'right'),expected=casteljau(d.slice(s*3,s*3+4),u);result.layers.forEach((layer,r)=>layer.forEach((p,i)=>close(p,expected[r][i])));}
  assert.ok(Math.hypot(...deBoor(d,sets[0],3,0).point.map((x,i)=>x-d[0][i]))>.1);
});
test('Bezier单段特例：Bernstein、各层de Casteljau和解析导数一致',()=>{
  for(const k of [1,2,3,4,5]){const d=seededPoints(k+1,901).map(x=>x.p),U=clampedKnots(k+1,k);
    for(const u of [0,.01,.32,.7,1]){close(basisValues(U,k,u),bernsteinWeights(k,u));close(deBoor(d,U,k,u).point,bernsteinBezier(d,u));
      const expected=casteljau(d,u);deBoor(d,U,k,u).layers.forEach((layer,r)=>layer.forEach((p,i)=>close(p,expected[r][i])));
      for(let r=1;r<=k;r++)close(splineDerivative(d,U,k,u,r),bezierDerivativeOrder(d,u,r),1e-8);
    }
  }
});
test('夹持且有内部节点的B样条不等于全控制顶点构造的一段Bezier',()=>{
  const d=heartPoints(),U=heartKnots()[1],u=1.3;assert.ok(Math.hypot(...deBoor(d,U,3,u).point.map((x,i)=>x-bernsteinBezier(d,u/4)[i]))>.1);
});
test('完整节点范围不归一化，零次阶跃和有效域右端左极限正确',()=>{
  const U=uniformKnots(7,3);const w=basisValues(U,3,-2.5);assert.ok(w.reduce((a,b)=>a+b)>0&&w.reduce((a,b)=>a+b)<1);
  close(basisLevels([0,1,2],0,1)[0],[0,1]);close(basisLevels([0,1,2],0,1,'left')[0],[1,0]);
  close(basisValues(U,3,4),[0,0,0,0,1/6,4/6,1/6]);
});
test('内部k+1重节点保持左右不连续，采样分开，不跨断点连线',()=>{
  const d=[[0,0,0],[1,0,0],[3,2,0],[4,2,0]],U=[0,0,1,1,2,2];
  close(deBoor(d,U,1,1,'left').point,d[1]);close(deBoor(d,U,1,1).point,d[2]);assert.equal(sampledSpans(d,U,1).length,2);assert.equal(findSpan(U,1,1),3);
});
test('非法节点次序、长度、重数、零有效域和域外参数被拒绝',()=>{
  const d=heartPoints(),U=heartKnots()[1];assert.match(splineError(d,[...U].reverse(),3),/非递减/);assert.match(splineError(d,U.slice(1),3),/需要/);assert.match(splineError(d,U.map(()=>0),3),/有效域/);
  const many=[0,0,0,0,0,1,1,2,2,2,2];assert.match(splineError(d,many,3),/重数/);assert.throws(()=>deBoor(d,U,3,9),RangeError);
});
test('三次内部节点的1/2/3重数具有正确的解析连续性',()=>{
  const d=seededPoints(7,71).map(p=>p.p);
  for(const [r,U]of [[1,[0,0,0,0,1,2,3,4,4,4,4]],[2,[0,0,0,0,1,1,2,3,3,3,3]],[3,[0,0,0,0,1,1,1,2,2,2,2]]]){
    close(deBoor(d,U,3,1,'left').point,deBoor(d,U,3,1,'right').point);
    for(let q=1;q<=3-r;q++)close(splineDerivative(d,U,3,1,q,'left'),splineDerivative(d,U,3,1,q,'right'));
    const q=4-r,left=splineDerivative(d,U,3,1,q,'left'),right=splineDerivative(d,U,3,1,q,'right');assert.ok(Math.hypot(...left.map((x,i)=>x-right[i]))>.01);
  }
});

test('de Boor 逐边传播的最终权重等于 Cox-de Boor，且每个割边比例与坐标一致',async()=>{
  const {deBoorStep}=await import('../src/bspline.js');
  for(const k of [1,2,3,4,5]){
    const d=seededPoints(7,315).map(p=>p.p),sets=[uniformKnots(7,k),clampedKnots(7,k)];
    if(k===3)sets.push(...heartKnots());
    for(const U of sets){const [a,b]=domain(U,k);for(const u of [a,a+(b-a)*.23,a+(b-a)*.78,b]){
      const result=deBoor(d,U,k,u),basis=basisValues(U,k,u);close(result.influences.at(-1)[0],basis.slice(result.span-k,result.span+1));
      for(let index=0;index<k*(k+1)/2;index++){
        const step=deBoorStep(result,U,k,index),alpha=(u-U[step.lo])/(U[step.hi]-U[step.lo]);assert.ok(alpha>=-1e-12&&alpha<=1+1e-12);assert.ok(Math.abs(alpha-step.alpha)<1e-12);
        close(step.m,step.a.map((x,i)=>(1-alpha)*x+alpha*step.b[i]));
        const distance=(x,y)=>Math.hypot(...x.map((v,i)=>v-y[i]));assert.ok(Math.abs(distance(step.a,step.m)-alpha*distance(step.a,step.b))<1e-10);assert.ok(Math.abs(distance(step.m,step.b)-(1-alpha)*distance(step.a,step.b))<1e-10);
        assert.ok(Math.abs(step.weights.reduce((x,y)=>x+y)-1)<1e-10);
      }
    }}
  }
});
