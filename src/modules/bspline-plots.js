import {basisLevels,domain,knotSpans,deBoorStep} from '../bspline.js';
const colors=['#57dfcf','#6b9dff','#f7bc69','#f58ca9','#c89eff','#e0dd70','#64c9f5','#efaa8c'];
export const splineColor=i=>colors[((i%colors.length)+colors.length)%colors.length];
export function graphCanvas(parent,label,height=230){const c=document.createElement('canvas');c.className='bs-graph';c.setAttribute('aria-label',label);c.style.height=height+'px';parent.append(c);return c;}
function setup(canvas,transparent=false){const w=Math.max(180,canvas.clientWidth),h=parseFloat(canvas.style.height),ratio=Math.min(devicePixelRatio,2);if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);}const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);if(!transparent){ctx.fillStyle='#0b1421';ctx.fillRect(0,0,w,h);}ctx.font='12px sans-serif';return{ctx,w,h};}
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

export function drawInfluences(canvas,result,weights,step,tracked){
  const {ctx,w,h}=setup(canvas),start=result.span-result.layers.length+1,left=24,right=w-20,local=tracked-start;
  const bar=(y,values,title)=>{ctx.fillStyle='#c4d7ed';ctx.fillText(title,left,y-12);let x=left;values.forEach((v,j)=>{ctx.fillStyle=splineColor(start+j);ctx.fillRect(x,y,v*(right-left),15);if(v>.09){ctx.fillStyle='#071321';ctx.fillText(`d${start+j}`,x+3,y+12);}x+=v*(right-left);});};
  bar(36,step.weights,`当前递推点：${step.r} 层 · 第 ${step.q+1} 个割边结果`);
  bar(92,result.influences.at(-1)[0],'最终曲线点：传播后的权重 = Cox–de Boor 基函数值');
  const propagated=result.influences.at(-1)[0][local]??0,expected=weights[tracked]??0;
  ctx.fillStyle='#f7bc69';ctx.fillText(`选中 N_${tracked},${result.layers.length-1}：传播 ${propagated.toFixed(4)} = 基函数 ${expected.toFixed(4)}`,left,h-8,right-left);
}

