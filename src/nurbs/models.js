import {knots,validateCurve,validateSurface,evaluate,surface,norm,sub} from './math.js';
export const clone=x=>JSON.parse(JSON.stringify(x));
export function generalCurve(p=3,space=false){const P=[[-3,-1,0],[-2,2,0],[-.7,1.4,0],[.3,-1.6,0],[1.9,2.3,0],[3,0,0]];if(space)P.forEach((p,i)=>p[2]=1.1*Math.sin(i*1.2));return{p,U:knots(6,p),P,W:[1,1,1.6,.7,1,1]};}
export function generalSurface(p=3,q=3){const P=Array.from({length:5},(_,i)=>Array.from({length:5},(_,j)=>[(i-2)*1.3,(j-2)*1.3,1.8*Math.sin(i*.9)*Math.cos(j*.7)]));return{p,q,U:knots(5,p),V:knots(5,q),P,W:P.map(r=>r.map(()=>1))};}
export const conicDefaults={type:'circle',a:2.5,b:1.5,f:1,start:0,sweep:360,T:1.3,cx:0,cy:0,rotation:0,branch:1,w:.7071067811865476};
const world=(p,c)=>{const a=c.rotation*Math.PI/180;return[c.cx+p[0]*Math.cos(a)-p[1]*Math.sin(a),c.cy+p[0]*Math.sin(a)+p[1]*Math.cos(a),0];};
export const local=(p,c)=>{const a=c.rotation*Math.PI/180,x=p[0]-c.cx,y=p[1]-c.cy;return[x*Math.cos(a)+y*Math.sin(a),-x*Math.sin(a)+y*Math.cos(a)];};
export function analytic(t,c){let p;if(c.type==='circle'||c.type==='ellipse'){let a=(c.start+c.sweep*t)*Math.PI/180;p=[c.a*Math.cos(a),(c.type==='circle'?c.a:c.b)*Math.sin(a)];}else if(c.type==='parabola'){let x=(2*t-1)*c.T*c.a;p=[x,x*x/(4*c.f)];}else if(c.type==='hyperbola'){let h=(2*t-1)*c.T;p=[c.branch*c.a*Math.cosh(h),c.b*Math.sinh(h)];}else return null;return world(p,c);}
export function conic(c){let P=[],W=[],pieces=1;
 if(c.type==='circle'||c.type==='ellipse'){
  pieces=Math.max(1,Math.ceil(c.sweep/90));const r=c.type==='circle'?c.a:c.b;
  for(let i=0;i<pieces;i++){let a=(c.start+c.sweep*i/pieces)*Math.PI/180,b=(c.start+c.sweep*(i+1)/pieces)*Math.PI/180,m=(a+b)/2,w=Math.cos((b-a)/2);if(!i){P.push([c.a*Math.cos(a),r*Math.sin(a),0]);W.push(1);}P.push([c.a*Math.cos(m)/w,r*Math.sin(m)/w,0],[c.a*Math.cos(b),r*Math.sin(b),0]);W.push(w,1);}
 }else if(c.type==='parabola'){let h=c.T*c.a,y=h*h/(4*c.f);P=[[-h,y,0],[0,-y,0],[h,y,0]];W=[1,1,1];
 }else if(c.type==='hyperbola'){let h=c.T,w=Math.cosh(h);P=[[c.branch*c.a*w,-c.b*Math.sinh(h),0],[c.branch*c.a/w,0,0],[c.branch*c.a*w,c.b*Math.sinh(h),0]];W=[1,w,1];
 }else{P=[[-2,0,0],[0,3,0],[2,0,0]];W=[1,c.w,1];}
 return validateCurve({p:2,U:[0,0,0,...Array.from({length:pieces-1},(_,i)=>[(i+1)/pieces,(i+1)/pieces]).flat(),1,1,1],P:P.map(p=>world(p,c)),W});
}
export function residual(p,c){const[x,y]=local(p,c);if(c.type==='circle')return x*x/(c.a*c.a)+y*y/(c.a*c.a)-1;if(c.type==='ellipse')return x*x/(c.a*c.a)+y*y/(c.b*c.b)-1;if(c.type==='parabola')return y/c.f-x*x/(4*c.f*c.f);if(c.type==='hyperbola')return x*x/(c.a*c.a)-y*y/(c.b*c.b)-1;return 0;}
export function nearestDistance(p,c){const f=t=>{let q=analytic(t,c);return q.reduce((s,x,i)=>s+(x-p[i])**2,0);};let best=0,val=Infinity,N=128;for(let i=0;i<=N;i++){let v=f(i/N);if(v<val){best=i;val=v;}}let a=Math.max(0,(best-1)/N),b=Math.min(1,(best+1)/N),g=(Math.sqrt(5)-1)/2,x=b-g*(b-a),y=a+g*(b-a),fx=f(x),fy=f(y);for(let k=0;k<52;k++){if(fx<fy){b=y;y=x;fy=fx;x=b-g*(b-a);fx=f(x);}else{a=x;x=y;fx=fy;y=a+g*(b-a);fy=f(y);}}return Math.sqrt(Math.min(val,fx,fy));}
export function conicErrors(curve,c,metric='residual',count=121){if(c.type==='unified')return[];return Array.from({length:count},(_,i)=>{let t=i/(count-1),p=evaluate(curve,t),e=metric==='distance'?nearestDistance(p,c):metric==='radial'?Math.abs(Math.hypot(...local(p,c))-c.a):Math.abs(residual(p,c));return[t,e];});}
const circleP=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[1,0]],circleW=[1,Math.SQRT1_2,1,Math.SQRT1_2,1,Math.SQRT1_2,1,Math.SQRT1_2,1],circleU=[0,0,0,.25,.25,.5,.5,.75,.75,1,1,1];
export const aeroDefaults={model:'fuselage',length:10,radius:1.35,flat:.9,taper:.45,inlet:1.5,throat:.8,outlet:1.1,span:9,root:3.5,tip:1.4,sweep:22,dihedral:5,twist:-5};
function revolve(profile,flat=1){const P=profile.map(([x,r])=>circleP.map(([a,b])=>[x,r*a,r*b*flat]));return validateSurface({p:3,q:2,U:knots(profile.length,3),V:circleU.slice(),P,W:P.map(()=>circleW.slice())});}
function solve(A,B){A=A.map((r,i)=>[...r,...B[i]]);const n=A.length,d=B[0].length;for(let j=0;j<n;j++){let k=j;for(let i=j+1;i<n;i++)if(Math.abs(A[i][j])>Math.abs(A[k][j]))k=i;[A[j],A[k]]=[A[k],A[j]];if(Math.abs(A[j][j])<1e-14)throw Error('拟合矩阵奇异。');let a=A[j][j];for(let q=j;q<n+d;q++)A[j][q]/=a;for(let i=0;i<n;i++)if(i!==j){let f=A[i][j];for(let q=j;q<n+d;q++)A[i][q]-=f*A[j][q];}}return A.map(r=>r.slice(n));}
// Cubic B-spline least-squares fit of the analytic NACA 0012 thickness.
import {basis} from './math.js';
const naca=t=>{let x=t*t;return[x,5*.12*(.2969*t-.126*x-.3516*x*x+.2843*x*x*x-.1036*x*x*x*x)];};
export function airfoilFit(){const n=12,p=3,U=knots(n,p),M=Array.from({length:n-2},()=>Array(n-2).fill(0)),B=M.map(()=>[0,0,0]),end=naca(1);for(let k=1;k<240;k++){const t=k/240,N=basis(U,p,t,n),pt=naca(t),target=[pt[0]-N[n-1]*end[0],0,pt[1]-N[n-1]*end[1]];for(let i=1;i<n-1;i++){for(let j=1;j<n-1;j++)M[i-1][j-1]+=N[i]*N[j];for(let d=0;d<3;d++)B[i-1][d]+=N[i]*target[d];}}const c={p,U,P:[[0,0,0],...solve(M,B),[end[0],0,end[1]]],W:Array(n).fill(1)};let max=0,sum=0;for(let k=0;k<=1000;k++){let a=naca(k/1000),b=evaluate(c,k/1000),e=Math.hypot(a[0]-b[0],a[1]-b[2]);max=Math.max(max,e);sum+=e*e;}return{curve:c,max,rms:Math.sqrt(sum/1001)};}
const fit=airfoilFit();
export function aircraft(c){if(c.model==='fuselage'){let L=c.length,r=c.radius;return{patches:[revolve([[-L/2,0],[-L*.48,r*c.taper],[-L*.32,r],[0,r],[L*.32,r*.9],[L*.46,r*c.taper],[L/2,0]],c.flat)],note:'精确椭圆周向 × 三次轴向控制轮廓；轴向控制行不是插值站位。首尾为退化端点，周向首末控制点形成接缝。单点编辑可打开接缝。'};}
 if(c.model==='nacelle'){let L=c.length;return{patches:[revolve([[-L/2,c.inlet],[-L*.35,c.inlet*.95],[-L*.18,c.throat],[L*.05,c.throat],[L*.25,c.outlet*.9],[L/2,c.outlet]])],note:'三次 NURBS 母线 × 精确有理二次圆；入口和出口开放，表示外形薄壳，未构造壁厚。周向接缝默认重合。'};}
 const sections=4,Pup=[],Plo=[];for(let j=0;j<sections;j++){let s=j/(sections-1),chord=c.root+(c.tip-c.root)*s,off=s*c.span*Math.tan(c.sweep*Math.PI/180),z=s*c.span*Math.tan(c.dihedral*Math.PI/180),a=s*c.twist*Math.PI/180;const row=sign=>fit.curve.P.map(([x,_,h])=>{let X=(x-.25)*chord,Z=h*chord*sign;return[off+X*Math.cos(a)+Z*Math.sin(a),s*c.span,z-X*Math.sin(a)+Z*Math.cos(a)];});Pup.push(row(1));Plo.push(row(-1));}
 const patch=P=>validateSurface({p:3,q:3,U:[0,0,0,0,1,1,1,1],V:fit.curve.U.slice(),P,W:P.map(r=>r.map(()=>1))});return{patches:[patch(Pup),patch(Plo)],fit:{max:fit.max*Math.max(c.root,c.tip),rms:fit.rms*Math.max(c.root,c.tip)},note:'NACA 0012 上下翼型最小二乘拟合，展向三次控制网格。默认前后缘重合，翼根与翼尖开放；未封口。局部独立编辑可能打开接缝。拟合误差按最大弦长缩放，不是气动性能指标。'};
}
export function maxDeviation(a,b,surf=false){let max=0;for(let i=0;i<=40;i++)if(surf){for(let j=0;j<=25;j++){let u=a.U[a.p]+(a.U[a.P.length]-a.U[a.p])*i/40,v=a.V[a.q]+(a.V[a.P[0].length]-a.V[a.q])*j/25;max=Math.max(max,norm(sub(surface(a,u,v),surface(b,u,v))));}}else{let u=a.U[a.p]+(a.U[a.P.length]-a.U[a.p])*i/40;max=Math.max(max,norm(sub(evaluate(a,u),evaluate(b,u))));}return max;}
