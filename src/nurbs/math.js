// Positive-weight rational tensor-product splines. No renderer dependency.
export const add=(a,b)=>a.map((x,i)=>x+b[i]);
export const sub=(a,b)=>a.map((x,i)=>x-b[i]);
export const mul=(a,s)=>a.map(x=>x*s);
export const norm=a=>Math.hypot(...a);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const domain=c=>[c.U[c.p],c.U[c.P.length]];
export function knots(n,p){return [...Array(p+1).fill(0),...Array.from({length:n-p-1},(_,i)=>(i+1)/(n-p)),...Array(p+1).fill(1)];}
export function validateCurve(c){
 if(!c||!Number.isInteger(c.p)||c.p<1||c.p>8||!Array.isArray(c.P)||c.P.length<c.p+1||c.P.length>100)throw Error('次数须为 1–8，控制点数量须在次数+1 至 100 之间。');
 if(!Array.isArray(c.U)||c.U.length!==c.P.length+c.p+1||c.U.some((x,i)=>!Number.isFinite(x)||(i>0&&x<c.U[i-1])))throw Error('节点须非递减，数量须等于控制点数 + 次数 + 1。');
 if(c.U.some(x=>Math.abs(x)>1e5)||!(c.U[c.P.length]-c.U[c.p]>1e-8))throw Error('有效参数域须具有正长度，节点绝对值不超过 100000。');
 let count=0,prev;for(const x of c.U){count=x===prev?count+1:1;prev=x;if(count>c.p+1)throw Error('节点重数不能超过次数 + 1。');}
 if(!Array.isArray(c.W)||c.W.length!==c.P.length||c.W.some(w=>!Number.isFinite(w)||w<1e-6||w>1e6))throw Error('权重须为 0.000001–1000000 之间的正数。');
 if(c.P.some(p=>!Array.isArray(p)||p.length!==3||p.some(x=>!Number.isFinite(x)||Math.abs(x)>1e5)))throw Error('控制点须含三个有限坐标，绝对值不超过 100000。');
 return c;
}
export function validateSurface(s){
 if(!s||!Array.isArray(s.P)||!s.P.length||!Array.isArray(s.P[0])||s.P.length*s.P[0].length>1600)throw Error('曲面控制网格无效或超过 1600 点。');
 const nv=s.P[0].length;if(!s.W||s.W.length!==s.P.length||s.P.some((r,i)=>r.length!==nv||!s.W[i]||s.W[i].length!==nv))throw Error('曲面须为矩形控制网格。');
 for(let j=0;j<nv;j++)validateCurve({p:s.p,U:s.U,P:s.P.map(r=>r[j]),W:s.W.map(r=>r[j])});
 for(let i=0;i<s.P.length;i++)validateCurve({p:s.q,U:s.V,P:s.P[i],W:s.W[i]});return s;
}
export function span(n,p,u,U){if(u>=U[n+1])return n;let lo=p,hi=n+1;while(hi-lo>1){let m=(lo+hi)>>1;if(u<U[m])hi=m;else lo=m;}return lo;}
export function basis(U,p,u,n,forcedSpan){
 const k=forcedSpan??span(n-1,p,u,U),N=[1],left=[],right=[];
 for(let j=1;j<=p;j++){left[j]=u-U[k+1-j];right[j]=U[k+j]-u;let saved=0;for(let r=0;r<j;r++){const den=right[r+1]+left[j-r],t=den===0?0:N[r]/den;N[r]=saved+right[r+1]*t;saved=left[j-r]*t;}N[j]=saved;}
 const out=Array(n).fill(0);for(let j=0;j<=p;j++)out[k-p+j]=N[j];return out;
}
export function basisDerivative(U,p,u,n,forcedSpan){
 const B=basis(U,p-1,u,n+1,forcedSpan??span(n-1,p,u,U));return Array.from({length:n},(_,i)=>{let a=U[i+p]-U[i],b=U[i+p+1]-U[i+1];return(a?p*B[i]/a:0)-(b?p*B[i+1]/b:0);});
}
export function deBoor(H,p,U,u,forcedSpan){const k=forcedSpan??span(H.length-1,p,u,U),d=H.slice(k-p,k+1).map(x=>x.slice());for(let r=1;r<=p;r++)for(let j=p;j>=r;j--){let i=k-p+j,den=U[i+p-r+1]-U[i],a=den?(u-U[i])/den:0;d[j]=add(mul(d[j-1],1-a),mul(d[j],a));}return d[p];}
export const homogeneous=c=>c.P.map((p,i)=>[...mul(p,c.W[i]),c.W[i]]);
export function evaluate(c,u,left=false){const [a,b]=domain(c);u=Math.max(a,Math.min(b,u));const h=deBoor(homogeneous(c),c.p,c.U,u,left?leftSpan(c.U,c.p,u,c.P.length):undefined);if(Math.abs(h[3])<1e-14)throw Error('齐次分母接近零。');return h.slice(0,3).map(x=>x/h[3]);}
export function rationalBasis(c,u){const B=basis(c.U,c.p,u,c.P.length),d=B.reduce((s,x,i)=>s+x*c.W[i],0);return B.map((x,i)=>x*c.W[i]/d);}
export function derivative(c,u){const B=basis(c.U,c.p,u,c.P.length),D=basisDerivative(c.U,c.p,u,c.P.length);let A=[0,0,0],Ad=[0,0,0],w=0,wd=0;for(let i=0;i<B.length;i++){A=add(A,mul(c.P[i],B[i]*c.W[i]));Ad=add(Ad,mul(c.P[i],D[i]*c.W[i]));w+=B[i]*c.W[i];wd+=D[i]*c.W[i];}return mul(sub(Ad,mul(A,wd/w)),1/w);}
export function leftSpan(U,p,u,n){const i=U.indexOf(u);return i>p?i-1:span(n-1,p,u,U);}
export function surface(s,u,v,withDerivatives=false,leftU=false,leftV=false){const ku=leftU?leftSpan(s.U,s.p,u,s.P.length):undefined,kv=leftV?leftSpan(s.V,s.q,v,s.P[0].length):undefined,B=basis(s.U,s.p,u,s.P.length,ku),C=basis(s.V,s.q,v,s.P[0].length,kv),Du=withDerivatives?basisDerivative(s.U,s.p,u,s.P.length,ku):null,Dv=withDerivatives?basisDerivative(s.V,s.q,v,s.P[0].length,kv):null;let A=[0,0,0],Au=[0,0,0],Av=[0,0,0],w=0,wu=0,wv=0;for(let i=0;i<B.length;i++)for(let j=0;j<C.length;j++){let b=B[i]*C[j]*s.W[i][j];A=add(A,mul(s.P[i][j],b));w+=b;if(withDerivatives){let bu=Du[i]*C[j]*s.W[i][j],bv=B[i]*Dv[j]*s.W[i][j];Au=add(Au,mul(s.P[i][j],bu));Av=add(Av,mul(s.P[i][j],bv));wu+=bu;wv+=bv;}}const point=mul(A,1/w);if(!withDerivatives)return point;const du=mul(sub(Au,mul(point,wu)),1/w),dv=mul(sub(Av,mul(point,wv)),1/w),n=cross(du,dv);return{point,du,dv,normal:norm(n)>1e-10?mul(n,1/norm(n)):null};}
export function insertKnot(c,u){validateCurve(c);const[a,b]=domain(c);if(!(u>a&&u<b))throw Error('插入节点须位于有效参数域内部。');const p=c.p,n=c.P.length-1,k=span(n,p,u,c.U),s=c.U.filter(x=>Math.abs(x-u)<1e-12).length;if(s>=p)throw Error('该内部节点的重数已达到次数。');let H=homogeneous(c),Q=Array(n+2);for(let i=0;i<=k-p;i++)Q[i]=H[i];for(let i=k-s;i<=n;i++)Q[i+1]=H[i];for(let i=k-p+1;i<=k-s;i++){const a=(u-c.U[i])/(c.U[i+p]-c.U[i]);Q[i]=add(mul(H[i-1],1-a),mul(H[i],a));}const U=c.U.slice();U.splice(k+1,0,u);return validateCurve({p,U,P:Q.map(h=>h.slice(0,3).map(x=>x/h[3])),W:Q.map(h=>h[3])});}
export function insertSurface(s,t,dir){validateSurface(s);if(dir==='v'){const r=s.P.map((P,i)=>insertKnot({p:s.q,U:s.V,P,W:s.W[i]},t));return validateSurface({...s,V:r[0].U,P:r.map(c=>c.P),W:r.map(c=>c.W)});}const cols=s.P[0].map((_,j)=>insertKnot({p:s.p,U:s.U,P:s.P.map(r=>r[j]),W:s.W.map(r=>r[j])},t));return validateSurface({...s,U:cols[0].U,P:cols[0].P.map((_,i)=>cols.map(c=>c.P[i])),W:cols[0].W.map((_,i)=>cols.map(c=>c.W[i]))});}
export function intervals(U,p,n){return Array.from({length:n-p},(_,i)=>[U[i+p],U[i+p+1]]).filter(([a,b])=>b>a);}
