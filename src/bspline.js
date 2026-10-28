// B-spline algorithms independent of DOM/Three.js. k = degree; U = knots; d = controls.
export const heartPoints=()=>[[0,1,0],[-2,3,0],[-3,-.5,0],[0,-3,0],[3,-.5,0],[2,3,0],[0,1,0]];
export const heartKnots=()=>[[-3,-2,-1,0,1,2,3,4,5,6,7],[0,0,0,0,1,2,3,4,4,4,4],[0,0,0,0,1,1,1,2,2,2,2]];
export const uniformKnots=(count,k)=>Array.from({length:count+k+1},(_,j)=>j-k);
export function clampedKnots(count,k){const end=count-k;return [...Array(k+1).fill(0),...Array.from({length:end-1},(_,i)=>i+1),...Array(k+1).fill(end)];}
export function splineError(d,U,k){
  if(!Number.isInteger(k)||k<0||d.length<k+1)return '控制顶点数量必须至少为 k+1，且次数 k 必须为非负整数。';
  if(d.some(p=>p.length!==3||p.some(x=>!Number.isFinite(x))))return '控制顶点坐标必须是有限数值。';
  if(U.length!==d.length+k+1)return `需要 ${d.length+k+1} 个节点。`;
  if(U.some((x,i)=>!Number.isFinite(x)||(i>0&&x<U[i-1])))return '节点必须是有限数值并保持非递减；本次输入未应用。';
  if(!(U[k]<U[d.length]))return '有效域长度必须大于 0；本次输入未应用。';
  let run=1;for(let i=1;i<U.length;i++){run=U[i]===U[i-1]?run+1:1;if(run>k+1)return '节点重数不能超过 k+1；本次输入未应用。';}
  return '';
}
export const domain=(U,k)=>[U[k],U[U.length-k-1]];
export function knotSpans(U,k){const count=U.length-k-1;return Array.from({length:count-k},(_,s)=>s+k).filter(i=>U[i]<U[i+1]).map((index,s)=>({index,s,a:U[index],b:U[index+1]}));}
// Right-hand convention at internal knots; effective right endpoint uses the exact left limit.
export function findSpan(U,k,u,side='auto'){
  const count=U.length-k-1,[a,b]=domain(U,k);
  if(!Number.isFinite(u)||u<a||u>b)throw new RangeError('参数不在有效曲线域内');
  const left=side==='left'||(side==='auto'&&u===b);
  if(left){for(let i=count-1;i>=k;i--)if(U[i]<u&&u<=U[i+1])return i;}
  else for(let i=k;i<count;i++)if(U[i]<=u&&u<U[i+1])return i;
  throw new RangeError('参数处没有所选方向的非零区间');
}
// All levels over the FULL knot range. Never normalize outside the curve domain.
export function basisLevels(U,k,u,side='right'){
  const left=side==='left'||u===U.at(-1);
  const levels=[U.slice(0,-1).map((t,i)=>+(left?t<u&&u<=U[i+1]:t<=u&&u<U[i+1]))];
  for(let p=1;p<=k;p++){const prev=levels.at(-1);levels.push(Array.from({length:prev.length-1},(_,i)=>{
    const a=U[i+p]-U[i],b=U[i+p+1]-U[i+1];return (a?(u-U[i])/a*prev[i]:0)+(b?(U[i+p+1]-u)/b*prev[i+1]:0);
  }));}return levels;
}
export function basisValues(U,k,u,side='auto'){return basisLevels(U,k,u,side==='auto'?(u===domain(U,k)[1]?'left':'right'):side).at(-1);}
export function basisPoint(d,U,k,u,side='auto'){const weights=basisValues(U,k,u,side);return [0,1,2].map(axis=>d.reduce((s,p,i)=>s+weights[i]*p[axis],0));}
export function deBoor(d,U,k,u,side='auto'){
  const span=findSpan(U,k,u,side),layers=[d.slice(span-k,span+1).map(p=>p.slice())],alphas=[[]],influences=[Array.from({length:k+1},(_,i)=>Array.from({length:k+1},(_,j)=>+(i===j)))];
  for(let r=1;r<=k;r++){
    const prev=layers.at(-1),alpha=[];const layer=Array.from({length:k-r+1},(_,q)=>{
      const j=q+r,den=U[span+1+j-r]-U[span-k+j];
      // For a selected nonzero span these denominators are strictly positive, even at repeated knots.
      if(!(den>0))throw new RangeError('de Boor 递推区间退化');
      const a=(u-U[span-k+j])/den;alpha.push(a);return prev[q].map((x,h)=>(1-a)*x+a*prev[q+1][h]);
    });const previous=influences.at(-1);influences.push(alpha.map((a,q)=>previous[q].map((w,j)=>(1-a)*w+a*previous[q+1][j])));layers.push(layer);alphas.push(alpha);
  }return {point:layers.at(-1)[0],layers,alphas,span,influences};
}
// Analytic one-sided derivatives at knots from differentiated Cox–de Boor identities.
export function splineDerivative(d,U,k,u,order=1,side='auto'){
  if(order>k)return [0,0,0];
  const levels=basisLevels(U,k,u,side==='auto'?(u===domain(U,k)[1]?'left':'right'):side);
  let previous=levels;
  for(let r=1;r<=order;r++){
    const next=Array(k+1);
    for(let p=r;p<=k;p++)next[p]=Array.from({length:U.length-p-1},(_,i)=>{
      const a=U[i+p]-U[i],b=U[i+p+1]-U[i+1];return (a?p/a*previous[p-1][i]:0)-(b?p/b*previous[p-1][i+1]:0);
    });previous=next;
  }
  return [0,1,2].map(axis=>d.reduce((s,p,i)=>s+previous[k][i]*p[axis],0));
}
export function sampledSpans(d,U,k,samples=64){return knotSpans(U,k).map(span=>({...span,points:Array.from({length:samples+1},(_,i)=>deBoor(d,U,k,(i===samples?span.b:span.a+(span.b-span.a)*i/samples),i===samples?'left':'right').point)}));}

// A single interpolation joins two parents; its influence weights propagate along the same edges.
export function deBoorStep(result,U,k,index){
  let offset=0;
  for(let r=1;r<=k;r++)for(let q=0;q<=k-r;q++){
    if(offset++===index){const i=result.span-k+r+q;return {r,q,i,alpha:result.alphas[r][q],a:result.layers[r-1][q],b:result.layers[r-1][q+1],m:result.layers[r][q],lo:i,hi:i+k-r+1,weights:result.influences[r][q]};}
  }
  throw new RangeError('递推步骤超出范围');
}
