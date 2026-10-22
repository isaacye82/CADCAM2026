import test from 'node:test';
import assert from 'node:assert/strict';
import {bezierFrame,bezierDerivativeOrder,bezierDerivative,bezierTangentRelation,bernsteinBezier,seededPoints,dot,norm} from '../src/math.js';
const close=(actual,expected,tolerance=1e-8)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);
const vector=(a,b)=>a.forEach((v,i)=>close(v,b[i]));

test('Bezier三阶解析导数在区间与端点均正确',()=>{
  // Exact Bernstein representation of r(t)=(t,t²,t³).
  const points=[[0,0,0],[1/3,0,0],[2/3,1/3,0],[1,1,1]];
  for(const t of [0,.2,.5,1]){
    vector(bezierDerivativeOrder(points,t),[1,2*t,3*t*t]);
    vector(bezierDerivativeOrder(points,t,2),[0,2,6*t]);
    vector(bezierDerivativeOrder(points,t,3),[0,0,6]);
    vector(bezierDerivativeOrder(points,t,4),[0,0,0]);
    vector(bezierDerivativeOrder(points,t),bezierDerivative(points,t));
  }
});

test('空间Bezier曲线曲率挠率与解析曲线一致，标架正交且右手定向',()=>{
  const points=[[0,0,0],[1/3,0,0],[2/3,1/3,0],[1,1,1]];
  for(const t of [0,.2,.5,1]){
    const f=bezierFrame(points,t),crossSquared=36*t**4+36*t*t+4;
    close(f.k,Math.sqrt(crossSquared)/(1+4*t*t+9*t**4)**1.5);
    close(f.tau,12/crossSquared);
    for(const axis of [f.T,f.N,f.B])close(norm(axis),1);
    close(dot(f.T,f.N),0);close(dot(f.T,f.B),0);close(dot(f.N,f.B),0);
    close(f.T[0]*(f.N[1]*f.B[2]-f.N[2]*f.B[1])-f.T[1]*(f.N[0]*f.B[2]-f.N[2]*f.B[0])+f.T[2]*(f.N[0]*f.B[1]-f.N[1]*f.B[0]),1);
  }
});

test('平面二次Bezier挠率为零，中点曲率与曲率圆正确',()=>{
  const points=[[0,0,0],[1,1,0],[2,0,0]],f=bezierFrame(points,.5);
  close(f.k,1);close(f.tau,0);vector(f.T,[1,0,0]);vector(f.N,[0,-1,0]);
  vector(f.p.map((v,i)=>v+f.N[i]/f.k),[1,-.5,0]);
});

test('直线和驻点不会伪造Frenet法向或挠率',()=>{
  const line=bezierFrame([[0,0,0],[2,0,0]],.5);
  close(line.k,0);assert.equal(line.tau,null);assert.equal(line.N,null);assert.equal(line.B,null);vector(line.T,[1,0,0]);
  const stationary=bezierFrame([[1,2,3],[1,2,3],[1,2,3]],.5);
  assert.equal(stationary.k,null);assert.equal(stationary.tau,null);assert.equal(stationary.T,null);
});

test('切矢等于次数乘倒数第二层有向连线，端点与内部参数均成立',()=>{
  for(const degree of [1,2,3,4,9]){
    const points=seededPoints(degree+1,571).map(p=>p.p);
    for(const t of [0,.2,.5,.8,1]){
      const r=bezierTangentRelation(points,t);
      assert.equal(r.degree,degree);
      vector(r.derivative,bezierDerivative(points,t));
      vector(r.derivative,bezierDerivativeOrder(points,t));
      vector(r.point,bernsteinBezier(points,t));
      vector(r.point,r.q0.map((x,i)=>(1-t)*x+t*r.q1[i]));
      close(r.tangentLength,degree*r.chordLength);
      if(r.chordLength>1e-8)close(dot(r.chord,r.derivative)/(r.chordLength*r.tangentLength),1);
    }
  }
});

test('倒数第二层两点重合时切矢长度为零，不计算无定义的模长比值',()=>{
  const r=bezierTangentRelation([[0,0,0],[1,0,0],[0,0,0]],.5);
  vector(r.q0,r.q1);vector(r.derivative,[0,0,0]);close(r.chordLength,0);close(r.tangentLength,0);
});
