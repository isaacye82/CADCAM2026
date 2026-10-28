import {basisLevels,domain,knotSpans} from '../bspline.js';
const colors=['#57dfcf','#6b9dff','#f7bc69','#f58ca9','#c89eff','#e0dd70','#64c9f5','#efaa8c'];
export const splineColor=i=>colors[((i%colors.length)+colors.length)%colors.length];
export function graphCanvas(parent,label,height=230){const c=document.createElement('canvas');c.className='bs-graph';c.setAttribute('aria-label',label);c.style.height=height+'px';parent.append(c);return c;}
function setup(canvas){const w=Math.max(180,canvas.clientWidth),h=parseFloat(canvas.style.height),ratio=Math.min(devicePixelRatio,2);if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);}const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle='#0b1421';ctx.fillRect(0,0,w,h);ctx.font='12px sans-serif';return{ctx,w,h};}
export function drawBasis(canvas,U,k,u,{level=k,selected=-1,width=2}={}){
  const {ctx,w,h}=setup(canvas),left=35,right=w-15,top=28,bottom=h-38,min=U[0],max=U.at(-1),[a,b]=domain(U,k),X=t=>left+(t-min)/(max-min)*(right-left),Y=v=>bottom-v*(bottom-top);
  ctx.fillStyle='#57dfcf15';ctx.fillRect(X(a),top,X(b)-X(a),bottom-top);
  ctx.strokeStyle='#3b536e';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,top);ctx.lineTo(left,bottom);ctx.lineTo(right,bottom);ctx.stroke();
  ctx.fillStyle='#9eb3cb';ctx.fillText('1',12,top+4);ctx.fillText(`次数 ${level} · 阴影：曲线有效域`,left,16);
  const unique=[...new Set(U)];unique.forEach(t=>{ctx.strokeStyle='#2b4056';ctx.beginPath();ctx.moveTo(X(t),top);ctx.lineTo(X(t),bottom+4);ctx.stroke();ctx.fillStyle='#9eb3cb';ctx.save();ctx.translate(X(t),bottom+17);ctx.rotate(-.3);ctx.fillText(Number(t.toFixed(2)),0,0);ctx.restore();});
  const count=U.length-level-1;
  for(let i=0;i<count;i++){
    ctx.strokeStyle=splineColor(i);ctx.globalAlpha=selected<0||i===selected?1:.22;ctx.lineWidth=(i===selected?3:1.6)*width;
    for(let span=0;span<U.length-1;span++)if(U[span]<U[span+1]){
      ctx.beginPath();for(let j=0;j<=24;j++){const t=U[span]+(U[span+1]-U[span])*j/24,v=basisLevels(U,level,t,j===24?'left':'right')[level][i];j?ctx.lineTo(X(t),Y(v)):ctx.moveTo(X(t),Y(v));}ctx.stroke();
    }
  }
  ctx.globalAlpha=1;if(selected>=0&&selected<count){ctx.fillStyle=splineColor(selected)+'30';ctx.fillRect(X(U[selected]),bottom+24,X(U[selected+level+1])-X(U[selected]),5);}
  ctx.strokeStyle='#ffffff';ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(X(u),top);ctx.lineTo(X(u),bottom);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#f5c5d4';ctx.fillText(`u=${u.toFixed(3)}`,Math.max(left,Math.min(right-65,X(u)+4)),top+15);
}
export function drawKnotAxis(canvas,U,k,u){
  const {ctx,w,h}=setup(canvas),l=28,r=w-22,min=U[0],max=U.at(-1),X=t=>l+(t-min)/(max-min)*(r-l),[a,b]=domain(U,k),y=50;
  ctx.fillStyle='#57dfcf16';ctx.fillRect(X(a),22,X(b)-X(a),h-40);ctx.fillStyle='#b8cbe1';ctx.fillText(`完整节点 [${min}, ${max}]；有效域 [${a}, ${b}]`,l,16);
  ctx.strokeStyle='#637e9b';ctx.beginPath();ctx.moveTo(l,y);ctx.lineTo(r,y);ctx.stroke();
  knotSpans(U,k).forEach((s,i)=>{ctx.fillStyle=splineColor(i);ctx.fillRect(X(s.a),y-4,X(s.b)-X(s.a),8);ctx.fillText(`段${i+1}`,X((s.a+s.b)/2)-8,y+20);});
  for(const t of new Set(U)){const multiplicity=U.filter(x=>x===t).length;ctx.fillStyle='#c3d1e2';ctx.beginPath();ctx.arc(X(t),y,4,0,Math.PI*2);ctx.fill();ctx.save();ctx.translate(X(t)-4,y-12);ctx.rotate(-.35);ctx.fillText(`${+t.toFixed(2)}${multiplicity>1?' ×'+multiplicity:''}`,0,0);ctx.restore();}
  for(const t of new Set(U)){const ids=U.map((x,i)=>x===t?i:-1).filter(i=>i>=0);ctx.fillStyle='#b6cde6';ctx.textAlign='center';ctx.fillText(ids.length>1?`u${ids[0]}…u${ids.at(-1)}`:`u${ids[0]}`,Math.max(l+12,Math.min(r-12,X(t))),y+43);}ctx.textAlign='left';
  ctx.strokeStyle='#f58ca9';ctx.beginPath();ctx.moveTo(X(u),26);ctx.lineTo(X(u),y+30);ctx.stroke();
}

