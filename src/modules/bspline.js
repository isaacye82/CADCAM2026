import {Line2} from 'three/addons/lines/Line2.js';
import {LineGeometry} from 'three/addons/lines/LineGeometry.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import {THREE,makeView,el,block,button,select,range,check,vectorInput,animate,fmt,vec} from '../ui.js';
import {uniformKnots,clampedKnots,splineError,domain,knotSpans,findSpan,basisValues,basisPoint,deBoor,splineDerivative,heartPoints,heartKnots,sampledSpans,deBoorStep} from '../bspline.js';
import {casteljau} from '../math.js';
import {graphCanvas,drawBasis,drawKnotAxis,splineColor,drawRecursion,drawRatios,drawInfluences} from './bspline-plots.js';

const MAX=24,SAMPLES=64;
const seed=()=>Array.from({length:7},(_,i)=>[-3+i,1.8*Math.sin(i*1.35),0]);
const names={1:'展示 1：分段与连续性',2:'展示 2：均匀 B 样条基函数',3:'展示 3：非均匀基函数与曲线',4:'展示 4：心形特例对照',5:'展示 5：de Boor 构造'};
const heartNames=['均匀 · 不插值端点','端点 4 重 · 内部均匀','端点 4 重 · 内部 3 重'];

export function bsplineDemo({stage,side,readout,info,instructions}){
  const view=makeView(stage,{position:[0,0,13],grid:false});view.controls.enableRotate=false;
  let mode='1',k=3,d=seed(),U=uniformKnots(7,3),u=.6,selected=0,activeSegment=0,local=Array(4).fill(.5),is3D=false;
  let playing=true,speed=1,animationMode='scan',reveal=0,showPoints=true,showPolygon=true,showConstruction=true,level=3,basisSelected=-1;
  let curveWidth=2,activeStep=0,editableKnots=null;const wideLines=[];
  const editableDefaults=(count,p)=>{const knots=clampedKnots(count,p),end=count-p;return knots.map(x=>x>0?x*x/end:x);};
  const defaultKnots=()=>['1','2'].includes(mode)?uniformKnots(d.length,k):editableDefaults(d.length,k);
  let heartD=heartPoints(),heartU=heartKnots(),heartIndex=0,heartProgress=.4;
  const main=new THREE.Group(),hearts=Array.from({length:3},()=>new THREE.Group());view.scene.add(main,...hearts);
  const sphere=new THREE.SphereGeometry(.07,12,8),materials=Array.from({length:8},(_,i)=>new THREE.MeshBasicMaterial({color:splineColor(i)}));
  const white=new THREE.MeshBasicMaterial({color:0xffffff}),muted=new THREE.MeshBasicMaterial({color:0x627d99}),pink=new THREE.MeshBasicMaterial({color:0xf58ca9});
  function dot(parent,mat=white,size=1){const m=new THREE.Mesh(sphere,mat);m.scale.setScalar(size);parent.add(m);return m;}
  function line(parent,count,color){
    const geometry=new LineGeometry();geometry.setPositions(new Float32Array(count*3));geometry.instanceCount=0;
    const material=new LineMaterial({color,linewidth:curveWidth,worldUnits:false});
    const object=new Line2(geometry,material);object.frustumCulled=false;wideLines.push(object);parent.add(object);return object;
  }
  function write(l,points){
    const data=l.geometry.attributes.instanceStart.data,a=data.array;
    for(let i=0;i<points.length-1;i++){a.set(points[i],i*6);a.set(points[i+1],i*6+3);}
    l.geometry.instanceCount=Math.max(0,points.length-1);data.needsUpdate=true;
  }
  function drawing(parent,count){return{parent,curves:Array.from({length:MAX},(_,i)=>line(parent,SAMPLES+1,splineColor(i))),handles:Array.from({length:count},()=>dot(parent,muted,1.2)),polygon:line(parent,MAX,0x607a99),current:dot(parent,pink,1.8)};}
  const drawingMain=drawing(main,MAX),heartDraw=hearts.map(g=>drawing(g,7));
  const segmentDots=Array.from({length:MAX},(_,i)=>dot(main,materials[i%8],1.4));
  const construction=new THREE.Group();main.add(construction);
  const recursionLines=Array.from({length:6},(_,r)=>line(construction,6,splineColor(r)));
  const recursionDots=Array.from({length:6},(_,r)=>Array.from({length:6-r},()=>dot(construction,materials[r],.75)));
  const castLines=Array.from({length:6},()=>line(construction,6,0xffffff));castLines.forEach(l=>l.material.transparent=true);castLines.forEach(l=>l.material.opacity=.5);
  const cutGroup=new THREE.Group();construction.add(cutGroup);const cutAM=line(cutGroup,2,0x57dfcf),cutMB=line(cutGroup,2,0xf58ca9),cutMarker=dot(cutGroup,materials[2],1.6);
  const cutLabel=el('div',{class:'bs-cut-label',hidden:''},stage);
  const heartCamera=new THREE.OrthographicCamera(-4,4,4,-4,.05,100);heartCamera.position.set(0,0,15);
  const gizmo=new TransformControls(view.camera,view.renderer.domElement);gizmo.setSize(.7);view.scene.add(gizmo.getHelper());
  const overlay=el('div',{class:'overlay bs-status'},stage),heartLabels=el('div',{class:'bs-heart-labels',hidden:''},stage);
  heartNames.forEach((text,i)=>el('span',{text:`${['左','中','右'][i]}：${text}`},heartLabels));
  const extras=document.querySelector('#extras'),panels={};
  const switcher=block(side,'五项展示');
  const modeSelect=select(switcher,'展示内容',names,mode,value=>switchMode(value));
  el('p',{class:'muted',text:'展示 1/2 为均匀构造；展示 3/5 保留可编辑节点；展示 4 是展示 3 的心形特例。'},switcher);
  const status=el('p',{class:'bs-feedback',role:'status','aria-live':'polite'},side);
  function feedback(text){status.textContent=text;}
  const degree=select(side,'曲线次数 k',Object.fromEntries(Array.from({length:5},(_,i)=>[i+1,`${i+1} 次`])),k,value=>{
    const next=+value;if(next>=d.length){degree.value=k;feedback('控制顶点不足：提高次数前请先增加顶点。');return;}
    pause();k=next;level=k;U=defaultKnots();u=domain(U,k)[0];local=[];feedback('次数已改变，重新生成当前展示的节点预设；控制顶点不变。');rebuild();
  });
  const edit=block(side,'控制顶点 𝐝ᵢ');
  const pointSelect=select(edit,'选中控制顶点',{},0,value=>{selected=+value;if(mode==='5'){basisSelected=selected;basisSelect.value=selected;}attach();update();});
  const coordinates=vectorInput(edit,'控制顶点坐标',d[0],values=>{pause();points()[selected]=values;geometryChanged();});
  const dimension=select(edit,'编辑维度',{plane:'平面：直接拖动顶点',space:'空间：三轴控制柄'},'plane',value=>{
    if(mode==='4'){dimension.value='plane';return;}
    is3D=value==='space';view.controls.enableRotate=is3D;gizmo.detach();view.camera.position.set(...(is3D?[7,5,10]:[0,0,13]));view.controls.target.set(0,0,0);attach();
    feedback(is3D?'选择控制顶点后拖动 XYZ 控制柄；也可数值编辑。':'直接拖动顶点；拖动保持该点 Z 不变，空间坐标仍可数值编辑。');
  });
  const editRow=el('div',{class:'row'},edit);
  const addButton=button(editRow,'增加控制顶点',()=>{
    if(d.length>=MAX){feedback(`本页最多支持 ${MAX} 个控制顶点。`);return;}pause();const p=d.at(-1);d.push([p[0]+.8,-p[1]*.7,is3D?.8:0]);U=defaultKnots();selected=d.length-1;feedback('追加一个顶点并重建当前节点预设；均匀曲线增加一段。');rebuild();
  });
  const removeButton=button(editRow,'删除选中顶点',()=>{
    if(d.length<=k+1){feedback('至少保留 k+1 个控制顶点。');return;}pause();d.splice(selected,1);selected=Math.min(selected,d.length-1);U=defaultKnots();feedback('删除后重建当前节点预设，相关曲线段随之更新。');rebuild();
  });
  button(edit,'重置控制顶点',()=>{pause();if(mode==='4'){heartD=heartPoints();}else{d=seed();if(k>d.length-1)k=3;U=defaultKnots();}selected=0;rebuild();});
  const pointToggle=check(edit,'显示控制顶点',true,value=>{showPoints=value;attach();update();});
  const polygonToggle=check(edit,'显示控制多边形',true,value=>{showPolygon=value;drawStatic();});
  button(edit,'空间波形预设',()=>{pause();if(mode==='4'){feedback('请在展示 1/2/3/5 中使用空间预设。');return;}d=seed().map((p,i)=>[p[0],p[1],Math.cos(i*1.3)]);selected=0;U=defaultKnots();is3D=true;dimension.value='space';view.controls.enableRotate=true;view.camera.position.set(7,5,10);rebuild();});

  panels.local=block(side,'各段独立局部参数 u ∈ [0,1]');const localControls=el('div',{},panels.local);
  panels.global=block(side,'统一参数与节点');
  const uSlider=range(panels.global,'全局参数 u',0,4,u,.001,value=>{pause();u=value;reveal=0;if(mode==='1'){const ss=spans(),span=findSpan(U,k,u);activeSegment=ss.findIndex(s=>s.index===span);local[activeSegment]=(u-ss[activeSegment].a)/(ss[activeSegment].b-ss[activeSegment].a);syncLocal();}update();});
  const segmentSelect=select(panels.global,'选中曲线段',{},0,value=>{activeSegment=+value;const s=spans()[activeSegment];u=(s.a+s.b)/2;if(mode==='1'){local[activeSegment]=.5;syncLocal();}pause();update();});
  panels.basis=block(side,'基函数递推');
  const levelSelect=select(panels.basis,'显示基函数次数',{},k,value=>{level=+value;basisSelected=-1;refreshBasisOptions();refreshBasisLegend();update();});
  const basisSelect=select(panels.basis,'选中基函数',{},-1,value=>{basisSelected=+value;if(mode==='5'&&basisSelected>=0){selected=basisSelected;attach();}update();});
  panels.nodes=block(side,'节点预设');
  const nodePreset=select(panels.nodes,'主曲线节点预设',{uniform:'均匀 · 间距 1',clamped:'端点 k+1 重 · 内部均匀',uneven:'非均匀简单节点',repeat:'内部 k 重节点',custom:'自定义 / 当前节点'},'uniform',value=>{
    if(value==='custom')return;
    pause();const count=d.length;U=value==='uniform'?uniformKnots(count,k):clampedKnots(count,k);
    if(value==='uneven')U=U.map(x=>x>0?x*x/(count-k):x);
    if(value==='repeat'&&count>k+1){const internal=count-k-1;for(let i=0;i<Math.min(k,internal);i++)U[k+1+i]=1;}
    u=domain(U,k)[0];feedback('已应用节点预设，控制顶点不变。');rebuild();
  });
  const nodeEditor=el('div',{},panels.nodes);
  panels.boor=block(side,'de Boor 比例构造');
  const stepSelect=select(panels.boor,'观察插值步骤',{},0,value=>{pause();activeStep=+value;if(animationMode==='steps')reveal=activeStep+1;update();});
  select(panels.boor,'动画方式',{scan:'沿曲线移动参数',steps:'固定参数，逐点递推'},animationMode,value=>{animationMode=value;reveal=0;update();});
  const constructionToggle=check(panels.boor,'显示递推点与连线',true,value=>{showConstruction=value;update();});
  button(panels.boor,'单段 Bézier 特例',()=>{
    pause();d=d.slice(0,k+1).map(p=>p.slice());U=clampedKnots(d.length,k);u=.4;reveal=0;selected=0;feedback('已设为 k+1 个控制顶点、无内部节点；de Boor 与 de Casteljau 对照。');rebuild();
  });
  const animation=block(side,'播放控制'),animationRow=el('div',{class:'row'},animation);
  const play=button(animationRow,'暂停',()=>{playing=!playing;play.textContent=playing?'暂停':'播放';update();},'primary');
  function pause(){playing=false;play.textContent='播放';}
  button(animationRow,'单步',()=>{pause();if(mode==='5'&&animationMode==='steps')reveal=Math.min(k*(k+1)/2,Math.floor(reveal)+1);else if(mode==='4')heartProgress=Math.min(1,heartProgress+.025);else if(mode==='1'){local[activeSegment]=Math.min(1,local[activeSegment]+.025);const s=spans()[activeSegment];u=s.a+(s.b-s.a)*local[activeSegment];syncLocal();}else u=Math.min(domain(U,k)[1],u+.05);update();});
  button(animationRow,'重置动画',()=>{pause();reveal=0;if(mode==='4')heartProgress=0;else if(mode==='5'&&animationMode==='steps'){activeStep=0;}else{u=domain(U,k)[0];activeSegment=0;local=local.map(()=>0);syncLocal();}update();});
  range(animation,'动画速度',.25,3,1,.25,value=>speed=value);
  button(side,'重置观察视角',()=>{view.camera.position.set(...(is3D?[7,5,10]:[0,0,13]));view.controls.target.set(0,0,0);});

  const axisWrap=el('section',{class:'bs-extra'},extras);el('h3',{text:'节点轴与曲线参数区间'},axisWrap);const knotCanvas=graphCanvas(axisWrap,'主曲线完整节点轴',125);const knotLabels=el('div',{class:'bs-node-vector'},axisWrap);const knotVector=el('p',{class:'bs-values'},axisWrap);
  const basisWrap=el('section',{class:'bs-extra'},extras);el('h3',{text:'Cox–de Boor 基函数'},basisWrap);const basisLegend=el('div',{class:'bs-basis-legend'},basisWrap);el('p',{text:'Nᵢ,ₖ：i 为基函数编号，k 为次数。点击编号可联动高亮支撑区间及递推权重路径。'},basisWrap);const basisCanvas=graphCanvas(basisWrap,'B样条基函数完整节点区间');const basisReadout=el('p',{class:'bs-values'},basisWrap);
  const continuityWrap=el('section',{class:'bs-extra'},extras);el('h3',{text:'分段连接处的解析左右导数'},continuityWrap);const continuity=el('div',{class:'bs-continuity'},continuityWrap);
  const boorWrap=el('section',{class:'bs-extra'},extras);const boorTitle=el('h3',{text:'de Boor 递推三角图'},boorWrap);const boorGrid=el('div',{class:'bs-triangles'},boorWrap),boorTable=el('div',{},boorGrid),castTable=el('div',{},boorGrid);const boorFeedback=el('p',{class:'bs-values'},boorWrap);
  const recursionCanvas=graphCanvas(boorTable,'de Boor 比例递推三角图',390),castCanvas=graphCanvas(castTable,'de Casteljau 比例递推三角图',390);
  const ratioCanvas=graphCanvas(boorWrap,'节点比例与空间割边对应',182),influenceCanvas=graphCanvas(boorWrap,'递推权重与基函数对应',145);
  el('p',{text:'青色段 AM 占 α，粉色段 MB 占 1−α。注意：A 的权重取对边 MB/AB=1−α，B 的权重取对边 AM/AB=α。图中的纵向只表示递推层；黄色点先在父边上按 α 割分，再传给下一层。选中一个 Nᵢ,ₖ：顶层该控制顶点权重为 1，其余为 0；沿边乘系数、汇合相加，底层得到的权重就是 Nᵢ,ₖ(u)。'},boorWrap);
  extras.insertBefore(boorWrap,basisWrap);
  const heartWrap=el('section',{class:'bs-extra'},extras);el('h3',{text:'展示 3 的心形特例：三组可编辑节点，共享控制顶点'},heartWrap);el('p',{text:'节点可在轴上拖动或逐项输入。重复节点会叠在同一位置，可用下方编号选择；编辑保持节点非递减。共享端点 𝐝₀=𝐝₆ 仅是预设，修改后不会强制重合。'},heartWrap);
  const heartColumns=el('div',{class:'bs-heart-columns'},heartWrap),heartPanels=[];
  heartNames.forEach((name,i)=>{
    const container=el('article',{class:'bs-heart-panel'},heartColumns);el('h3',{text:`${['左图','中图','右图'][i]}：${name}`},container);
    const axis=graphCanvas(container,`${name}节点轴`,125),labels=el('div',{class:'bs-node-vector'},container),vector=el('p',{class:'bs-values'},container),plot=graphCanvas(container,`${name}基函数`,200),summary=el('p',{class:'bs-values'},container),editor=el('div',{},container);
    button(container,'在展示3构造此曲线',()=>{pause();d=heartD.map(p=>p.slice());k=3;level=3;U=heartU[i].slice();u=domain(U,k)[0];selected=0;modeSelect.value='3';switchMode('3',true);feedback(`已载入${['左图','中图','右图'][i]}节点和共享控制顶点。`);});
    heartPanels.push({container,axis,plot,summary,editor,labels,vector});
  });
  const heartSide=block(side,'心形三图控制');button(heartSide,'恢复心形对照预设',()=>{pause();heartD=heartPoints();heartU=heartKnots();heartProgress=.4;selected=0;rebuild();});
  const heartSlider=range(heartSide,'心形动画相对进度',0,1,heartProgress,.001,value=>{pause();heartProgress=value;update();});
  el('p',{text:'心形三图固定为三次、7 个控制顶点。左图一般不闭合；中图端点插值；右图预设是两段 Bézier，内部一般仅 C⁰ 连续。修改节点后以实际段数和重数为准。'},heartSide);

  function points(){return mode==='4'?heartD:d;}
  function spans(){return knotSpans(U,k);}
  function currentSide(){return u===domain(U,k)[1]?'left':'right';}
  function refreshBasisOptions(){
    basisSelect.replaceChildren();el('option',{value:-1,text:'全部基函数'},basisSelect);for(let i=0;i<U.length-level-1;i++)el('option',{value:i,text:`N${i},${level} · [${U[i]}, ${U[i+level+1]})`},basisSelect);basisSelect.value=basisSelected;
  }
  function rebuild(editors=true){
    nodePreset.value=isUniform()?'uniform':U.every((x,i)=>x===clampedKnots(d.length,k)[i])?'clamped':'custom';
    selected=Math.min(selected,points().length-1);degree.value=mode==='4'?3:k;degree.disabled=mode==='4';dimension.disabled=mode==='4';addButton.disabled=removeButton.disabled=mode==='4';
    pointSelect.replaceChildren();points().forEach((p,i)=>el('option',{value:i,text:`𝐝${i}`},pointSelect));
    const [a,b]=domain(U,k);u=Math.max(a,Math.min(b,u));uSlider.min=a;uSlider.max=b;uSlider.step=(b-a)/2000;
    const ss=spans();local=ss.map((s,i)=>local[i]??.5);activeSegment=Math.min(activeSegment,ss.length-1);segmentSelect.replaceChildren();ss.forEach((s,i)=>el('option',{value:i,text:`第 ${i+1} 段 · [${s.a}, ${s.b}]`},segmentSelect));
    localControls.replaceChildren();localInputs=ss.map((s,i)=>range(localControls,`第 ${i+1} 段局部 u`,0,1,local[i],.001,value=>{pause();activeSegment=i;local[i]=value;u=s.a+value*(s.b-s.a);update();}));
    level=Math.min(level,k);levelSelect.replaceChildren();for(let q=0;q<=k;q++)el('option',{value:q,text:`${q} 次基函数`},levelSelect);if(mode==='5')level=k;levelSelect.value=level;levelSelect.disabled=mode==='5';basisSelected=mode==='5'?(basisSelected>=0&&basisSelected<d.length?basisSelected:basisValues(U,k,u).indexOf(Math.max(...basisValues(U,k,u)))):-1;refreshBasisOptions();if(mode==='5')selected=basisSelected;
    if(editors&&mode==='4')heartPanels.forEach((panel,i)=>makeEditor(panel.editor,()=>heartU[i],3,7,value=>{heartU[i]=value;heartIndex=i;drawStatic();update();},panel.axis));
    else if(editors)makeEditor(nodeEditor,()=>U,k,d.length,value=>{U=value;const [a,b]=domain(U,k);const old=u;u=Math.max(a,Math.min(b,u));feedback(old!==u?'参数已限制到新的有效域。':'节点已更新，曲线与基函数同步变化。');rebuild(false);},knotCanvas);
    stepSelect.replaceChildren();let stepIndex=0;for(let r=1;r<=k;r++)for(let q=0;q<=k-r;q++)el('option',{value:stepIndex++,text:`第 ${r} 层 · 第 ${q+1} 个割边`},stepSelect);activeStep=Math.min(activeStep,stepIndex-1);
    refreshBasisLegend();refreshNodeLabels(knotLabels,knotVector,U,k);heartPanels.forEach((panel,i)=>refreshNodeLabels(panel.labels,panel.vector,heartU[i],3));
    attach();drawStatic();update();
  }
  let localInputs=[];
  function syncLocal(){localInputs.forEach((input,i)=>sync(input,local[i]));}
  function attach(){
    const p=points()[selected];pointSelect.value=selected;coordinates.forEach((input,j)=>input.value=fmt(p[j],4));gizmo.detach();
    if(is3D&&mode!=='4'&&showPoints)gizmo.attach(drawingMain.handles[selected]);
  }
  function refreshNodeLabels(parent,vector,knots,p){
    parent.replaceChildren();knots.forEach((x,i)=>el('span',{html:`<b>u<sub>${i}</sub></b> = ${+x.toFixed(3)}`},parent));
    vector.textContent=`u₀ … uₙ₊ₖ₊₁（n=${knots.length-p-2}，k=${p}）\nU = [${knots.map(x=>+x.toFixed(3)).join(', ')}]`;
  }
  function refreshBasisLegend(){
    basisLegend.replaceChildren();for(let i=0;i<U.length-level-1;i++){
      const entry=button(basisLegend,'',()=>{basisSelected=i;basisSelect.value=i;if(level===k&&i<d.length){selected=i;attach();}update();});
      entry.innerHTML=`N<sub>${i},${level}</sub> <small></small>`;entry.setAttribute('aria-label',`基函数 N_${i},${level}`);entry.style.borderColor=splineColor(i);entry.dataset.basisIndex=i;
    }
  }
  function makeEditor(parent,getKnots,p,count,onValid,canvas){
    parent.replaceChildren();let nodeIndex=Math.min(p+1,getKnots().length-1),dragging=false;
    const suffix=mode==='4'?` ${heartNames[heartPanels.findIndex(x=>x.axis===canvas)]}`:'';
    const nodeChoice=select(parent,'拖动节点编号'+suffix,Object.fromEntries(getKnots().map((x,i)=>[i,`u${i} = ${x}`])),nodeIndex, value=>{nodeIndex=+value;display();});
    const currentLabel=el('label',{class:'bs-node-current',text:'当前节点值'},parent),current=el('input',{type:'number',step:'.05','aria-label':`当前节点值 ${canvas.getAttribute('aria-label')}`},currentLabel);
    current.addEventListener('input',()=>apply(nodeIndex,current.valueAsNumber,current));
    const gap=range(parent,'节点间距 Δu'+suffix,0,2,1,.01,value=>{if(nodeIndex>0)apply(nodeIndex,getKnots()[nodeIndex-1]+value);});
    const details=el('details',{class:'bs-node-details'},parent);el('summary',{text:'逐项输入全部节点值'},details);const grid=el('div',{class:'bs-knot-inputs'},details);
    const inputs=getKnots().map((value,i)=>{
      const label=el('label',{},grid);el('span',{html:`u<sub>${i}</sub>`},label);const input=el('input',{type:'number',step:'.1',value,'aria-label':`${canvas.getAttribute('aria-label')} u${i}`},label);
      input.addEventListener('input',()=>{nodeIndex=i;nodeChoice.value=i;apply(i,input.valueAsNumber,input);});return input;
    });
    const values=el('p',{class:'bs-values'},parent);
    function display(){const knots=getKnots();nodeChoice.value=nodeIndex;nodeChoice.querySelectorAll('option').forEach((o,i)=>o.textContent=`u${i} = ${knots[i]}`);
      if(document.activeElement!==current)current.value=knots[nodeIndex];
      inputs.forEach((input,i)=>{if(document.activeElement!==input)input.value=knots[i];});
      const delta=nodeIndex>0?knots[nodeIndex]-knots[nodeIndex-1]:0;gap.disabled=nodeIndex===0;gap.max=nodeIndex>0?Math.max(.01,(knots[nodeIndex+1]??(knots[nodeIndex]+(knots.at(-1)-knots[0])))-knots[nodeIndex-1]):1;sync(gap,delta);
      values.textContent=`Δ = [${knots.slice(1).map((x,i)=>+(x-knots[i]).toFixed(3)).join(', ')}]`;
    }
    function apply(index,value,input){
      const proposed=getKnots().slice();proposed[index]=value;const error=splineError(Array.from({length:count},()=>[0,0,0]),proposed,p);
      if(error){input?.setAttribute('aria-invalid','true');feedback(error);return false;}
      pause();input?.removeAttribute('aria-invalid');onValid(proposed);display();
      if(mode==='4'){const panel=heartPanels.find(panel=>panel.axis===canvas);refreshNodeLabels(panel.labels,panel.vector,proposed,3);}else refreshNodeLabels(knotLabels,knotVector,proposed,k);
      return true;
    }
    display();
    canvas.onpointerdown=event=>{
      if(!['3','4','5'].includes(mode)){feedback('节点编辑请切换到展示 3、4 或 5。');return;}
      pause();const rect=canvas.getBoundingClientRect(),knots=getKnots(),x=event.clientX-rect.left,X=t=>28+(t-knots[0])/(knots.at(-1)-knots[0])*(rect.width-50);
      const nearest=knots.map((t,i)=>({i,dist:Math.abs(X(t)-x)})).sort((a,b)=>a.dist-b.dist);
      if(Math.abs(X(knots[nodeIndex])-x)>12&&nearest[0].dist<14)nodeIndex=nearest[0].i;
      display();dragging=true;canvas.setPointerCapture(event.pointerId);
    };
    canvas.onpointermove=event=>{
      if(!dragging)return;const rect=canvas.getBoundingClientRect(),knots=getKnots(),fraction=Math.max(0,Math.min(1,(event.clientX-rect.left-28)/(rect.width-50)));
      let value=knots[0]+fraction*(knots.at(-1)-knots[0]);value=Math.max(knots[nodeIndex-1]??value,Math.min(knots[nodeIndex+1]??value,value));value=+value.toFixed(2);
      apply(nodeIndex,value,inputs[nodeIndex]);
    };
    canvas.onpointerup=canvas.onpointercancel=()=>dragging=false;
  }
  function geometryChanged(){
    drawStatic();const p=points()[selected];coordinates.forEach((input,j)=>{if(document.activeElement!==input)input.value=fmt(p[j],4);});update();
  }
  function fillDrawing(draw,controls,knots,p){
    const ss=sampledSpans(controls,knots,p,SAMPLES);draw.curves.forEach((curve,i)=>{curve.visible=i<ss.length;if(curve.visible)write(curve,ss[i].points);});
    write(draw.polygon,controls);draw.polygon.visible=showPolygon;draw.handles.forEach((handle,i)=>{handle.visible=showPoints&&i<controls.length;if(i<controls.length)handle.position.set(...controls[i]);});
  }
  function drawStatic(){
    if(mode==='4'){heartDraw.forEach((draw,i)=>fillDrawing(draw,heartD,heartU[i],3));return;}
    fillDrawing(drawingMain,d,U,k);renderContinuity();
  }
  function renderContinuity(){
    continuity.replaceChildren();const ss=spans();
    if(ss.length<2){el('p',{text:'只有一个非零节点区间，没有内部段连接。'},continuity);return;}
    for(let i=1;i<ss.length;i++){
      const t=ss[i].a,multiplicity=U.filter(x=>x===t).length,order=k-multiplicity;
      const row=el('details',{},continuity);el('summary',{text:`u=${fmt(t,2)} · 重数 ${multiplicity} · 一般 ${order>=0?'C'+order:'不连续'}（点击看左右值）`},row);
      const lines=[];for(let q=0;q<=Math.max(0,k-1);q++){
        const left=q?splineDerivative(d,U,k,t,q,'left'):deBoor(d,U,k,t,'left').point,right=q?splineDerivative(d,U,k,t,q,'right'):deBoor(d,U,k,t,'right').point;
        const error=Math.hypot(...left.map((x,j)=>x-right[j]));lines.push(`${q===0?'𝐫':`𝐫 的 ${q} 阶导数`}：左 ${vec(left)} / 右 ${vec(right)}；差 ${error.toExponential(2)}`);
      }
      el('p',{class:'bs-values',text:lines.join('\n')+'\n若一阶导数为零，切向方向未定义。'},row);
    }
  }
  function isUniform(){return U.every((x,i)=>i===0||Math.abs(x-U[i-1]-1)<1e-10);}
  function switchMode(value,imported=false){
    const old=mode;if(['3','5'].includes(old)&&!imported)editableKnots={knots:U.slice(),count:d.length,degree:k};
    pause();mode=value;modeSelect.value=value;stage.dataset.bsMode=value;heartLabels.hidden=value!=='4';main.visible=value!=='4';hearts.forEach(g=>g.visible=value==='4');
    for(const [element,visible]of [[panels.local,value==='1'],[panels.global,value!=='4'],[panels.basis,['2','3','5'].includes(value)],[panels.nodes,['3','5'].includes(value)],[panels.boor,value==='5'],[heartSide,value==='4'],[axisWrap,value!=='4'],[basisWrap,['2','3','5'].includes(value)],[continuityWrap,value==='1'],[boorWrap,value==='5'],[heartWrap,value==='4']])element.hidden=!visible;
    if(['1','2'].includes(value)&&!isUniform()){
      U=uniformKnots(d.length,k);feedback('展示 1/2 使用间距 1 的均匀节点；展示 3/5 的节点编辑已保留。');
    }else if(['3','5'].includes(value)&&!['3','5'].includes(old)&&!imported){
      U=editableKnots?.count===d.length&&editableKnots.degree===k?editableKnots.knots.slice():editableDefaults(d.length,k);u=Math.max(domain(U,k)[0],Math.min(domain(U,k)[1],u));
    }
    if(imported)editableKnots={knots:U.slice(),count:d.length,degree:k};
    if(value==='5')level=k;
    view.controls.enabled=value!=='4';dimension.value=value==='4'?'plane':is3D?'space':'plane';
    modeTabs.forEach((tab,i)=>tab.classList.toggle('active',String(i+1)===value));rebuild();if(drawer.open)document.querySelector('#lab-demo').scrollIntoView({block:'start'});
  }
  function sync(input,value){input.value=value;input.previousElementSibling.querySelector('output').textContent=fmt(value,3);}
  function renderRecursion(result){
    construction.visible=mode==='5'&&showConstruction;cutLabel.hidden=!construction.visible;
    const total=k*(k+1)/2,visible=animationMode==='steps'?Math.floor(reveal):total;
    let phase=1;
    if(animationMode==='steps'){
      const whole=Math.floor(reveal),fraction=reveal-whole;
      activeStep=Math.min(total-1,fraction>1e-8?whole:Math.max(0,whole-1));phase=fraction>1e-8?fraction:reveal>0?1:0;
    }
    stepSelect.value=activeStep;const step=deBoorStep(result,U,k,activeStep),tracked=basisSelected>=0?basisSelected:selected;
    let visited=0,comparison=null,maxError=0;
    const spanA=U[result.span],spanB=U[result.span+1];
    if(U.filter(x=>x===spanA).length>=k&&U.filter(x=>x===spanB).length>=k)comparison=casteljau(d.slice(result.span-k,result.span+1),(u-spanA)/(spanB-spanA));
    castTable.hidden=!comparison;boorGrid.classList.toggle('bs-comparing',!!comparison);boorTitle.textContent=comparison?'de Boor 与 de Casteljau：同一割比的递推':'de Boor：割边比例递推三角图';
    recursionLines.forEach((line,r)=>{
      const layer=result.layers[r]??[],count=r===0?layer.length:Math.max(0,Math.min(layer.length,visible-visited));
      line.visible=r<=k;write(line,layer.slice(0,count));recursionDots[r].forEach((dot,j)=>{dot.visible=j<count;if(dot.visible)dot.position.set(...layer[j]);});
      castLines[r].visible=!!comparison&&r<=k&&construction.visible;
      if(comparison&&r<=k){write(castLines[r],comparison[r].slice(0,count));comparison[r].forEach((p,j)=>maxError=Math.max(maxError,Math.hypot(...p.map((x,h)=>x-layer[j][h]))));}
      if(r>0)visited+=layer.length;
    });
    const cutPhase=Math.min(1,phase/.7);write(cutAM,[step.a,step.m]);write(cutMB,[step.m,step.b]);cutMarker.position.set(...step.a.map((x,i)=>x+cutPhase*(step.m[i]-x)));cutGroup.visible=showConstruction;
    cutLabel.textContent=`第 ${step.r} 层 / 第 ${step.q+1} 个割边 · AM : MB = ${fmt(step.alpha)} : ${fmt(1-step.alpha)}\n青色 AM 占 α，粉色 MB 占 1−α；黄色点按比例移动。`;
    drawRecursion(recursionCanvas,result,{tracked,active:activeStep,phase,visible,title:'de Boor'});
    if(comparison){const t=(u-spanA)/(spanB-spanA);drawRecursion(castCanvas,{...result,layers:comparison,alphas:result.alphas.map((row,r)=>r?row.map(()=>t):row)},{tracked,active:activeStep,phase,visible,title:'de Casteljau'});}
    drawRatios(ratioCanvas,step,U,u,cutPhase);const weights=basisValues(U,k,u);drawInfluences(influenceCanvas,result,weights,step,tracked);
    const propagated=result.influences.at(-1)[0],error=Math.max(...propagated.map((x,j)=>Math.abs(x-weights[result.span-k+j])));
    boorFeedback.textContent=`当前节点区间 [${U[result.span]}, ${U[result.span+1]}]；活动顶点 𝐝${result.span-k}…𝐝${result.span}。\n权重沿同一递推边传播：w = (1−α)w左 + αw右；最终各项 = Nᵢ,ₖ(u)，误差 ${error.toExponential(2)}。\n${comparison?'de Casteljau 对应点误差 '+maxError.toExponential(2)+'；两图横向割比完全相同。':'仅端点夹持且仍有内部节点，一般不是一段 Bézier 曲线。'}`;
    stage.dataset.ratioAlpha=String(step.alpha);stage.dataset.weightError=String(error);stage.dataset.activeStep=String(activeStep);stage.dataset.ratioPhase=String(phase);
  }
  function update(){
    const comparisonMode=mode==='4';degree.disabled=comparisonMode;addButton.disabled=removeButton.disabled=comparisonMode;
    if(comparisonMode){
      heartDraw.forEach((draw,i)=>{const [a,b]=domain(heartU[i],3),t=heartProgress===1?b:a+(b-a)*heartProgress;draw.current.position.set(...deBoor(heartD,heartU[i],3,t).point);draw.handles.forEach((p,j)=>p.material=j===selected?white:muted);drawBasis(heartPanels[i].plot,heartU[i],3,t,{width:curveWidth});drawKnotAxis(heartPanels[i].axis,heartU[i],3,t);const ss=knotSpans(heartU[i],3);heartPanels[i].summary.textContent=`${ss.length} 段 · 有效域 [${a}, ${b}]\n𝐫(${fmt(t)}) = ${vec(draw.current.position.toArray(),2)}\n内部节点：${[...new Set(heartU[i].filter(x=>x>a&&x<b))].map(x=>`${x} 重数${heartU[i].filter(y=>y===x).length}`).join('；')||'无'}`;});
      segmentDots.forEach(p=>p.visible=false);gizmo.detach();sync(heartSlider,heartProgress);overlay.textContent='心形对照 · 共享控制顶点 · 各图独立节点编辑';
      readout.textContent=`三次心形对照；7 个共享控制顶点。当前 𝐝${selected} = ${vec(heartD[selected])}\n非零段数：${heartU.map(knots=>knotSpans(knots,3).length).join(' / ')}。颜色对应参数区间和曲线段。\n左图非夹持，一般不经过端点；中图夹持；右图初始为两段 Bézier。`;
    }else{
      const [a,b]=domain(U,k);u=Math.max(a,Math.min(b,u));const result=deBoor(d,U,k,u),weights=basisValues(U,k,u),ss=spans();
      const actual=ss.findIndex(s=>s.index===result.span);if(mode!=='1')activeSegment=actual;
      drawingMain.current.visible=mode!=='1'&&!(mode==='5'&&animationMode==='steps'&&reveal<k*(k+1)/2);drawingMain.current.position.set(...result.point);
      const influence=weights[selected];drawingMain.handles.forEach((p,i)=>{p.visible=showPoints&&i<d.length;p.material=i===selected?white:weights[i]>1e-10?materials[i%8]:muted;});
      drawingMain.curves.forEach((l,i)=>{const affects=ss[i]&&ss[i].b>U[selected]&&ss[i].a<U[selected+k+1];l.material.opacity=i===activeSegment?1:affects?.85:.2;l.material.transparent=true;});
      segmentDots.forEach((p,i)=>{p.visible=mode==='1'&&i<ss.length;if(p.visible)p.position.set(...deBoor(d,U,k,ss[i].a+(ss[i].b-ss[i].a)*local[i],local[i]===1?'left':'right').point);});
      sync(uSlider,u);segmentSelect.value=activeSegment;drawKnotAxis(knotCanvas,U,k,u);
      if(['2','3','5'].includes(mode)){
        drawBasis(basisCanvas,U,k,u,{level,selected:basisSelected,width:curveWidth});const values=level===k?weights:basisValues(U,level,u,currentSide());basisReadout.textContent=`显示 ${level} 次：${values.map((x,i)=>`N${i},${level}=${fmt(x)}`).join('；')}\n当前 k 次权重和 = ${fmt(weights.reduce((a,b)=>a+b,0),6)}；非零 ${weights.filter(x=>x>1e-10).length} 个。${basisSelected>=0?'支撑区间以图下彩条标出。':''}`;
      }
      if(['2','3','5'].includes(mode)){const values=basisValues(U,level,u,currentSide());[...basisLegend.children].forEach((entry,i)=>{entry.classList.toggle('active',i===basisSelected);entry.querySelector('small').textContent=fmt(values[i]);});}
      if(mode==='5')renderRecursion(result);else{construction.visible=false;cutLabel.hidden=true;}
      const error=Math.hypot(...result.point.map((x,i)=>x-basisPoint(d,U,k,u)[i]));
      overlay.textContent=`${names[mode]}\nk=${k} · ${d.length} 个控制顶点 · ${ss.length} 段\n白色：选中 𝐝${selected}；彩色：活动控制顶点 / 曲线段`;
      readout.textContent=`𝐫(u)=Σ Nᵢ,ₖ(u)𝐝ᵢ；次数 k=${k}，n=${d.length-1}，节点数 ${U.length}。\nu=${fmt(u)} ∈ [${a}, ${b}]；第 ${actual+1} 段局部 u=${fmt((u-ss[actual].a)/(ss[actual].b-ss[actual].a))}；𝐫(u)=${vec(result.point)}\n𝐝${selected}=${vec(d[selected])}；其当前权重 ${fmt(influence)}；支撑 [${U[selected]}, ${U[selected+k+1]})。\n基函数加权与 de Boor 误差 ${error.toExponential(2)}；${playing?'播放中':'已暂停'}。${mode==='1'?'各段运动点使用各自独立局部参数。':''}`;
    }
    stage.dataset.bsMode=mode;stage.dataset.count=points().length;stage.dataset.degree=comparisonMode?'3':String(k);stage.dataset.segments=(comparisonMode?heartU.map(knots=>knotSpans(knots,3).length).join(','):spans().length);stage.dataset.playing=String(playing);stage.dataset.reveal=String(Math.floor(reveal));stage.dataset.curveWidth=String(curveWidth);
  }
  gizmo.addEventListener('dragging-changed',event=>{view.controls.enabled=!event.value;if(event.value)pause();});
  gizmo.addEventListener('objectChange',()=>{if(gizmo.object){d[selected]=gizmo.object.position.toArray();geometryChanged();}});
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane();let dragging=false;
  function pointerRay(event){
    const rect=view.renderer.domElement.getBoundingClientRect();let x=event.clientX-rect.left,y=event.clientY-rect.top,w=rect.width,h=rect.height,camera=view.camera;
    if(mode==='4'){
      const mobile=matchMedia('(max-width:740px)').matches;heartIndex=Math.max(0,Math.min(2,Math.floor(mobile?y/(h/3):x/(w/3))));if(mobile){h/=3;y-=heartIndex*h;}else{w/=3;x-=heartIndex*w;}fitHeartCamera(w,h);camera=heartCamera;
    }
    pointer.set(x/w*2-1,-y/h*2+1);camera.updateMatrixWorld();raycaster.setFromCamera(pointer,camera);
  }
  const canvas=view.renderer.domElement;
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0||!showPoints||(is3D&&mode!=='4'&&gizmo.axis))return;pointerRay(event);const handles=mode==='4'?heartDraw[heartIndex].handles:drawingMain.handles.slice(0,d.length);handles.forEach(p=>p.updateMatrixWorld());const hit=raycaster.intersectObjects(handles)[0];if(!hit)return;
    selected=handles.indexOf(hit.object);pause();attach();update();
    if(!is3D||mode==='4'){dragging=true;plane.set(new THREE.Vector3(0,0,1),-points()[selected][2]);view.controls.enabled=false;canvas.setPointerCapture(event.pointerId);}
  });
  canvas.addEventListener('pointermove',event=>{if(!dragging)return;pointerRay(event);const p=new THREE.Vector3();if(raycaster.ray.intersectPlane(plane,p)){points()[selected]=p.toArray();geometryChanged();}});
  for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,()=>{dragging=false;view.controls.enabled=mode!=='4';});
  function fitHeartCamera(w,h){const aspect=w/h,halfHeight=Math.max(3.8,3.5/aspect);heartCamera.left=-halfHeight*aspect;heartCamera.right=halfHeight*aspect;heartCamera.top=halfHeight;heartCamera.bottom=-halfHeight;heartCamera.updateProjectionMatrix();}
  view.renderWith((renderer,w,h)=>{
    const axes=view.scene.getObjectByName('global-coordinate-system');const wasAxes=axes.visible;
    if(mode==='4'){
      main.visible=false;axes.visible=false;renderer.setScissorTest(true);const stacked=matchMedia('(max-width:740px)').matches;
      for(let i=0;i<3;i++){hearts.forEach((g,j)=>g.visible=i===j);const rect=stacked?[0,h-(i+1)*h/3,w,h/3]:[i*w/3,0,w/3,h];fitHeartCamera(rect[2],rect[3]);renderer.setViewport(...rect);renderer.setScissor(...rect);renderer.render(view.scene,heartCamera);}
      hearts.forEach(g=>g.visible=true);renderer.setScissorTest(false);axes.visible=wasAxes;
    }else{main.visible=true;hearts.forEach(g=>g.visible=false);renderer.setScissorTest(false);renderer.setViewport(0,0,w,h);renderer.render(view.scene,view.camera);}
  });
  animate(dt=>{
    if(!playing||gizmo.dragging||dragging)return;
    if(mode==='4'){heartProgress=Math.min(1,heartProgress+dt*speed/12);if(heartProgress===1)pause();}
    else if(mode==='5'&&animationMode==='steps'){reveal=Math.min(k*(k+1)/2,reveal+dt*speed*1.5);if(reveal===k*(k+1)/2)pause();}
    else if(mode==='1'){local=local.map(x=>Math.min(1,x+dt*speed/10));const s=spans()[activeSegment];u=s.a+(s.b-s.a)*local[activeSegment];syncLocal();if(local.every(x=>x===1))pause();}
    else{const [a,b]=domain(U,k);u=Math.min(b,u+dt*speed*(b-a)/12);if(u===b)pause();}
    update();
  });
  const appearance=block(side,'外观与图层');
  range(appearance,'曲线线宽（px）',1,8,2,.5,value=>{curveWidth=value;wideLines.forEach(line=>line.material.linewidth=value);update();});
  appearance.append(pointToggle.parentElement,polygonToggle.parentElement,constructionToggle.parentElement);
  const axesOptions=side.querySelector('.coordinate-options');
  const resetViewButton=[...side.children].find(node=>node.tagName==='BUTTON'&&node.textContent==='重置观察视角');
  side.append(status,panels.global,panels.nodes,heartSide,animation,panels.boor,degree.parentElement,panels.local,panels.basis,edit,appearance,axesOptions,resetViewButton,switcher);
  const tabs=el('nav',{class:'bs-mode-tabs','aria-label':'B样条展示切换'},document.querySelector('.page-head'));
  const modeTabs=Object.entries(names).map(([value,name])=>button(tabs,name,()=>switchMode(value)));
  const sidebar=document.querySelector('#lab-controls'),disclosure=document.querySelector('#control-disclosure');
  const mobileOpen=button(document.querySelector('.page-head'),'打开参数面板',()=>{
    document.body.classList.add('bs-panel-open');drawer.show();document.querySelector('#lab-demo').scrollIntoView({block:'start'});
  },'bs-open-panel primary');
  const drawer=el('dialog',{class:'bs-control-drawer side','aria-label':'B样条参数面板'},document.body),drawerHeader=el('div',{class:'bs-drawer-header'},drawer);
  el('strong',{text:'参数设置 · 上方画面可继续拖动'},drawerHeader);button(drawerHeader,'收起',closeDrawer);
  function closeDrawer(){drawer.close();document.body.classList.remove('bs-panel-open');}
  drawer.addEventListener('keydown',event=>{if(event.key==='Escape')closeDrawer();});
  const media=matchMedia('(max-width:740px)');
  function placeConsole(){if(media.matches){drawer.append(side);sidebar.hidden=true;mobileOpen.hidden=false;}else{closeDrawer();disclosure.append(side);sidebar.hidden=false;disclosure.open=true;mobileOpen.hidden=true;}}
  media.addEventListener('change',placeConsole);placeConsole();
  new ResizeObserver(()=>update()).observe(extras);
  info.innerHTML='<div class="formula"><b>r</b>(u) = Σᵢ₌₀ⁿ Nᵢ,ₖ(u) <b>d</b>ᵢ<br>U = [u₀,…,uₙ₊ₖ₊₁]；曲线有效域 [uₖ,uₙ₊₁]<br>Nᵢ,₀(u) = 1（uᵢ ≤ u &lt; uᵢ₊₁），否则为 0<br>Nᵢ,ₖ(u) = (u−uᵢ)/(uᵢ₊ₖ−uᵢ) Nᵢ,ₖ₋₁(u)<br>　+ (uᵢ₊ₖ₊₁−u)/(uᵢ₊ₖ₊₁−uᵢ₊₁) Nᵢ₊₁,ₖ₋₁(u)</div><p>𝐝ᵢ 是控制顶点，uᵢ 是节点，𝐫(u) 是曲线点；三者含义不同。次数统一记为 k。n+1 个控制顶点需要 n+k+2 个节点。递推公式的分母为零时，对应整项取零。</p><p>均匀节点 uⱼ=j−k，间距为 1，有效域从 0 开始，共 n−k+1 段。第 s 段局部参数 u∈[0,1] 与全局参数满足 u_global=s+u_local。固定 k 后在末端追加一个控制顶点，就增加一段，已有段不变。</p><p>基函数支撑在 [uᵢ,uᵢ₊ₖ₊₁) 内，控制顶点只影响局部区间。在有效曲线域内基函数非负、和为 1，一般位置至多有 k+1 个非零权重。完整基函数图覆盖全部节点范围，阴影标明有效曲线域；域外权重不强制归一化，曲线不外推。</p><p>内部节点重数为 q 时一般为 Cᵏ⁻ᑫ 连续。简单节点一般 Cᵏ⁻¹；三次曲线的单、双、三重内部节点分别一般为 C²、C¹、C⁰；内部 k+1 重节点允许断开，画线时逐段采样，不能跨断点连线。零长度区间不计作曲线段。</p><div class="formula"><b>d</b>ᵢ⁽⁰⁾ = <b>d</b>ᵢ（i=ℓ−k,…,ℓ）<br>αᵢ⁽ʳ⁾ = (u−uᵢ)/(uᵢ₊ₖ₋ᵣ₊₁−uᵢ)<br><b>d</b>ᵢ⁽ʳ⁾ = (1−αᵢ⁽ʳ⁾)<b>d</b>ᵢ₋₁⁽ʳ⁻¹⁾ + αᵢ⁽ʳ⁾<b>d</b>ᵢ⁽ʳ⁻¹⁾<br><b>r</b>(u) = <b>d</b>ℓ⁽ᵏ⁾；u∈[uℓ,uℓ₊₁)</div><p>de Boor 用当前非零节点区间附近 k+1 个控制顶点逐层插值。内部节点默认取右侧区间，有效域右端点取左极限，非夹持曲线的最后一个基函数不能强制取 1。</p><p>单段 Bézier 特例必须同时满足：k+1 个控制顶点、两端各 k+1 重节点、没有内部节点。此时基函数等于 Bernstein 基函数，de Boor 各层等于 de Casteljau。仅有端点重复且仍有内部节点，一般不是使用全部原控制顶点的一段 Bézier。心形右图是两段三次 Bézier，可逐段比较。</p>';
  instructions.innerHTML='<p>展示 1 每段都有独立的局部 u 滑块和彩色运动点；选中段后观察相关顶点。展开画面下方连接处，查看解析左右导数。增加控制顶点前可先暂停动画对比段数。</p><p>展示 2 专门观察均匀基函数；展示 3 编辑非均匀节点及间距，观察基函数与曲线同步变化。Nᵢ,ₖ 上的 i 是编号、k 是次数；点击彩色标识高亮对应基函数。节点轴下逐项列出全部 uᵢ 与完整 U。</p><p>展示 4 是展示 3 的心形特例。三图共享控制顶点、各自编辑节点；可载入展示 3 继续构造。节点轴先选择编号再拖动，或直接输入节点数值；不合法输入保留在编辑框并标红，曲线保持上次有效状态。端节点范围也可数值调整。输入新值后切换焦点即可继续输入其他节点。左图不保证闭合，中、右图初始插值重合端点。</p><p>展示 5 的比例三角图在基函数图上方。青、粉两段分别占 α 和 1−α；节点区间割比与空间割边相同，黄色点逐步演示比例。点击基函数标识，可跟踪该控制顶点的权重如何沿递推边传播，最终成为 Nᵢ,ₖ(u)。可固定参数逐点递推，也可让参数沿曲线移动。单步控制当前动画方式；重置回到起点。选择单段 Bézier 特例，或从心形右图载入，查看两种算法对应点误差。节点预设和次数变化会明确重新生成节点；普通展示切换不会改动控制顶点。</p><p>默认平面直接拖动顶点，数值框可输入 XYZ；空间模式选择顶点后拖三轴。拖动背景旋转、滚轮缩放、右键平移，手机用双指缩放和平移；点击“打开参数面板”调节节点与 u，底部面板展开时上方保留曲线窗口，收起后恢复大图。图层开关在动画中保持。当前显示的 u 数值和选中顶点坐标见画面下方。</p>';
  // Initialize the visibility without stopping the project's default autoplay.
  switchMode('1');playing=true;play.textContent='暂停';update();
}
