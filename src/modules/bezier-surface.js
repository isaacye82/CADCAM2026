import {TransformControls} from 'three/addons/controls/TransformControls.js';
import {THREE,makeView,range,select,check,button,block,el,vectorInput,animate,fmt,vec,label3} from '../ui.js';
import {surfaceTypes,surfaceGrid,surfacePoint,auxiliaryPoints,tensorPoint,surfaceNormal} from '../bezier-surface.js';
import {surfaceShaders} from '../surface-shaders.js';

export function bezierSurfaceDemo({stage,side,readout,info,instructions}){
  const view=makeView(stage,{position:[8,7,9],grid:false});
  let type='cubic',grid=surfaceGrid(3,3),selected=0,u=.35,v=.4,resolution=14,mode='B',direction='u',playing=true,speed=1;
  let showPoints=true,showHelpers=true,showCurves=true,progressive=true,shading='phong';
  const uniforms={lightDirection:{value:new THREE.Vector3(2,4,3).normalize()},specularStrength:{value:.8},shininess:{value:65},sweep:{value:1},sweepAxis:{value:0},wire:{value:false}};
  const materials=Object.fromEntries(['flat','gouraud','phong'].map(mode=>[mode,new THREE.ShaderMaterial({...surfaceShaders(mode),uniforms,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1})]));
  const wireMaterial=new THREE.ShaderMaterial({...surfaceShaders('phong'),uniforms:{...uniforms,wire:{value:true}},wireframe:true,side:THREE.DoubleSide});
  const surface=new THREE.Mesh(new THREE.BufferGeometry(),materials.phong),wire=new THREE.Mesh(surface.geometry,wireMaterial);wire.visible=false;view.root.add(surface,wire);
  const original=new THREE.Group(),auxiliary=new THREE.Group(),curves=new THREE.Group(),directions=new THREE.Group();view.root.add(original,auxiliary,curves,directions);
  const sphere=new THREE.SphereGeometry(.075,12,8),pointMaterial=new THREE.MeshBasicMaterial({color:0x6b9dff}),selectedMaterial=new THREE.MeshBasicMaterial({color:0xffffff});
  const auxMaterial=new THREE.MeshBasicMaterial({color:0xf7bc69}),currentMaterial=new THREE.MeshBasicMaterial({color:0xf58ca9,depthTest:false});
  const current=new THREE.Mesh(sphere,currentMaterial);current.scale.setScalar(1.7);current.renderOrder=5;view.root.add(current);
  const handles=[];const helperHandles=Array.from({length:5},()=>{const p=new THREE.Mesh(sphere,auxMaterial);auxiliary.add(p);return p;});
  // Persistent buffers: animation updates coordinates/uniforms only, never creates GPU resources.
  function dynamicLine(parent,count,color,segments=false){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3).setUsage(THREE.DynamicDrawUsage));const line=new (segments?THREE.LineSegments:THREE.Line)(geometry,new THREE.LineBasicMaterial({color,depthTest:false}));line.frustumCulled=false;line.renderOrder=3;parent.add(line);return line;}
  const net=dynamicLine(original,80,0x607a99,true),polygon=dynamicLine(auxiliary,5,0xf7bc69),uCurve=dynamicLine(curves,97,0x57dfcf),vCurve=dynamicLine(curves,97,0xc89eff);
  const uArrow=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),.8,0x57dfcf,.18,.1),vArrow=new THREE.ArrowHelper(new THREE.Vector3(0,0,1),new THREE.Vector3(),.8,0xc89eff,.18,.1);directions.add(uArrow,vArrow);
  const uLabel=label3(directions,'U +',[0,0,0],'#57dfcf'),vLabel=label3(directions,'V +',[0,0,0],'#c89eff');
  const gizmo=new TransformControls(view.camera,view.renderer.domElement);gizmo.setSize(.65);view.scene.add(gizmo.getHelper());
  const legend=el('div',{class:'overlay surface-legend',html:'<span style="color:#6b9dff">● Pᵢⱼ 原始控制点</span>　<span style="color:#f7bc69">● Q / R 辅助点与多边形</span><br><span style="color:#57dfcf">━ U 曲线 / U +</span>　<span style="color:#c89eff">━ V 曲线 / V +</span>　<span style="color:#f58ca9">● S(u,v)</span>'},stage);
  select(side,'曲面次数与控制网格',Object.fromEntries(Object.entries(surfaceTypes).map(([key,t])=>[key,t.label])),type,key=>{type=key;resetGrid();});
  const edit=block(side,'控制顶点编辑');
  const pointSelect=select(edit,'选中控制点',{},'0',value=>{selected=+value;attach();});
  const inputs=vectorInput(edit,'选中点坐标',grid[0][0],value=>{const [i,j]=indices();grid[i][j]=value;handles[selected].position.set(...value);updateGeometry();updateConstruction();});
  el('p',{class:'muted',text:'点击蓝色顶点后拖动 XYZ 三轴或平面控制柄；也可从列表选点并输入坐标。拖动背景旋转视角。'},edit);
  button(edit,'重置控制网格',resetGrid);
  const display=block(side,'图层显示');
  check(display,'显示控制网格',true,value=>{net.visible=value;});
  check(display,'显示控制顶点',true,value=>{showPoints=value;handles.forEach(p=>p.visible=value);attach();});
  check(display,'显示曲面线框',false,value=>wire.visible=value);
  check(display,'显示辅助控制点与控制多边形',true,value=>{showHelpers=value;auxiliary.visible=value;});
  check(display,'显示 U/V 构造曲线',true,value=>{showCurves=value;curves.visible=value;});
  check(display,'显示 U/V 参数方向',true,value=>directions.visible=value);
  const lighting=block(side,'光照对比（共享几何与参数）');
  const lightingText=el('p',{class:'muted'},lighting);
  const explanations={flat:'Flat：在面中心用面法线求光照，每个三角形内颜色恒定，面片边界明显。',gouraud:'Gouraud：在顶点求环境光、漫反射和镜面反射，在面内插值颜色，可能漏掉尖锐高光。',phong:'Phong：插值顶点法线与位置，片元阶段求完整光照，高光更连续。'};
  select(lighting,'光照模式',{flat:'Flat · 逐面光照',gouraud:'Gouraud · 顶点光照',phong:'Phong · 片元光照'},shading,value=>{shading=value;surface.material=materials[value];updateConstruction();});
  range(lighting,'曲面网格分辨率',4,48,resolution,1,value=>{resolution=value;updateGeometry();updateConstruction();});
  range(lighting,'光源方位角（度）',-180,180,34,1,()=>updateLight());
  range(lighting,'光源仰角（度）',5,85,48,1,()=>updateLight());
  function updateLight(){const sliders=lighting.querySelectorAll('input[type=range]'),a=+sliders[1].value*Math.PI/180,e=+sliders[2].value*Math.PI/180;uniforms.lightDirection.value.set(Math.cos(e)*Math.cos(a),Math.sin(e),Math.cos(e)*Math.sin(a));}
  range(lighting,'镜面反射强度',0,2,.8,.05,value=>uniforms.specularStrength.value=value);
  range(lighting,'光泽度',1,180,65,1,value=>uniforms.shininess.value=value);
  const construction=block(side,'张量积构造与动画');
  const uInput=range(construction,'u 参数',0,1,u,.001,value=>{pause();u=value;updateConstruction();});
  const vInput=range(construction,'v 参数',0,1,v,.001,value=>{pause();v=value;updateConstruction();});
  select(construction,'构造方向',{u:'先沿 V 插值 → Qᵢ(v) → U 曲线',v:'先沿 U 插值 → Rⱼ(u) → V 曲线'},direction,value=>{direction=value;updateConstruction();});
  select(construction,'动画模式',{A:'模式 A：固定一个参数，点沿曲线移动',B:'模式 B：曲线移动，逐步扫掠成面'},mode,value=>{mode=value;updateConstruction();});
  check(construction,'渐进显示已扫掠曲面区域',true,value=>{progressive=value;updateConstruction();});
  const row=el('div',{class:'row'},construction);
  const play=button(row,'暂停',()=>{playing=!playing;play.textContent=playing?'暂停':'播放';updateConstruction();},'primary');
  function pause(){playing=false;play.textContent='播放';}
  button(row,'重置动画',()=>{pause();if(mode==='B'){if(direction==='u')v=0;else u=0;}else if(direction==='u')u=0;else v=0;updateConstruction();});
  range(construction,'动画速度',.25,3,1,.25,value=>speed=value);
  button(side,'重置观察视角',()=>view.reset());
  function indices(){return [Math.floor(selected/grid[0].length),selected%grid[0].length];}
  function attach(){handles.forEach((p,i)=>p.material=i===selected?selectedMaterial:pointMaterial);gizmo.detach();if(showPoints&&handles[selected])gizmo.attach(handles[selected]);const [i,j]=indices();inputs.forEach((input,k)=>input.value=fmt(grid[i][j][k],4));pointSelect.value=String(selected);}
  function write(line,points){const attr=line.geometry.attributes.position;points.forEach((p,i)=>attr.setXYZ(i,...p));line.geometry.setDrawRange(0,points.length);attr.needsUpdate=true;}
  function resetGrid(){const {m,n}=surfaceTypes[type];grid=surfaceGrid(m,n);selected=0;gizmo.detach();handles.forEach(p=>original.remove(p));handles.length=0;pointSelect.replaceChildren();grid.forEach((row,i)=>row.forEach((p,j)=>{const handle=new THREE.Mesh(sphere,pointMaterial);handle.position.set(...p);handle.visible=showPoints;handle.userData.index=handles.length;original.add(handle);el('option',{value:handles.length,text:`P${i},${j}`},pointSelect);handles.push(handle);}));attach();updateGeometry();updateConstruction();}
  function updateGeometry(){
    const count=resolution*resolution*6;let geo=surface.geometry;
    if(geo.attributes.position?.count!==count){const next=new THREE.BufferGeometry();for(const name of ['position','normal','faceNormal','faceCenter'])next.setAttribute(name,new THREE.BufferAttribute(new Float32Array(count*3),3).setUsage(THREE.DynamicDrawUsage));next.setAttribute('parameter',new THREE.BufferAttribute(new Float32Array(count*2),2));surface.geometry=wire.geometry=next;geo.dispose();geo=next;}
    const samples=Array.from({length:resolution+1},(_,i)=>Array.from({length:resolution+1},(_,j)=>({p:surfacePoint(grid,i/resolution,j/resolution),n:surfaceNormal(grid,i/resolution,j/resolution)})));
    let index=0;const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),fn=new THREE.Vector3();
    for(let i=0;i<resolution;i++)for(let j=0;j<resolution;j++)for(const tri of [[[i,j],[i,j+1],[i+1,j]],[[i+1,j],[i,j+1],[i+1,j+1]]]){
      const parameters=tri.map(([x,y])=>[x/resolution,y/resolution]),positions=tri.map(([x,y])=>samples[x][y].p);a.fromArray(positions[0]);b.fromArray(positions[1]);c.fromArray(positions[2]);fn.crossVectors(b.sub(a),c.sub(a)).normalize();const center=[0,1,2].map(k=>positions.reduce((s,p)=>s+p[k]/3,0));
      parameters.forEach(([s,t],k)=>{geo.attributes.position.setXYZ(index,...positions[k]);geo.attributes.normal.setXYZ(index,...samples[tri[k][0]][tri[k][1]].n);geo.attributes.parameter.setXY(index,s,t);geo.attributes.faceNormal.setXYZ(index,fn.x,fn.y,fn.z);geo.attributes.faceCenter.setXYZ(index,...center);index++;});
    }
    Object.values(geo.attributes).forEach(attr=>attr.needsUpdate=true);geo.computeBoundingSphere();
    const edges=[];grid.forEach((row,i)=>row.forEach((p,j)=>{if(i+1<grid.length)edges.push(p,grid[i+1][j]);if(j+1<row.length)edges.push(p,row[j+1]);}));write(net,edges);
  }
  function syncSlider(input,value){input.value=value;input.previousElementSibling.querySelector('output').textContent=fmt(value,3);}
  function updateConstruction(){
    const helper=auxiliaryPoints(grid,direction==='u'?v:u,direction);helperHandles.forEach((p,i)=>{p.visible=i<helper.length;if(p.visible)p.position.set(...helper[i]);});write(polygon,helper);
    write(uCurve,Array.from({length:97},(_,i)=>surfacePoint(grid,i/96,v)));write(vCurve,Array.from({length:97},(_,i)=>surfacePoint(grid,u,i/96)));
    const p=surfacePoint(grid,u,v);current.position.set(...p);
    for(const [arrow,label,axis] of [[uArrow,uLabel,'u'],[vArrow,vLabel,'v']]){
      const start=surfacePoint(grid,axis==='u'?Math.max(0,u-.03):u,axis==='v'?Math.max(0,v-.03):v);
      const end=surfacePoint(grid,axis==='u'?Math.min(1,u+.03):u,axis==='v'?Math.min(1,v+.03):v);
      const delta=new THREE.Vector3(...end).sub(new THREE.Vector3(...start));arrow.visible=delta.lengthSq()>1e-12;label.visible=arrow.visible;arrow.position.set(...p);if(arrow.visible){arrow.setDirection(delta.normalize());label.position.copy(current.position).addScaledVector(delta,1.05);}
    }
    uniforms.sweepAxis.value=direction==='u'?0:1;uniforms.sweep.value=mode==='B'&&progressive?(direction==='u'?v:u):1;
    syncSlider(uInput,u);syncSlider(vInput,v);lightingText.textContent=explanations[shading];
    const reverse=tensorPoint(grid,u,v,direction==='u'?'v':'u'),error=Math.hypot(...p.map((x,i)=>x-reverse[i]));
    readout.textContent=`次数 (${grid.length-1},${grid[0].length-1}) · 控制网格 ${grid.length}×${grid[0].length} · ${resolution*resolution*2} 个三角形\nu = ${fmt(u)}，v = ${fmt(v)}；S(u,v) = ${vec(p)}\n${direction==='u'?'Qᵢ(v)':'Rⱼ(u)'}：${helper.map((p,i)=>`${i}: ${vec(p,2)}`).join('；')}\n交换构造次序误差：${error.toExponential(2)} · ${shading.toUpperCase()} · ${playing?'播放中':'已暂停'}\n${mode==='A'?'固定 '+(direction==='u'?'v，扫描 u':'u，扫描 v')+'：运动点沿当前曲线前进。':(direction==='u'?'v':'u')+' 从 0 → 1：当前曲线扫掠成面。'} 蓝色控制点通常不在曲面上。`;
    stage.dataset.shading=shading;stage.dataset.grid=`${grid.length}x${grid[0].length}`;stage.dataset.playing=String(playing);stage.dataset.sweep=String(uniforms.sweep.value);
  }
  gizmo.addEventListener('dragging-changed',event=>{view.controls.enabled=!event.value;if(event.value)pause();});
  gizmo.addEventListener('objectChange',()=>{if(!gizmo.object)return;const [i,j]=indices();grid[i][j]=gizmo.object.position.toArray();inputs.forEach((input,k)=>input.value=fmt(grid[i][j][k],4));updateGeometry();updateConstruction();});
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  view.renderer.domElement.addEventListener('pointerdown',event=>{if(event.button!==0||!showPoints||gizmo.axis)return;const rect=view.renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,view.camera);const hit=raycaster.intersectObjects(handles)[0];if(hit){selected=hit.object.userData.index;pause();attach();updateConstruction();}});
  animate(dt=>{if(!playing||gizmo.dragging)return;const key=mode==='A'?direction:(direction==='u'?'v':'u');const next=Math.min(1,(key==='u'?u:v)+dt*speed/10);if(key==='u')u=next;else v=next;if(next===1)pause();updateConstruction();});
  info.innerHTML='<div class="formula">Bᵢᵐ(u) = C(m,i) uⁱ(1−u)ᵐ⁻ⁱ<br>S(u,v) = Σᵢ₌₀ᵐ Σⱼ₌₀ⁿ Bᵢᵐ(u) Bⱼⁿ(v) Pᵢⱼ<br>固定 v：Qᵢ(v) = Σⱼ₌₀ⁿ Bⱼⁿ(v) Pᵢⱼ<br>S(u,v) = Σᵢ₌₀ᵐ Bᵢᵐ(u) Qᵢ(v)<br>固定 u：Rⱼ(u) = Σᵢ₌₀ᵐ Bᵢᵐ(u) Pᵢⱼ<br>S(u,v) = Σⱼ₌₀ⁿ Bⱼⁿ(v) Rⱼ(u)</div><p>Bézier 曲面是两组 Bernstein 基函数的张量积。固定一个参数后，得到另一方向的 Bézier 曲线；它的控制点是原网格沿固定参数方向经过一维 Bézier 插值得到的辅助点。有限双重求和可以交换次序，因此先 U 后 V 与先 V 后 U 得到同一个点与同一张曲面。</p><p>控制点一般不在曲面上。四个角点满足 S(0,0)=P₀₀、S(1,0)=Pₘ₀、S(0,1)=P₀ₙ、S(1,1)=Pₘₙ；四条边界分别是由边界控制点确定的 Bézier 曲线。参数在 [0,1] 内时权重非负且总和为 1，因此曲面包含在全部控制点的凸包内。</p><div class="formula">I = kₐIₐ + k_dI_l max(N·L,0)<br>　+ k_sI_l max(R·V,0)ʰ</div><p>三种模式共享相同的几何、方向光、环境光 0.18、漫反射系数 0.72、材质颜色及镜面参数。Flat 用面中心位置与面法线求值，面内颜色恒定；Gouraud 在顶点求光照再插值颜色；Phong 插值解析顶点法线与位置，在片元阶段归一化法线后计算同一个完整反射模型。退化切面处采用向上法线作为显示后备，不改变曲面点计算。</p>';
  instructions.innerHTML='<p>先暂停动画，再切换四种次数，观察控制网格尺寸。点击顶点并拖动 XYZ 控制柄，或在控制台选择 Pᵢⱼ 后输入坐标；曲面、控制网格、等参数线和辅助点同步更新。白点为选中顶点，粉点为当前曲面点。</p><p>拖动 u/v 会暂停动画。青色 U 曲线固定 v，紫色 V 曲线固定 u；橙色辅助点和控制多边形对应当前构造方向。切换构造方向，对照下方两种求值次序的误差。</p><p>模式 A 固定一个参数，让点沿曲线运动；模式 B 改变固定参数，让整条曲线扫掠成面。重置动画回到扫描起点，播放到终点会自动暂停，便于观察完整曲面。关闭渐进显示可始终查看完整曲面。重置控制网格只恢复顶点，不重置 u/v 或观察视角。</p><p>对比光照时关闭渐进显示、控制点和辅助图层，将网格分辨率降到 4–8，提高光泽度，再依次切换 Flat、Gouraud、Phong。背景拖动旋转、滚轮缩放、右键平移；手机用双指缩放和平移，展开控制台即可编辑参数。</p>';
  resetGrid();updateLight();
}
