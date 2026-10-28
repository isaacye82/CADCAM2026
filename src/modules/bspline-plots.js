import {basisLevels,domain,knotSpans} from '../bspline.js';
const colors=['#57dfcf','#6b9dff','#f7bc69','#f58ca9','#c89eff','#e0dd70','#64c9f5','#efaa8c'];
export const splineColor=i=>colors[((i%colors.length)+colors.length)%colors.length];
export function graphCanvas(parent,label,height=230){const c=document.createElement('canvas');c.className='bs-graph';c.setAttribute('aria-label',label);c.style.height=height+'px';parent.append(c);return c;}
function setup(canvas){const w=Math.max(180,canvas.clientWidth),h=parseFloat(canvas.style.height),ratio=Math.min(devicePixelRatio,2);if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);}const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle='#0b1421';ctx.fillRect(0,0,w,h);ctx.font='12px sans-serif';return{ctx,w,h};}
export function drawBasis(canvas,U,k,u,{level=k,selected=-1}={}){
  const {ctx,w,h}=setup(canvas),left=35,right=w-15,top=28,bottom=h-38,min=U[0],max=U.at(-1),[a,b]=domain(U,k),X=t=>left+(t-min)/(max-min)*(right-left),Y=v=>bottom-v*(bottom-top);
  ctx.fillStyle='#57dfcf15';ctx.fillRect(X(a),top,X(b)-X(a),bottom-top);
  ctx.strokeStyle='#3b536e';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,top);ctx.lineTo(left,bottom);ctx.lineTo(right,bottom);ctx.stroke();
  ctx.fillStyle='#9eb3cb';ctx.fillText('1',12,top+4);ctx.fillText(`次数 ${level} · 阴影：曲线有效域`,left,16);
  const unique=[...new Set(U)];unique.forEach(t=>{ctx.strokeStyle='#2b4056';ctx.beginPath();ctx.moveTo(X(t),top);ctx.lineTo(X(t),bottom+4);ctx.stroke();ctx.fillStyle='#9eb3cb';ctx.save();ctx.translate(X(t),bottom+17);ctx.rotate(-.3);ctx.fillText(Number(t.toFixed(2)),0,0);ctx.restore();});
  const count=U.length-level-1;
  for(let i=0;i<count;i++){
    ctx.strokeStyle=splineColor(i);ctx.globalAlpha=selected<0||i===selected?1:.22;ctx.lineWidth=i===selected?3:1.6;
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
  knotSpans(U,k).forEach((s,i)=>{ctx.fillStyle=splineColor(i);ctx.fillRect(X(s.a),y-4,X(s.b)-X(s.a),8);ctx.fillText(`${i+1}`,X((s.a+s.b)/2)-3,y+22);});
  for(const t of new Set(U)){const multiplicity=U.filter(x=>x===t).length;ctx.fillStyle='#c3d1e2';ctx.beginPath();ctx.arc(X(t),y,4,0,Math.PI*2);ctx.fill();ctx.save();ctx.translate(X(t)-4,y-12);ctx.rotate(-.35);ctx.fillText(`${+t.toFixed(2)}${multiplicity>1?' ×'+multiplicity:''}`,0,0);ctx.restore();}
  ctx.strokeStyle='#f58ca9';ctx.beginPath();ctx.moveTo(X(u),26);ctx.lineTo(X(u),y+30);ctx.stroke();
}
