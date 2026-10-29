import * as M from './math.js';
import {generalCurve,generalSurface,conic,conicDefaults,conicErrors,maxDeviation,clone,airfoilFit} from './models.js';
export function verify(){const rows=[],check=(name,fn,tol=1e-10)=>{try{const value=fn();rows.push({name,value,tol,pass:Number.isFinite(value)&&value<=tol});}catch(e){rows.push({name,value:Infinity,tol,pass:false,error:e.message});}};const c=generalCurve(),s=generalSurface();
check('基函数单位分解',()=>Math.max(...Array.from({length:101},(_,i)=>Math.abs(M.basis(c.U,c.p,i/100,c.P.length).reduce((a,b)=>a+b,0)-1))));
check('夹持端点插值',()=>Math.max(M.norm(M.sub(M.evaluate(c,0),c.P[0])),M.norm(M.sub(M.evaluate(c,1),c.P.at(-1)))));
check('权重统一缩放',()=>maxDeviation(c,{...c,W:c.W.map(w=>7.3*w)}));
check('曲线节点插入保形',()=>maxDeviation(c,M.insertKnot(c,.37)));
check('曲面 u 节点插入保形',()=>maxDeviation(s,M.insertSurface(s,.37,'u'),true));
check('曲面 v 节点插入保形',()=>maxDeviation(s,M.insertSurface(s,.43,'v'),true));
check('标准四分之一圆',()=>{const q=conic({...conicDefaults,a:1,sweep:90});return Math.max(...conicErrors(q,{...conicDefaults,a:1,sweep:90},'radial').map(r=>r[1]),Math.abs(q.W[1]-Math.SQRT1_2),M.norm(M.sub(q.P[1],[1,1,0])));});
for(const type of ['circle','ellipse','parabola','hyperbola'])check(`${{circle:'圆',ellipse:'椭圆',parabola:'抛物线',hyperbola:'双曲线'}[type]}解析残差`,()=>{const cfg={...conicDefaults,type};return Math.max(...conicErrors(conic(cfg),cfg).map(r=>r[1]));});
check('局部支撑区间外不变',()=>{const d=clone(c),i=1;d.P[i][1]+=2;let e=0;for(let k=0;k<=100;k++){let u=k/100;if(u<c.U[i]||u>c.U[i+c.p+1])e=Math.max(e,M.norm(M.sub(M.evaluate(c,u),M.evaluate(d,u))));}return e;});
check('曲线解析导数 / 数值对照',()=>{let e=0,h=1e-6;for(let u of [.13,.4,.71,.9]){let fd=M.mul(M.sub(M.evaluate(c,u+h),M.evaluate(c,u-h)),1/(2*h));e=Math.max(e,M.norm(M.sub(fd,M.derivative(c,u))));}return e;},1e-7);
check('NACA 0012 拟合最大偏差 / 单位弦长',()=>airfoilFit().max,5e-4);
return rows;}