// Diagram x-positions follow the actual interpolation ratio. y denotes recursion depth only.
export function drawRecursion(canvas,result,{tracked=-1,active=0,phase=1,visible=Infinity,title='de Boor'}={}){
  const {ctx,w,h}=setup(canvas),k=result.layers.length-1,left=30,right=w-30,top=45,gap=(h-75)/Math.max(1,k),xs=[Array.from({length:k+1},(_,i)=>left+(right-left)*i/Math.max(1,k))];
  ctx.fillStyle='#b9cfe8';ctx.fillText(`${title} · 横向按 α 分割；纵向表示递推层`,14,18,w-28);
  let index=0;const trackedLocal=tracked-(result.span-k);
  for(let r=1;r<=k;r++){
    const row=[];
    for(let q=0;q<result.layers[r].length;q++){
      const alpha=result.alphas[r][q],a=xs[r-1][q],b=xs[r-1][q+1],x=(1-alpha)*a+alpha*b,y=top+r*gap,py=y-gap;row.push(x);
      const isActive=index===active,shown=index<visible||isActive;
      if(shown){
        for(const [px,factor,parent,colour,symbol] of [[a,1-alpha,q,'#f58ca9','1−α'],[b,alpha,q+1,'#57dfcf','α']]){
          const participates=trackedLocal>=0&&(result.influences[r-1][parent][trackedLocal]??0)*factor>1e-12;
          ctx.strokeStyle=isActive?colour:participates?'#89b4da':'#30435c';ctx.lineWidth=isActive?2.5:participates?2:1;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(x,y);ctx.stroke();
          if(isActive){ctx.fillStyle=colour;ctx.fillText(symbol,(px+x)/2+3,(py+y)/2);}
        }
        if(isActive){
          ctx.strokeStyle='#57dfcf';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(a,py);ctx.lineTo(x,py);ctx.stroke();ctx.strokeStyle='#f58ca9';ctx.beginPath();ctx.moveTo(x,py);ctx.lineTo(b,py);ctx.stroke();
          const slide=Math.min(1,phase/.7),drop=Math.max(0,(phase-.7)/.3);ctx.fillStyle='#f7bc69';ctx.beginPath();ctx.arc(a+(x-a)*slide,py+(y-py)*drop,6,0,Math.PI*2);ctx.fill();
        }
      }index++;
    }xs.push(row);
  }
  index=0;
  for(let r=0;r<=k;r++)for(let q=0;q<result.layers[r].length;q++){
    const shown=r===0||index<visible;if(r>0)index++;if(!shown)continue;
    const x=xs[r][q],y=top+r*gap,weight=result.influences[r][q][trackedLocal]??0,globalIndex=result.span-k+r+q;
    ctx.fillStyle=r===0?splineColor(globalIndex):weight>1e-12?'#57dfcf':'#193149';ctx.beginPath();ctx.arc(x,y,r===k?8:6,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#d6e5f5';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle='#c9dbef';ctx.textAlign=x>w-70?'right':x<65?'left':'center';ctx.fillText(r===0?`𝐝${globalIndex}`:r===k?'𝐫(u)':`𝐝${globalIndex}⁽${r}⁾`,x,y+19);
    if(trackedLocal>=0){ctx.fillStyle='#f7bc69';ctx.fillText(`w=${weight.toFixed(3)}`,x,y-12);}
  }
  ctx.textAlign='left';
}
export function drawRatios(canvas,step,U,u,phase=1){
  const {ctx,w,h}=setup(canvas),left=30,right=w-30,alpha=step.alpha,cut=left+(right-left)*alpha;
  const segment=(y,text)=>{
    ctx.fillStyle='#bcd0e7';ctx.fillText(text,left,y-24,right-left);ctx.lineWidth=7;ctx.strokeStyle='#57dfcf';ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(cut,y);ctx.stroke();ctx.strokeStyle='#f58ca9';ctx.beginPath();ctx.moveTo(cut,y);ctx.lineTo(right,y);ctx.stroke();
    ctx.fillStyle='#f7bc69';ctx.beginPath();ctx.arc(left+(cut-left)*phase,y,6,0,Math.PI*2);ctx.fill();
  };
  segment(54,`节点割比：α = (u−u${step.lo}) / (u${step.hi}−u${step.lo}) = ${alpha.toFixed(3)}`);
  ctx.fillStyle='#9eb8d4';ctx.fillText(`u${step.lo}=${+U[step.lo].toFixed(3)}`,left,77);ctx.fillText(`u=${u.toFixed(3)}`,Math.max(left,Math.min(right-60,cut-20)),35);ctx.textAlign='right';ctx.fillText(`u${step.hi}=${+U[step.hi].toFixed(3)}`,right,77);ctx.textAlign='left';
  const distance=Math.hypot(...step.a.map((x,i)=>x-step.b[i]));
  segment(126,`空间割边：AM : MB = α : (1−α) = ${alpha.toFixed(3)} : ${(1-alpha).toFixed(3)}`);
  ctx.fillStyle='#9eb8d4';ctx.fillText(`A → M：${(distance*alpha).toFixed(3)}`,left,151);ctx.textAlign='right';ctx.fillText(`M → B：${(distance*(1-alpha)).toFixed(3)}`,right,151);ctx.textAlign='left';
  if(distance<1e-10)ctx.fillText('A、B 重合：几何长度为零，α 仍由节点区间确定。',left,h-8,right-left);
}
export function drawInfluences(canvas,result,weights,step,tracked){
  const {ctx,w,h}=setup(canvas),start=result.span-result.layers.length+1,left=24,right=w-20,local=tracked-start;
  const bar=(y,values,title)=>{ctx.fillStyle='#c4d7ed';ctx.fillText(title,left,y-12);let x=left;values.forEach((v,j)=>{ctx.fillStyle=splineColor(start+j);ctx.fillRect(x,y,v*(right-left),15);if(v>.09){ctx.fillStyle='#071321';ctx.fillText(`d${start+j}`,x+3,y+12);}x+=v*(right-left);});};
  bar(36,step.weights,`当前递推点：${step.r} 层 · 第 ${step.q+1} 个割边结果`);
  bar(92,result.influences.at(-1)[0],'最终曲线点：传播后的权重 = Cox–de Boor 基函数值');
  const propagated=result.influences.at(-1)[0][local]??0,expected=weights[tracked]??0;
  ctx.fillStyle='#f7bc69';ctx.fillText(`选中 N_${tracked},${result.layers.length-1}：传播 ${propagated.toFixed(4)} = 基函数 ${expected.toFixed(4)}`,left,h-8,right-left);
}
