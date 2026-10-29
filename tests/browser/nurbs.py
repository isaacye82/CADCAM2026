"""Browser acceptance for assignment 13. Existing local preview must serve port 4173."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json, math, io
from PIL import Image
root=Path(__file__).resolve().parents[2];out=root/'work/nurbs';out.mkdir(parents=True,exist_ok=True)
results={};errors=[]
def ok(name,value):
 assert value,name
 results[name]='PASS';print(name,'PASS',flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader'])
 context=browser.new_context(viewport={'width':1440,'height':1000},device_scale_factor=1,accept_downloads=True)
 page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:4173/courses/13.nurbs.html');page.wait_for_function('document.body.dataset.ready==="true"')
 def control(name):return page.get_by_label(name,exact=True)
 def state():return page.evaluate('nurbsLab.getState()')
 def num(name,value):control(name).fill(str(value));control(name).dispatch_event('change')
 def slide(name,value):control(name).evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));}',str(value))
 def tab(name):page.locator('[data-tab="'+name+'"]').click()
 ok('14 built-in mathematical checks',page.evaluate('nurbsVerification.length===14&&nurbsVerification.every(r=>r.pass)'))
 # Real screen-coordinate dragging in the planar editor.
 initial=state()['general']['curve']['P'][0]
 label=page.locator('#labels span').filter(has_text='P0').first.bounding_box()
 page.mouse.move(label['x']-7,label['y']+16);page.mouse.down();page.mouse.move(label['x']+24,label['y']-6,steps=6);page.mouse.up()
 ok('2D control point mouse drag',math.dist(initial,state()['general']['curve']['P'][0])>.1)
 page.get_by_role('button',name='↶ 撤销',exact=True).click();ok('undo geometric edit',state()['general']['curve']['P'][0]==initial)
 page.get_by_role('button',name='↷ 重做',exact=True).click();ok('redo geometric edit',math.dist(initial,state()['general']['curve']['P'][0])>.1)
 page.get_by_role('button',name='恢复当前展示默认值',exact=True).click()
 n=len(state()['general']['curve']['P']);page.get_by_role('button',name='在当前参数处插入节点',exact=True).click();ok('curve knot insertion',len(state()['general']['curve']['P'])==n+1)
 num('控制点权重 wᵢ',1.7);ok('numeric weight edit',state()['general']['curve']['W'][0]==1.7)
 page.get_by_role('button',name='切换 B 样条基',exact=True).click();page.wait_for_timeout(150);ok('basis mode switch',state()['basisMode']=='polynomial')
 control('几何类型').select_option('surface');ok('general NURBS surface',page.get_attribute('body','data-geometry')=='surface')
 num('Z',2.2);ok('surface control edit',state()['general']['patches'][0]['P'][0][0][2]==2.2)
 for axis in ['u','v']:
  control('插入方向').select_option(axis);page.get_by_role('button',name='在当前参数处插入节点',exact=True).click()
 s=state()['general']['patches'][0];ok('surface knot insertion both directions',len(s['P'])==6 and len(s['P'][0])==6)
 page.screenshot(path=str(out/'surface.png'),full_page=True)
 tab('conic')
 for kind in ['circle','ellipse','parabola','hyperbola']:
  control('圆锥曲线类型').select_option(kind)
  ok(kind+' exact residual',float(page.locator('#chart-summary').inner_text().split('最大值 ')[1].split(' ·')[0])<1e-11)
  control('误差类型').select_option('distance');ok(kind+' nearest point metric','最近点' in page.locator('#chart-summary').inner_text())
  control('误差类型').select_option('residual')
 control('圆锥曲线类型').select_option('circle');control('选中控制点').select_option('1,0');page.get_by_role('button',name='扰动所选权重 × 1.25',exact=True).click()
 ok('perturbed conic error increases',float(page.locator('#chart-summary').inner_text().split('最大值 ')[1].split(' ·')[0])>.001)
 page.get_by_role('button',name='恢复精确构造',exact=True).click()
 slide('半径 R',3.2);num('控制点权重 wᵢ',1.8);ok('local edit after global rebuild',state()['conic']['curve']['W'][0]==1.8)
 control('圆锥曲线类型').select_option('unified');page.get_by_role('button',name='设为 w = 1',exact=True).click();ok('unified conic weight',state()['conic']['curve']['W']==[1,1,1])
 tab('aero')
 control('选中控制点').select_option('3,2');page.locator('#stage').scroll_into_view_if_needed()
 before3d=state()['aero']['patches'][0]['P'][3][2]
 canvas=page.locator('#stage > canvas').first;im=Image.open(io.BytesIO(canvas.screenshot())).convert('RGB')
 pixels=[(x,y) for y in range(im.height) for x in range(im.width) if (lambda q:q[0]>155 and q[1]<90 and q[2]<90)(im.getpixel((x,y)))]
 box=canvas.bounding_box();handle=None
 for x,y in sorted(pixels,reverse=True)[::4]:
  page.mouse.move(box['x']+x,box['y']+y)
  if page.locator('#stage').get_attribute('data-drag-axis')=='X':handle=(x,y);break
 assert handle,'X handle not found'
 x,y=handle;page.mouse.down();page.mouse.move(box['x']+x+45,box['y']+y-15,steps=10);page.mouse.up()
 after3d=state()['aero']['patches'][0]['P'][3][2]
 ok('3D X handle drag and selection priority',abs(before3d[0]-after3d[0])>.01 and before3d[1:]==after3d[1:] and state()['selection']==[3,2])
 page.get_by_role('button',name='↶ 撤销',exact=True).click()
 for model in ['fuselage','nacelle','wing']:
  control('航空航天外形').select_option(model);ok(model+' real NURBS patches',len(state()['aero']['patches'])==(2 if model=='wing' else 1))
  page.screenshot(path=str(out/(model+'.png')),full_page=True)
 num('Z',.35);ok('aero local edit state',state()['aero']['dirty'] and '编辑前' in page.locator('#readout').inner_text())
 control('当前编辑曲面片').select_option('1');num('控制点权重 wᵢ',1.2);ok('wing lower patch editing',state()['aero']['patches'][1]['W'][0][0]==1.2)
 # Export/import and malformed inputs are exercised using the actual controls.
 with page.expect_download() as event:page.get_by_role('button',name='导出 JSON',exact=True).click()
 saved=out/'roundtrip.json';event.value.save_as(str(saved));before=state()
 page.get_by_role('button',name='恢复当前展示默认值',exact=True).click();page.locator('#file').set_input_files(str(saved));page.wait_for_timeout(500)
 ok('JSON export import roundtrip',state()==before)
 invalid=json.loads(saved.read_text());invalid['state']['general']['curve']['W'][0]=0
 page.locator('#file').set_input_files({'name':'invalid.json','mimeType':'application/json','buffer':json.dumps(invalid).encode()});page.wait_for_timeout(100)
 ok('invalid JSON rejected without state mutation',state()==before and '导入失败' in page.locator('#toast').inner_text())
 with page.expect_download() as event:page.get_by_role('button',name='保存 PNG',exact=True).click()
 event.value.save_as(str(out/'export.png'));ok('PNG export',(out/'export.png').stat().st_size>5000)
 # Offline interactions do not use any service or fetch.
 context.set_offline(True);num('Z',.7);ok('offline editing',state()['aero']['patches'][1]['P'][0][0][2]==.7);context.set_offline(False)
 for width,height in [(1366,768),(1920,1080),(360,800),(390,844),(430,932)]:
  page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(150)
  ok(f'no horizontal overflow {width}x{height}',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  if width<741:
   page.get_by_role('button',name='参数设置',exact=True).click();page.wait_for_timeout(350)
   panel=page.locator('#console').bounding_box();stage=page.locator('#stage').bounding_box()
   ok(f'mobile nonmodal panel {width}',panel['y']>=stage['y']+stage['height']-2)
   num('Z',.8);ok(f'mobile input editing {width}',state()['aero']['patches'][1]['P'][0][0][2]==.8)
   page.screenshot(path=str(out/f'mobile-{width}.png'),full_page=True)
   page.locator('#close-controls').click()
  else:page.screenshot(path=str(out/f'desktop-{width}.png'),full_page=True)
 # Reload self-contained bytes with every network request intercepted or rejected.
 isolated=browser.new_context(viewport={'width':1366,'height':768});requests=[]
 html=(root/'CADCAM2026_Show/courses/13.nurbs.html').read_text()
 def route(r):
  requests.append(r.request.url)
  if r.request.is_navigation_request():r.fulfill(status=200,content_type='text/html',body=html)
  else:r.abort()
 isolated.route('**/*',route);probe=isolated.new_page();probe.goto('http://offline-check.invalid/13.nurbs.html');probe.wait_for_function('document.body.dataset.ready==="true"')
 ok('self contained load with all resource requests blocked',len(requests)==1)
 ok('no browser JavaScript errors',not errors)
 results['file protocol']='BLOCKED_BY_ADMINISTRATOR (managed browser policy; manual verification required)'
 (out/'browser-results.json').write_text(json.dumps({'results':results,'errors':errors},ensure_ascii=False,indent=2));browser.close()
