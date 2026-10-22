from playwright.sync_api import sync_playwright
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from functools import partial
import json,hashlib,time,os,math
from pathlib import Path
root=Path(__file__).resolve().parents[2]
os.chdir(root)
Path("work").mkdir(exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def translate_path(self,path):
  if path.startswith('/CADCAM2026/'):
   path='/'+path[len('/CADCAM2026/') :]
  return super().translate_path(path)
 def log_message(self,*args):pass
 def do_GET(self):
  if self.path=='/favicon.ico':self.send_response(204);self.end_headers();return
  super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(root/'CADCAM2026_Show')));Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/CADCAM2026/'
results={};errors=[]
def ok(name,condition):
 assert condition,name
 results[name]='PASS';print(name,'PASS',flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 context=browser.new_context(viewport={'width':1280,'height':900},device_scale_factor=1)
 context.add_init_script("""window.gpuAllocations={};for(const key of ['createBuffer','createTexture','createProgram']){const fn=WebGL2RenderingContext.prototype[key];WebGL2RenderingContext.prototype[key]=function(...args){window.gpuAllocations[key]=(window.gpuAllocations[key]||0)+1;return fn.apply(this,args)}}""")
 page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 probe=context.new_page()
 try:
  probe.goto((root/'CADCAM2026_Show/courses/11.bezier-surface.html').as_uri(),timeout=15000)
  probe.wait_for_function('document.body.dataset.ready==="true"')
  results['file protocol']='PASS'
 except Exception as e:results['file protocol']=str(e).split('\n')[0]
 probe.close()
 page.goto(base);page.wait_for_function('document.querySelectorAll(".card").length===11');ok('11 homepage cards',page.locator('.card').count()==11)
 page.locator('a[href="courses/11.bezier-surface.html"]').click();page.wait_for_function('document.body.dataset.ready==="true"');page.get_by_role('button',name='暂停',exact=True).click()
 ok('WebGL2',page.locator('#stage canvas').evaluate('(c)=>!!c.getContext("webgl2")'))
 def control(name):return page.get_by_label(name,exact=True)
 def slide(name,value):control(name).evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}))}',str(value))
 def value(name):return float(control(name).input_value())
 # Drag the selected Y axis using a projected world-space position.
 control('选中控制点').select_option('5');canvas=page.locator('#stage canvas');canvas.scroll_into_view_if_needed();page.wait_for_timeout(200)
 point=[value('选中点坐标 X'),value('选中点坐标 Y'),value('选中点坐标 Z')]
 eye=[8,7,9]
 def dot(a,b):return sum(x*y for x,y in zip(a,b))
 def unit(a):
  norm=math.sqrt(dot(a,a));return [x/norm for x in a]
 def cross(a,b):return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
 back=unit(eye);right=unit(cross([0,1,0],back));up=cross(back,right);rect=canvas.bounding_box()
 scale=math.dist(point,eye)*1.9*math.tan(math.radians(43)/2)*.65/4
 def project(p):
  q=[x-y for x,y in zip(p,eye)];z=dot(back,q);f=1/math.tan(math.radians(43)/2)
  return [rect['x']+rect['width']/2*(1+f*dot(right,q)/(-z)/(rect['width']/rect['height'])),rect['y']+rect['height']/2*(1-f*dot(up,q)/(-z))]
 start=project([point[0],point[1]+scale*.52,point[2]]);end=project([point[0],point[1]+scale*.52+.7,point[2]])
 oldReadout=page.locator('#readout').inner_text();page.mouse.move(*start);page.wait_for_timeout(100);page.mouse.down();page.mouse.move(*end,steps=12);page.mouse.up()
 ok('Y gizmo drag updates coordinate and construction',abs(value('选中点坐标 Y')-point[1])>.1 and oldReadout!=page.locator('#readout').inner_text())
 page.get_by_role('button',name='播放',exact=True).click();page.wait_for_timeout(300);allocations=page.evaluate('gpuAllocations');page.wait_for_timeout(500);ok('animation reuses GPU resources',allocations==page.evaluate('gpuAllocations'));page.get_by_role('button',name='暂停',exact=True).click()
 for key,size,count in [('quadratic','3x3',9),('cubic','4x4',16),('quartic','5x5',25),('mixed','3x4',12)]:
  control('曲面次数与控制网格').select_option(key)
  ok('grid '+key,page.locator('#stage').get_attribute('data-grid')==size and control('选中控制点').locator('option').count()==count)
 slide('u 参数',.5);slide('v 参数',.5)
 before=page.locator('#readout').inner_text();control('选中控制点').select_option('6');control('选中点坐标 Y').fill('4');control('选中点坐标 Y').dispatch_event('input');after=page.locator('#readout').inner_text();ok('numeric edit updates surface and auxiliary',before!=after)
 control('构造方向').select_option('v');ok('reverse construction R', 'Rⱼ(u)' in page.locator('#readout').inner_text())
 slide('u 参数',.2);slide('v 参数',.7);ok('linked sliders and pause','u = 0.200，v = 0.700' in page.locator('#readout').inner_text() and page.locator('#stage').get_attribute('data-playing')=='false')
 control('动画模式').select_option('A');page.get_by_role('button',name='重置动画',exact=True).click();ok('A reset v',value('v 参数')==0 and abs(value('u 参数')-.2)<1e-6)
 page.get_by_role('button',name='播放',exact=True).click();page.wait_for_timeout(500);page.get_by_role('button',name='暂停',exact=True).click();ok('A reverse animation scans v only',value('v 参数')>0 and abs(value('u 参数')-.2)<1e-6)
 paused=value('v 参数');page.wait_for_timeout(300);ok('pause freezes parameters',value('v 参数')==paused)
 control('动画模式').select_option('B');page.get_by_role('button',name='重置动画',exact=True).click();ok('B reverse reset u',value('u 参数')==0 and float(page.locator('#stage').get_attribute('data-sweep'))==0)
 page.get_by_role('button',name='播放',exact=True).click();page.wait_for_timeout(500);page.get_by_role('button',name='暂停',exact=True).click();ok('B reverse sweeps u',value('u 参数')>0)
 control('构造方向').select_option('u');page.get_by_role('button',name='重置动画',exact=True).click();ok('B forward reset v',value('v 参数')==0)
 control('渐进显示已扫掠曲面区域').uncheck();ok('full surface toggle',float(page.locator('#stage').get_attribute('data-sweep'))==1)
 for label in ['显示控制网格','显示控制顶点','显示辅助控制点与控制多边形','显示 U/V 构造曲线','显示 U/V 参数方向','显示 XYZ 坐标系']:control(label).uncheck()
 slide('曲面网格分辨率',4);slide('光泽度',100);slide('u 参数',.5);slide('v 参数',.5)
 images={}
 for mode in ['flat','gouraud','phong']:
  control('光照模式').select_option(mode);page.wait_for_timeout(250);images[mode]=hashlib.sha256(page.locator('#stage canvas').screenshot(path=f'work/11-{mode}.png')).hexdigest()
 ok('three shaders render different pixels',len(set(images.values()))==3)
 control('显示曲面线框').check();page.wait_for_timeout(150)
 slide('光源方位角（度）',-30);slide('光源仰角（度）',35);slide('镜面反射强度',1.3)
 # Resource-free execution while disconnected, after initial HTML load. This is not a file:// test.
 context.set_offline(True);slide('u 参数',.8);slide('v 参数',.9);ok('offline interaction after load','u = 0.800，v = 0.900' in page.locator('#readout').inner_text());context.set_offline(False)
 # Orbit interaction must visibly change canvas.
 canvas=page.locator('#stage canvas');canvas.scroll_into_view_if_needed();old=hashlib.sha256(canvas.screenshot()).hexdigest();box=canvas.bounding_box();page.mouse.move(box['x']+box['width']*.8,box['y']+box['height']*.7);page.mouse.down();page.mouse.move(box['x']+box['width']*.65,box['y']+box['height']*.65,steps=10);page.mouse.up();page.wait_for_timeout(250);ok('orbit rotation',old!=hashlib.sha256(canvas.screenshot()).hexdigest())
 page.screenshot(path='work/11-acceptance-desktop.png',full_page=True)
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(300);ok('mobile no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'));ok('mobile collapsible controls',not page.locator('#control-disclosure').evaluate('(e)=>e.open'));page.locator('.console-summary').click();ok('mobile opens controls',page.locator('#control-disclosure').evaluate('(e)=>e.open'));page.screenshot(path='work/11-mobile.png',full_page=True)
 ok('no JS or shader errors',not errors)
 results['shader hashes']=images;results['errors']=errors;results['renderer']='Chromium WebGL2 / SwiftShader';
 browser.close()
server.shutdown();open('work/acceptance.json','w').write(json.dumps(results,ensure_ascii=False,indent=2))