// One colour per recursion layer, shared by spatial polygons and parameter intervals.
export const constructionColor=(r,k)=>r===0?'#b9c5d5':r===k?'#ff5b6c':['#568fff','#38d58c','#bd93ef','#55cddc','#eabd67'][r-1];
export function drawNodeLadder(canvas,result,U,k,u,{active=0,phase=1,visible=Infinity}={}){
  const {ctx,w,h}=setup(canvas),left=30,right=w-58,top=48,rowGap=29,rows=[],X=t=>left+(t-U[0])/(U.at(-1)-U[0])*(right-left);
  const [a,b]=domain(U,k);ctx.fillStyle='#57dfcf12';ctx.fillRect(X(a),26,X(b)-X(a),h-38);
  ctx.fillStyle='#568fff25';ctx.fillRect(X(U[result.span]),28,X(U[result.span+1])-X(U[result.span]),30);
  ctx.strokeStyle='#9fb4cf';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(left,top);ctx.lineTo(right,top);ctx.stroke();
  ctx.fillStyle='#b9cde5';ctx.font='11px sans-serif';ctx.fillText('① 在节点轴上定位 u；下方各行把同一 u 映射到对应边',12,16,w-24);
  for(const t of new Set(U)){
    const ids=U.map((x,i)=>x===t?i:-1).filter(i=>i>=0);ctx.strokeStyle='#9fb4cf';ctx.beginPath();ctx.moveTo(X(t),top-7);ctx.lineTo(X(t),top);ctx.stroke();ctx.textAlign='center';ctx.fillStyle='#a9c0db';ctx.fillText(ids.length>1?`u${ids[0]}…u${ids.at(-1)}`:`u${ids[0]}`,Math.max(left+6,Math.min(right-6,X(t))),top+16);
  }
  ctx.textAlign='left';ctx.strokeStyle='#59718b';ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(X(u),24);ctx.lineTo(X(u),h-10);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#e6eefb';ctx.beginPath();ctx.arc(X(u),top,5,0,Math.PI*2);ctx.fill();ctx.fillText(`u=${u.toFixed(3)}`,Math.max(left,Math.min(right-50,X(u)+7)),top-12);
  let index=0,y=94;
  for(let r=1;r<=k;r++){
    const begin=y;
    for(let q=0;q<=k-r;q++){
      const step=deBoorStep(result,U,k,index),selected=index===active,shown=index<visible||selected,colour=constructionColor(r,k),x0=X(U[step.lo]),x1=X(U[step.hi]);
      if(selected){ctx.fillStyle=colour+'18';ctx.fillRect(12,y-16,w-24,27);}
      ctx.strokeStyle=shown?colour:'#33485e';ctx.lineWidth=selected?2.6:1.6;ctx.beginPath();ctx.moveTo(x0,y-6);ctx.lineTo(x0,y);ctx.lineTo(x1,y);ctx.lineTo(x1,y-6);ctx.stroke();
      for(const t of new Set(U.slice(step.lo+1,step.hi))){ctx.beginPath();ctx.moveTo(X(t),y-5);ctx.lineTo(X(t),y);ctx.stroke();}
      ctx.font='10px sans-serif';ctx.fillStyle=shown?'#b3c8e1':'#647b96';ctx.textAlign='left';ctx.fillText(`u${step.lo}`,x0,y-8);ctx.textAlign='right';ctx.fillText(`u${step.hi}`,x1,y-8);ctx.textAlign='left';
      if(shown){const travel=selected?Math.min(1,phase/.3):1;ctx.fillStyle=colour;ctx.beginPath();ctx.arc(x0+(X(u)-x0)*travel,y,selected?6:4.5,0,Math.PI*2);ctx.fill();if(selected){ctx.strokeStyle='#eef6ff';ctx.lineWidth=1;ctx.stroke();}}
      rows.push({index,y0:y-17,y1:y+11,x0,x1,r,lo:step.lo,hi:step.hi});index++;y+=rowGap;
    }
    ctx.fillStyle=constructionColor(r,k);ctx.font='bold 13px sans-serif';ctx.fillText(`l=${r}`,w-44,(begin+y-rowGap)/2+4);y+=9;
  }
  canvas.dataset.intervalRows=rows.length;canvas.dataset.layers=k;return rows;
}
export function drawProjectedConstruction(canvas,result,U,k,u,project,{active=0,phase=1,visible=Infinity,selected=-1,show=true,showControls=true}={}){
  const {ctx,w,h}=setup(canvas,true);if(!show)return;
  const label=(text,p,colour='#d1dfef',dx=9,dy=-10)=>{ctx.font='13px sans-serif';const width=ctx.measureText(text).width,x=Math.max(5,Math.min(w-width-5,p[0]+dx)),y=Math.max(14,Math.min(h-8,p[1]+dy));ctx.fillStyle='#0b1421de';ctx.fillRect(x-2,y-12,width+4,16);ctx.fillStyle=colour;ctx.fillText(text,x,y);};
  if(showControls)result.layers[0].forEach((p,j)=>{const i=result.span-k+j,screen=project(p);label(`𝐝${i}`,screen,constructionColor(0,k));if(i===selected){ctx.strokeStyle='#f5d47d';ctx.lineWidth=2;ctx.beginPath();ctx.arc(screen[0],screen[1],8,0,Math.PI*2);ctx.stroke();}});
  const step=deBoorStep(result,U,k,active),a=project(step.a),b=project(step.b),m=project(step.m),vx=b[0]-a[0],vy=b[1]-a[1],length=Math.hypot(vx,vy),colour=constructionColor(step.r,k);
  if(length<3){label('父点重合：节点比例仍有效',m,colour,12,22);return;}
  let normal=[-vy/length,vx/length];const parents=result.layers[step.r-1].map(project),centre=parents.reduce((sum,p)=>[sum[0]+p[0]/parents.length,sum[1]+p[1]/parents.length],[0,0]);
  if(normal[0]*((a[0]+b[0])/2-centre[0])+normal[1]*((a[1]+b[1])/2-centre[1])<0)normal=normal.map(x=>-x);
  const offset=p=>[p[0]+normal[0]*25,p[1]+normal[1]*25],aa=offset(a),bb=offset(b),mm=offset(m);
  ctx.strokeStyle=colour;ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(aa[0],aa[1]);ctx.lineTo(bb[0],bb[1]);ctx.stroke();
  for(const t of new Set(U.slice(step.lo,step.hi+1))){const fraction=(t-U[step.lo])/(U[step.hi]-U[step.lo]),p=offset(project(step.a.map((x,i)=>x+fraction*(step.b[i]-x))));ctx.beginPath();ctx.moveTo(p[0]-normal[0]*5,p[1]-normal[1]*5);ctx.lineTo(p[0]+normal[0]*5,p[1]+normal[1]*5);ctx.stroke();}
  ctx.fillStyle=colour;ctx.beginPath();ctx.arc(mm[0],mm[1],5,0,Math.PI*2);ctx.fill();ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(mm[0],mm[1]);ctx.lineTo(m[0],m[1]);ctx.stroke();ctx.setLineDash([]);
  label(`u${step.lo}`,aa,'#adbed2',normal[0]*7-8,normal[1]*9-5);label(`u${step.hi}`,bb,'#adbed2',normal[0]*7-8,normal[1]*9-5);label('u',mm,colour,normal[0]*8,normal[1]*10-5);
  if(phase>=.3){const progress=Math.min(1,Math.max(0,(phase-.3)/.5)),point=project(step.a.map((x,i)=>x+progress*(step.m[i]-x)));label(`𝐝${step.i}⁽${step.r}⁾`,point,colour,8,22);}
  if(visible>=k*(k+1)/2)label('𝐫(u)',project(result.point),constructionColor(k,k),10,21);
}
