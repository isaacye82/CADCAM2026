import {TransformControls} from 'three/addons/controls/TransformControls.js';
import {THREE,makeView,dispose,line,dot3,arrow,label3,planePatch,sample,select,check,button,block,transport,el,fmt,vec} from '../ui.js';
import {bernsteinBezier,bernsteinWeights,casteljau,bezierTangentRelation,bezierFrame,add,mul} from '../math.js';

const examples={
  spatial:{name:'空间三次：观察非零挠率',points:[[-3,-1.5,-1.4],[-1,2.5,1.8],[1,-2,-1],[3,1.5,1.3]],three:true},
  planar:{name:'平面三次：挠率为零',points:[[-3,-1.5,0],[-1,2.5,0],[1,-2,0],[3,1.5,0]],three:false},
  quadratic:{name:'平面二次：曲率变化',points:[[-3,-1.5,0],[0,3,0],[3,-1.5,0]],three:false},
  quartic:{name:'空间四次：更丰富的标架运动',points:[[-3,-1,-1],[-2,2,1],[0,-1,2],[2,2,-2],[3,-1,1]],three:true},
  straight:{name:'直线：曲率为零，Frenet 标架退化',points:[[-3,0,0],[3,0,0]],three:false}
};

export function bezierDemo({stage,side,readout,info,instructions}){
  const view=makeView(stage,{position:[7,5,9],grid:false});
  let points=examples.spatial.points.map(p=>[...p]),selected=0,t=.35,is3D=true;
  let showPolygon=true,showFinal=true,showPrevious=true,showCircle=true,showPlane=true;
  const features={construction:true,recursion:false,tangent:true,frame:true};
  const handles=new THREE.Group();view.scene.add(handles);
  const gizmo=new TransformControls(view.camera,view.renderer.domElement);
  gizmo.setSize(.7);view.scene.add(gizmo.getHelper());
  const legend=el('div',{class:'overlay',text:''},stage);
  const comparison=el('div',{class:'tangent-comparison','aria-label':'切矢与倒数第二层连线的模长对比'},stage);const comparisonMedia=matchMedia('(max-width:740px)');const placeComparison=()=>{(comparisonMedia.matches?document.querySelector('#extras'):stage).append(comparison);};placeComparison();comparisonMedia.addEventListener('change',placeComparison);

  const display=block(side,'展示内容（可同时选择）');display.classList.add('bezier-features');
  const panels={};
  for(const [key,label]of [
    ['construction','展示 1：控制点与曲线构造'],
    ['recursion','展示 2：de Casteljau 递推'],
    ['tangent','展示 3：切矢性质'],
    ['frame','展示 4：活动标架、曲率与挠率']
  ])check(display,label,features[key],value=>{
    features[key]=value;
    for(const name of ['construction','recursion','frame'])panels[name].hidden=!features[name];
    refreshHandles();draw();
  });
  const clock=transport(side,value=>{t=value;draw();},{initial:t,duration:12});
  select(side,'示例曲线',Object.fromEntries(Object.entries(examples).map(([key,e])=>[key,e.name])),'spatial',key=>{
    const e=examples[key];points=e.points.map(p=>[...p]);selected=0;setDimension(e.three);clock.pause();refreshHandles();draw();
  });
  const dimension=select(side,'编辑维度',{two:'二维：直接拖动控制点',three:'三维：选择点后拖动坐标轴'},'three',value=>{
    setDimension(value==='three');refreshHandles();draw();
  });
  function setDimension(three){
    is3D=three;dimension.value=three?'three':'two';view.controls.enableRotate=three;
    view.camera.position.set(...(three?[7,5,9]:[0,0,11]));view.controls.target.set(0,0,0);
    if(!three)points=points.map(p=>[p[0],p[1],0]);
  }
  panels.construction=block(side,'控制点编辑');
  const count=select(panels.construction,'控制点预设（也可继续增加）',Object.fromEntries(Array.from({length:9},(_,i)=>[i+2,`${i+2} 个控制点 / ${i+1} 次曲线`])),4,preset);
  const row=el('div',{class:'row'},panels.construction);
  button(row,'＋ 控制点',()=>{
    const p=points.at(-1);points.push([p[0]+.5,-p[1]*.8,is3D?.6:0]);selected=points.length-1;refreshHandles();draw();
  });
  button(row,'删除选中点',()=>{
    if(points.length<=2)return;points.splice(selected,1);selected=Math.min(selected,points.length-1);refreshHandles();draw();
  });
  button(row,'重置点集',()=>{
    points=examples.spatial.points.map(p=>[...p]);selected=0;setDimension(true);clock.pause();refreshHandles();draw();
  });
  check(panels.construction,'显示控制多边形',true,value=>{showPolygon=value;draw();});
  const list=el('div',{class:'point-list'},panels.construction);
  el('p',{class:'muted',style:'font-size:11px;line-height:1.7',text:'二维直接拖动圆点；三维选择点后拖动 XYZ 轴，也可实时输入坐标。切换二维会将 Z 坐标置零。'},panels.construction);

  panels.recursion=block(side,'递推展示选项');panels.recursion.hidden=true;
  check(panels.recursion,'显示最后一层点的轨迹（原曲线）',true,value=>{showFinal=value;draw();});
  check(panels.recursion,'显示倒数第二层的两个点轨迹',true,value=>{showPrevious=value;draw();});
  el('p',{class:'muted',style:'font-size:11px;line-height:1.7',text:'轨迹开关控制递推图层；其他展示启用时仍会保留其主曲线。'},panels.recursion);
  panels.frame=block(side,'活动标架选项');
  check(panels.frame,'显示曲率圆与圆心',true,value=>{showCircle=value;draw();});
  check(panels.frame,'显示密切平面',true,value=>{showPlane=value;draw();});
  button(side,'重置观察视角',()=>{
    view.camera.position.set(...(is3D?[7,5,9]:[0,0,11]));view.controls.target.set(0,0,0);
  });

  function preset(value){
    const n=+value;
    points=Array.from({length:n},(_,i)=>[-3+6*i/(n-1),Math.sin(i*2.1)*2,is3D?Math.cos(i*1.3):0]);
    selected=0;refreshHandles();draw();
  }
  function refreshHandles(){
    if(points.length<=10)count.value=points.length;
    else{
      let custom=count.querySelector('[value="custom"]');
      if(!custom){custom=el('option',{value:'custom'},count);custom.disabled=true;}
      custom.textContent='自定义：'+points.length+' 个控制点';count.value='custom';
    }
    gizmo.detach();dispose(handles);handles.visible=features.construction;
    points.forEach((p,i)=>{const sphere=dot3(handles,p,i===selected?0xf7bc69:0x6b9dff,.105);sphere.userData.index=i;});
    if(is3D&&features.construction){gizmo.attach(handles.children[selected]);gizmo.enabled=true;gizmo.getHelper().visible=true;}
    else{gizmo.enabled=false;gizmo.getHelper().visible=false;}
    refreshList();
  }
  function refreshList(){
    list.replaceChildren();
    points.forEach((p,i)=>{
      const r=el('div',{class:'point-row'+(i===selected?' selected':'')},list);
      button(r,`${i}`,()=>{selected=i;refreshHandles();draw();},'small').style.padding='4px';
      p.forEach((value,j)=>{
        const input=el('input',{type:'number',step:'.1',value:value.toFixed(2),'aria-label':`控制点${i} ${'XYZ'[j]}`},r);
        if(!is3D&&j===2)input.disabled=true;
        input.addEventListener('input',()=>{
          if(!Number.isFinite(input.valueAsNumber))return;
          points[i][j]=input.valueAsNumber;handles.children[i].position.set(...points[i]);draw();
        });
      });
    });
  }
  function syncSelected(){list.children[selected]?.querySelectorAll('input').forEach((input,j)=>input.value=points[selected][j].toFixed(2));}
  gizmo.addEventListener('dragging-changed',event=>{view.controls.enabled=!event.value;});
  gizmo.addEventListener('objectChange',()=>{
    if(!gizmo.object)return;points[selected]=gizmo.object.position.toArray();syncSelected();draw();
  });
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),0);
  let dragging=false;const canvas=view.renderer.domElement;
  function ray(event){
    const r=canvas.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,view.camera);
  }
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0||!features.construction)return;
    ray(event);const hit=raycaster.intersectObjects(handles.children)[0];if(!hit)return;
    selected=hit.object.userData.index;refreshHandles();draw();
    if(!is3D){dragging=true;view.controls.enabled=false;canvas.setPointerCapture(event.pointerId);}
  });
  canvas.addEventListener('pointermove',event=>{
    if(!dragging||is3D||!features.construction)return;
    ray(event);const p=new THREE.Vector3();
    if(raycaster.ray.intersectPlane(plane,p)){points[selected]=p.toArray();handles.children[selected].position.copy(p);syncSelected();draw();}
  });
  for(const type of ['pointerup','pointercancel'])canvas.addEventListener(type,()=>{dragging=false;view.controls.enabled=true;});

  function draw(){
    dispose(view.root);
    const active=Object.values(features).some(Boolean),n=points.length-1;
    const samples=Math.max(50,Math.min(250,Math.floor(1800/Math.sqrt(points.length))));
    const f=bezierFrame(points,t),p=f.p;
    comparison.hidden=!features.tangent;
    const lines=[`控制点 ${points.length} 个 / ${n} 次曲线 | t = ${fmt(t)} | B(t) = ${vec(p)}`];
    if((features.construction&&showPolygon)||features.recursion)line(view.root,points,0x607a99);
    if(features.construction||features.tangent||features.frame||(features.recursion&&showFinal))line(view.root,sample(x=>bernsteinBezier(points,x),0,1,samples),0x57dfcf);
    if(active)dot3(view.root,p,0xf58ca9,.12);

    if(features.construction){
      const weights=bernsteinWeights(n,t);
      lines.push(`【构造】选中 P${selected}；Bernstein 权重：${weights.slice(0,12).map((w,i)=>`b${i}=${fmt(w)}`).join('，')}${weights.length>12?' …':''}`,`Σ bᵢ = ${fmt(weights.reduce((a,b)=>a+b,0))}；B(t) 位于控制点凸包内。`);
    }
    if(features.recursion){
      const layers=casteljau(points,t),colors=[0x6b9dff,0xf7bc69,0xf58ca9,0x57dfcf,0xc89eff];
      layers.slice(1).forEach((layer,i)=>{line(view.root,layer,colors[i%colors.length]);layer.forEach(q=>dot3(view.root,q,colors[i%colors.length],.045));});
      if(showPrevious&&n>=2)for(let j=0;j<2;j++)line(view.root,sample(x=>casteljau(points,x).at(-2)[j],0,1,samples),j?0xf7bc69:0x6b9dff,{opacity:.65});
      lines.push(`【递推】共 ${n} 层：Pᵢ⁽ʳ⁾ = (1−t)Pᵢ⁽ʳ⁻¹⁾ + tPᵢ₊₁⁽ʳ⁻¹⁾`,...layers.slice(-2).map((layer,i)=>`第 ${layers.length-2+i} 层：${layer.slice(0,6).map(q=>vec(q,2)).join(' → ')}`));
    }
    if(features.tangent){
      const r=bezierTangentRelation(points,t);
      line(view.root,[r.q0,r.q1],0x6b9dff);
      dot3(view.root,r.q0,0x6b9dff,.085);dot3(view.root,r.q1,0xf7bc69,.085);
      if(r.chordLength>1e-10){
        for(const [name,position,color]of [['Q0',r.q0,'#8cb4ff'],['Q1',r.q1,'#f7bc69']]){
          const label=label3(view.root,name,add(position,[0,.28,0]),color);label.scale.set(2.2,.55,1);label.center.set(0,.5);
        }
        const pointLabel=label3(view.root,'B(t)',add(p,[0,-.3,0]),'#f58ca9');pointLabel.scale.set(2.2,.55,1);pointLabel.center.set(0,.5);
        arrow(view.root,r.q0,r.chord,0x6b9dff,r.chordLength);
        arrow(view.root,p,r.derivative,0xf7bc69,r.tangentLength);
      }else label3(view.root,'Q0 = Q1',add(r.q0,[0,.22,0]));
      const ticks=n<=24?Array.from({length:n-1},(_,i)=>`<path d="M${16+210*(i+1)/n} 84v8" stroke="#f7bc69"/>`).join(''):'';
      comparison.innerHTML=`<strong>B′(t) = n (Q₁ − Q₀)</strong><svg viewBox="0 0 300 108" role="img" aria-label="${n}次曲线，切矢模长为两点连线长度的${n}倍"><text x="10" y="16" fill="#a6bbd2" font-size="10">模长对比 · 两箭头使用同一比例尺</text><text x="10" y="37" fill="#8cb4ff" font-size="11">|Q₁−Q₀| = ${fmt(r.chordLength,4)}</text>${r.chordLength>1e-10?`<path d="M16 50h${210/n}" stroke="#6b9dff" stroke-width="3"/><path d="M${16+210/n-6} 46l6 4-6 4" fill="none" stroke="#6b9dff"/>`:''}<text x="10" y="74" fill="#f7bc69" font-size="11">|B′| = ${fmt(r.tangentLength,4)} = ${n} × ${fmt(r.chordLength,4)}</text>${r.chordLength>1e-10?`<path d="M16 88h210" stroke="#f7bc69" stroke-width="3"/><path d="M220 84l6 4-6 4" fill="none" stroke="#f7bc69"/>${ticks}`:'<text x="10" y="98" fill="#f58ca9" font-size="10">Q₀、Q₁ 重合：切矢为零，方向未定义</text>'}</svg>`;
      lines.push(`【切矢与递推两点】Q₀ = P₀⁽ⁿ⁻¹⁾ = ${vec(r.q0)}，Q₁ = P₁⁽ⁿ⁻¹⁾ = ${vec(r.q1)}`,`B(t) = (1−t)Q₀ + tQ₁；B′(t) = n(Q₁−Q₀) = ${vec(r.derivative)}`,`|Q₁−Q₀| = ${fmt(r.chordLength,5)}；|B′(t)| = ${fmt(r.tangentLength,5)} = ${n} × |Q₁−Q₀|`,r.chordLength>1e-10?'方向：Q₀ → Q₁，与切矢同向。场景中的连线与切矢均按原始坐标长度绘制；模长对比图采用统一比例尺消除透视对模长比较的影响。':'两点重合，B′(t)=0，切矢方向未定义。');
    }
    if(features.frame){
      if(f.T&&!features.tangent)arrow(view.root,p,f.T,0xf7bc69,1.15);
      if(f.N)arrow(view.root,p,f.N,0x57dfcf,1.15);
      if(f.B)arrow(view.root,p,f.B,0x6b9dff,1.15);
      if(showPlane&&f.N)planePatch(view.root,p,f.T,f.N,0x6b9dff,1.8);
      const radius=f.k>0?1/f.k:null;
      if(showCircle&&radius&&f.N){
        if(radius<=25){
          const center=add(p,mul(f.N,radius));
          line(view.root,sample(a=>add(center,add(mul(f.N,-radius*Math.cos(a)),mul(f.T,radius*Math.sin(a)))),0,Math.PI*2,150),0x57dfcf,{opacity:.7});
          line(view.root,[p,center],0x57dfcf,{opacity:.4});dot3(view.root,center,0x57dfcf,.045);
        }else lines.push('曲率圆半径超过 25，为保持观察尺度暂不绘制；真实半径见下方读数。');
      }
      lines.push(`【活动标架】曲率 κ = ${fmt(f.k,6)}；曲率半径 ρ = ${radius?fmt(radius,4):f.k===0?'∞':'未定义'}；挠率 τ = ${fmt(f.tau,6)}`,`T ${vec(f.T)}　N ${vec(f.N)}　B ${vec(f.B)}`);
      if(!f.T)lines.push('退化位置：B′(t)=0，曲率、挠率与 Frenet 标架均未定义。');
      else if(!f.N)lines.push('退化位置：曲率为零，N、B 和挠率未定义；仅显示单位切向 T。');
      else lines.push('黄色 T：切向；青色 N：主法向；蓝色 B：双法向。密切平面由 T、N 张成；dB/ds = −τN。');
    }
    if(!active)lines.push('请勾选至少一项展示内容。控制点和参数进度会保留。');
    legend.textContent=features.tangent?'Q₀、Q₁：倒数第二层两点 · 黄色：切矢方向\n切矢与 Q₀→Q₁ 同向，模长是连线长度的 n 倍':features.frame?'FRENET FRAME · T 黄色 / N 青色 / B 蓝色\n拖动进度观察标架与曲率圆沿曲线移动':features.recursion?'DE CASTELJAU · 相邻点按参数 t 逐层插值':'BEZIER · 通过复选框叠加或单独观察各项展示';
    readout.textContent=lines.join('\n');
  }
  instructions.innerHTML='<p>在“展示内容”中独立勾选四项功能，可单独观察，也可叠加比较。所有展示共用同一组控制点和参数 t，切换复选框不会重置实验。</p><p>默认使用空间三次曲线。播放或拖动进度，观察切向、Frenet 活动标架、曲率圆和密切平面的运动。切换平面二次示例对照挠率为零的情况；直线示例用于观察标架退化。</p><p>展示 3 会单独显示倒数第二层两点 Q₀、Q₁，即使展示 2 未勾选也能观察。拖动 t，对比它们的有向连线与曲线上该点切矢的方向和模长；模长对比图按相同比例尺绘制两箭头。展示 1 可编辑控制点，展示 2 可分别开关最后两层点的轨迹。</p>';
  info.innerHTML='<div class="formula">B(t) = Σᵢ₌₀ⁿ C(n,i)tⁱ(1−t)ⁿ⁻ⁱ Pᵢ<br>Pᵢ⁽ʳ⁾=(1−t)Pᵢ⁽ʳ⁻¹⁾+tPᵢ₊₁⁽ʳ⁻¹⁾<br>B⁽ʳ⁾(t) 的控制点由 r 次差分乘 n!/(n−r)! 得到<br>Q₀=P₀⁽ⁿ⁻¹⁾，Q₁=P₁⁽ⁿ⁻¹⁾<br>B′(t)=n(Q₁−Q₀)，‖B′‖=n‖Q₁−Q₀‖<br>T=B′/‖B′‖；𝑩=(B′×B″)/‖B′×B″‖<br>N=𝑩×T；κ=‖B′×B″‖/‖B′‖³<br>τ=((B′×B″)·B‴)/‖B′×B″‖²；ρ=1/κ</div><p>𝑩 表示双法向，B(t) 表示 Bezier 曲线位置。密切平面由 T、N 张成；挠率描述其沿弧长的转动。平面曲线在曲率非零处的挠率为零，空间三次及更高次曲线可出现非零挠率。</p><p>一至三阶导数由控制点差分精确构造，再用 Bernstein 基函数求值，端点也可直接计算。导数为零时曲率与标架未定义；曲率为零时保留切向，不伪造主法向或挠率。</p><p>倒数第二层只剩 Q₀、Q₁，最后一次插值得到 B(t)=(1−t)Q₀+tQ₁。曲线切矢平行于 Q₀→Q₁，方向一致，模长为其 n 倍；n 为曲线次数，而非控制点个数。两点重合时切矢为零，方向未定义。活动标架展示与其他展示共用控制点和参数进度，可独立或叠加观察。</p>';
  refreshHandles();draw();
}
