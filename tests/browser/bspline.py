"""Optional UI acceptance: python3 tests/browser/bspline.py (Playwright + Chromium).
No browser/runtime dependency is added to the production project.
"""
from playwright.sync_api import sync_playwright
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from pathlib import Path
import os,json,math,hashlib
root=Path(__file__).resolve().parents[2]
os.chdir(root)
out=root/'work/12-bspline'
out.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def translate_path(self,path):
  if path.startswith('/CADCAM2026/'):path='/'+path[len('/CADCAM2026/'):]
  return super().translate_path(path)
 def log_message(self,*args):pass
 def do_GET(self):
  if self.path=='/favicon.ico':self.send_response(204);self.end_headers();return
  super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(root/'CADCAM2026_Show')))
Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/CADCAM2026/'
results={};errors=[]
def ok(name,condition):
 assert condition,name
 results[name]='PASS';print(name,'PASS',flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader'])
 context=browser.new_context(viewport={'width':1440,'height':1000},device_scale_factor=1)
 context.add_init_script("""window.gpuAllocations={};for(const key of ['createBuffer','createTexture','createProgram']){const f=WebGL2RenderingContext.prototype[key];WebGL2RenderingContext.prototype[key]=function(...a){gpuAllocations[key]=(gpuAllocations[key]||0)+1;return f.apply(this,a)}}""")
 probe=context.new_page()
 try:
  probe.goto((root/'CADCAM2026_Show/courses/12.bspline.html').as_uri(),timeout=15000)
  probe.wait_for_function('document.body.dataset.ready==="true"')
  results['file protocol']='PASS: direct HTML navigation'
 except Exception as e:results['file protocol']=str(e).split('\n')[0]
 probe.close()
 page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(base);page.wait_for_function('document.querySelectorAll(".card").length===12');ok('homepage 12 cards',page.locator('.card').count()==12)
 page.locator('a[href="courses/12.bspline.html"]').click();page.wait_for_function('document.body.dataset.ready==="true"');page.get_by_role('button',name='暂停',exact=True).click()
 stage=page.locator('#stage')
 def control(name):return page.get_by_label(name,exact=True)
 def mode(value):control('展示内容').select_option(str(value))
 def slide(name,value):control(name).evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}))}',str(value))
 def number(name,value):control(name).fill(str(value));control(name).dispatch_event('input')
 def segments():return stage.get_attribute('data-segments')
 ok('WebGL2',page.locator('#stage canvas').evaluate('(c)=>!!c.getContext("webgl2")'))
 for k in [1,2,3,4,5]:
  control('曲线次数 k').select_option(str(k));ok('degree '+str(k),segments()==str(7-k))
 control('曲线次数 k').select_option('3');page.get_by_role('button',name='增加控制顶点',exact=True).click();ok('append one segment',segments()=='5' and stage.get_attribute('data-count')=='8')
 page.get_by_role('button',name='删除选中顶点',exact=True).click();ok('delete one segment',segments()=='4')
 slide('第 1 段局部 u',.2);slide('第 2 段局部 u',.7);ok('independent local sliders',abs(float(control('第 1 段局部 u').input_value())-.2)<1e-6 and abs(float(control('第 2 段局部 u').input_value())-.7)<1e-6)
 page.get_by_role('button',name='重置动画',exact=True).click();ok('reset local animation',all(float(control(f'第 {i} 段局部 u').input_value())==0 for i in range(1,5)))
 page.get_by_role('button',name='单步',exact=True).click();ok('single-step local marker',abs(float(control('第 1 段局部 u').input_value())-.025)<1e-6)
 # Direct planar control-vertex drag, projected using the known initial teaching camera.
 page.get_by_role('button',name='重置控制顶点',exact=True).click();control('选中控制顶点').select_option('1');canvas=page.locator('#stage canvas');canvas.scroll_into_view_if_needed();box=canvas.bounding_box()
 point=[float(control('控制顶点坐标 '+axis).input_value()) for axis in 'XYZ'];scale=box['height']/(2*13*math.tan(math.radians(43)/2));x=box['x']+box['width']/2+point[0]*scale;y=box['y']+box['height']/2-point[1]*scale
 page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+25,y-20,steps=8);page.mouse.up();ok('planar pointer drag',abs(float(control('控制顶点坐标 X').input_value())-point[0])>.1)
 before=page.locator('#readout').inner_text();number('控制顶点坐标 Y',2.5);ok('coordinate input updates curve',before!=page.locator('#readout').inner_text())
 mode(2);slide('全局参数 u',2.25);ok('global domain and segment mapping','第 3 段局部 u=0.250' in page.locator('#readout').inner_text())
 mode(3);control('显示基函数次数').select_option('0');control('选中基函数').select_option('2');ok('zero-degree basis and support',control('显示基函数次数').input_value()=='0' and '显示 0 次' in page.locator('#extras').inner_text())
 control('显示基函数次数').select_option('3');slide('全局参数 u',.65);page.screenshot(path=str(out/'basis.png'),full_page=True)
 mode(5);label='主曲线完整节点轴 u4';old=page.locator('#readout').inner_text();number(label,.7);ok('nonuniform node updates curve',control(label).input_value()=='0.7' and old!=page.locator('#readout').inner_text());ok('node preset reflects custom knots',control('主曲线节点预设').input_value()=='custom')
 old=page.locator('#readout').inner_text();number(label,-10);ok('invalid node rejected',control(label).get_attribute('aria-invalid')=='true' and old==page.locator('#readout').inner_text())
 number(label,.8);ok('valid node recovers',control(label).get_attribute('aria-invalid') is None)
 # Continuous axis dragging of u4 must preserve handlers across redraws.
 axis=page.get_by_label('主曲线完整节点轴',exact=True);axis.scroll_into_view_if_needed();control('拖动节点编号').select_option('4');rect=axis.bounding_box();x=rect['x']+28+(.8+3)/10*(rect['width']-50);y=rect['y']+50
 page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+14,y,steps=6);page.mouse.up();ok('node-axis drag',abs(float(control(label).input_value())-.8)>.02)
 mode(4);ok('heart 4/4/2 spans',segments()=='4,4,2');ok('heart fixed degree 3',control('曲线次数 k').input_value()=='3' and control('曲线次数 k').is_disabled())
 right=page.locator('.bs-heart-panel').nth(2);input4=right.get_by_label('端点 4 重 · 内部 3 重节点轴 u4',exact=True);input4.fill('.8');input4.dispatch_event('input');ok('heart knot edit changes segment count',segments()=='4,4,3')
 before=page.locator('#readout').inner_text();control('选中控制顶点').select_option('1');number('控制顶点坐标 X',-2.3);ok('heart shared control edit',before!=page.locator('#readout').inner_text())
 for index,name in [(0,'均匀 · 不插值端点'),(1,'端点 4 重 · 内部均匀')]:
  panel=page.locator('.bs-heart-panel').nth(index);node=panel.get_by_label(name+'节点轴 u4',exact=True);beforeImage=hashlib.sha256(page.locator('#stage canvas').screenshot()).hexdigest();node.fill('.6');node.dispatch_event('input');page.wait_for_timeout(100);ok('heart column '+str(index)+' independent knot edit',node.get_attribute('aria-invalid') is None and beforeImage!=hashlib.sha256(page.locator('#stage canvas').screenshot()).hexdigest())
 page.get_by_role('button',name='恢复心形对照预设',exact=True).click();page.screenshot(path=str(out/'heart-desktop.png'),full_page=True)
 right.get_by_role('button',name='在展示 5 构造此曲线',exact=True).click();slide('全局参数 u',1.5);ok('heart de Casteljau comparison',page.locator('.bs-triangles').get_attribute('class').find('bs-comparing')>=0 and page.locator('.bs-triangles>div').nth(1).is_visible())
 # Move the repeated final endpoint, preserving multiplicity only when the final edit completes.
 for i in [10,9,8,7]:number('主曲线完整节点轴 u'+str(i),2.5)
 slide('全局参数 u',1.8);ok('Bezier comparison uses edited span interval','最大误差' in page.locator('.bs-extra').filter(has=page.locator('.bs-triangles')).inner_text() and 'NaN' not in page.locator('#readout').inner_text())
 page.get_by_role('button',name='单段 Bézier 特例',exact=True).click();ok('single Bezier one span',segments()=='1' and stage.get_attribute('data-count')=='4');ok('node preset reflects clamped knots',control('主曲线节点预设').input_value()=='clamped')
 control('动画方式').select_option('steps');page.get_by_role('button',name='重置动画',exact=True).click();page.get_by_role('button',name='单步',exact=True).click();ok('de Boor single step',stage.get_attribute('data-reveal')=='1')
 page.get_by_role('button',name='播放',exact=True).click();page.wait_for_function('Number(document.querySelector("#stage").dataset.reveal)>=2');page.get_by_role('button',name='暂停',exact=True).click();ok('construction animation',int(stage.get_attribute('data-reveal'))>=2)
 control('动画方式').select_option('scan');slide('全局参数 u',.3);page.get_by_role('button',name='播放',exact=True).click();page.wait_for_timeout(300);allocations=page.evaluate('gpuAllocations');old=float(control('全局参数 u').input_value());page.wait_for_timeout(500);ok('scan moves parameter',float(control('全局参数 u').input_value())>old);ok('animation reuses GPU resources',allocations==page.evaluate('gpuAllocations'));page.get_by_role('button',name='暂停',exact=True).click()
 old=control('全局参数 u').input_value();page.wait_for_timeout(200);ok('pause freezes parameter',old==control('全局参数 u').input_value())
 for name in ['显示控制顶点','显示控制多边形','显示递推点与连线','显示 XYZ 坐标系']:control(name).uncheck()
 page.get_by_role('button',name='播放',exact=True).click();page.wait_for_timeout(250);page.get_by_role('button',name='暂停',exact=True).click();ok('visibility persists through animation',all(not control(name).is_checked() for name in ['显示控制顶点','显示控制多边形','显示递推点与连线','显示 XYZ 坐标系']))
 for name in ['显示控制顶点','显示控制多边形','显示递推点与连线']:control(name).check()
 context.set_offline(True);slide('全局参数 u',.7);number('控制顶点坐标 Y',1.5);ok('offline interaction after load','u=0.700' in page.locator('#readout').inner_text());context.set_offline(False)
 page.screenshot(path=str(out/'boor-desktop.png'),full_page=True)
 # WebGL2 gizmo in spatial editing mode.
 control('编辑维度').select_option('space');ok('space editing available',control('编辑维度').input_value()=='space');page.get_by_role('button',name='空间波形预设',exact=True).click();number('控制顶点坐标 Z',1.2);ok('spatial coordinate edit','1.200' in page.locator('#readout').inner_text())
 control('选中控制顶点').select_option('1');canvas=page.locator('#stage canvas');canvas.scroll_into_view_if_needed();page.wait_for_timeout(150);rect=canvas.bounding_box()
 point=[float(control('控制顶点坐标 '+axis).input_value()) for axis in 'XYZ'];eye=[7,5,10]
 def dot(a,b):return sum(x*y for x,y in zip(a,b))
 def unit(a):
  norm=math.sqrt(dot(a,a));return [x/norm for x in a]
 def cross(a,b):return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
 back=unit(eye);rightAxis=unit(cross([0,1,0],back));up=cross(back,rightAxis)
 gizmoScale=math.dist(point,eye)*1.9*math.tan(math.radians(43)/2)*.7/4
 def project(p):
  q=[x-y for x,y in zip(p,eye)];z=dot(back,q);f=1/math.tan(math.radians(43)/2)
  return [rect['x']+rect['width']/2*(1+f*dot(rightAxis,q)/(-z)/(rect['width']/rect['height'])),rect['y']+rect['height']/2*(1-f*dot(up,q)/(-z))]
 start=project([point[0],point[1]+gizmoScale*.52,point[2]]);end=project([point[0],point[1]+gizmoScale*.52+.6,point[2]])
 page.mouse.move(*start);page.wait_for_timeout(100);page.mouse.down();page.mouse.move(*end,steps=10);page.mouse.up();ok('spatial Y gizmo drag',abs(float(control('控制顶点坐标 Y').input_value())-point[1])>.1)
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(150);ok('mobile controls collapsed',not page.locator('#control-disclosure').evaluate('(e)=>e.open'));page.locator('.console-summary').click();mode(4);page.wait_for_timeout(150);ok('mobile heart vertical layout',stage.evaluate('(e)=>e.clientHeight')==900);ok('mobile no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'));page.screenshot(path=str(out/'heart-mobile.png'),full_page=True)
 ok('no JS or WebGL errors',not errors)
 results['errors']=errors;results['renderer']='Chromium WebGL2 / SwiftShader';browser.close()
server.shutdown();(out/'acceptance.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
