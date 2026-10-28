"""Optional browser acceptance for the 11 A/B/C integration."""
from playwright.sync_api import sync_playwright
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from pathlib import Path
from functools import partial
import json,re,hashlib
root=Path(__file__).resolve().parents[2];out=root/'work/bezier-integration';out.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def translate_path(self,path):return super().translate_path(path.replace('/CADCAM2026/','/',1))
 def log_message(self,*args):pass
 def do_GET(self):
  if self.path=='/favicon.ico':self.send_response(204);self.end_headers();return
  super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(root/'CADCAM2026_Show')));Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/CADCAM2026/';results={};errors=[]
def ok(name,value):
 assert value,name
 results[name]='PASS';print(name,'PASS',flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader'])
 context=browser.new_context(viewport={'width':1440,'height':1000},device_scale_factor=1)
 page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 def goto(path):page.goto(base+path);page.wait_for_function('document.body.dataset.ready==="true"')
 def slide(id,value):page.locator('#'+id).evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}))}',str(value));page.wait_for_timeout(100)
 def snap(id):return hashlib.sha256(page.locator('#'+id).screenshot()).hexdigest()
 goto('index.html');ok('14 experiment cards',page.locator('.card').count()==14)
 ok('12 assignments and 14 experiments',page.locator('.stat b').all_text_contents()[:2]==['12','14'])
 ok('A B C grouped in order',page.locator('.assignment-series .card-no').all_text_contents()==['作业 11 · 实验 A','作业 11 · 实验 B','作业 11 · 实验 C'])
 page.screenshot(path=str(out/'homepage-desktop.png'),full_page=True)
 page.locator('#search').fill('弦长');ok('search supplemental experiment',page.locator('.card').count()==1 and '曲线插值' in page.locator('.card').inner_text())
 page.locator('#search').fill('');page.locator('#filters button').filter(has_text='变换与观察').click();ok('category filter original lessons',page.locator('.card').count()==3)
 page.locator('#filters button').filter(has_text='全部').click()
 paths=['11.bezier-surface','11.bezier-interpolation','11.bezier-tensor-product_surface']
 for index,path in enumerate(paths):
  page.locator(f'a[href="courses/{path}.html"]').click();page.wait_for_function('document.body.dataset.ready==="true"');ok('homepage opens '+path,path in page.url);goto('index.html')
 goto('courses/'+paths[1]+'.html')
 for degree in [3,5,8]:
  slide('degree',degree)
  for detail in ['uniform','chord']:
   page.locator('#detail').select_option(detail);text=page.locator('#stats').inner_text();residual=float(re.search(r'残差：([^\s]+)',text)[1]);ok(f'interpolation residual degree {degree} {detail}',residual<1e-7)
 slide('degree',5);before=snap('view');page.locator('#zPlus').click();ok('interpolation vertex edits redraw',before!=snap('view'))
 page.locator('#display').select_option('uniform');before=snap('view');page.locator('#display').select_option('chord');ok('parameterization visuals differ',before!=snap('view'))
 page.locator('#play').click();old=page.locator('#t').input_value();page.wait_for_timeout(200);ok('interpolation playback',old!=page.locator('#t').input_value());page.locator('#play').click();page.locator('#resetT').click();ok('interpolation reset',page.locator('#t').input_value()=='0')
 page.screenshot(path=str(out/'interpolation-desktop.png'),full_page=True)
 ok('B links A and C',page.locator('.sitecourse-footer a').evaluate_all('(es)=>es.map(e=>e.getAttribute("href"))')==[paths[0]+'.html',paths[2]+'.html'])
 goto('courses/'+paths[2]+'.html');page.locator('#play').click();slide('u',.4);slide('v',.6);coords=page.locator('#coords').inner_text().split('S(u,v)')[-1]
 page.locator('[data-mode="v"]').click();ok('tensor construction orders same point',coords==page.locator('#coords').inner_text().split('S(u,v)')[-1])
 page.locator('[data-mode="compare"]').click();ok('dual view opens',page.locator('#paneB').is_visible())
 hashes=[]
 for style in ['flat','smooth','specular']:
  page.locator('#lighting').select_option(style);hashes.append(snap('canvasA'))
 ok('three lighting strategies visually distinct',len(set(hashes))==3)
 before=page.locator('#coords').inner_text();slide('u',.7);ok('tensor parameter updates point',before!=page.locator('#coords').inner_text())
 page.locator('#showNet').check();page.locator('#coordZ').fill('2');page.locator('#coordZ').dispatch_event('input');ok('tensor coordinate edit retained',page.locator('#coordZ').input_value()=='2')
 page.locator('#resetVertices').click();ok('tensor reset shape',page.locator('#coordZ').input_value()!='2')
 old=page.locator('#phase').inner_text();page.locator('#step').click();ok('tensor construction step',old!=page.locator('#phase').inner_text())
 page.locator('#reset').click();ok('tensor reset parameters',page.locator('#u').input_value()=='0.4' and page.locator('#v').input_value()=='0.6')
 page.screenshot(path=str(out/'tensor-desktop.png'),full_page=True)
 ok('C links B and 12',page.locator('.sitecourse-footer a').evaluate_all('(es)=>es.map(e=>e.getAttribute("href"))')==[paths[1]+'.html','12.bspline.html'])
 for path,slider,value in [(paths[1],'t',700),(paths[2],'u',.2)]:
  goto('courses/'+path+'.html');
  if path==paths[2]:page.locator('#play').click()
  context.set_offline(True);slide(slider,value);ok('offline after load '+path,float(page.locator('#'+slider).input_value())==value);context.set_offline(False)
 for path in ['index']+['courses/'+x for x in paths[1:]]:
  page.set_viewport_size({'width':390,'height':844});goto(path+'.html');page.wait_for_timeout(150)
  ok('mobile no overflow '+path,page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
  page.screenshot(path=str(out/(path.split('/')[-1]+'-mobile.png')),full_page=True)
 for path in paths[1:]:
  try:
   page.goto((root/'CADCAM2026_Show/courses'/ (path+'.html')).as_uri(),timeout=10000);page.wait_for_function('document.body.dataset.ready==="true"',timeout=5000);results['file '+path]='PASS'
  except Exception as e:results['file '+path]=str(e).split('\n')[0]
 ok('no page errors',not errors);results['errors']=errors;browser.close()
server.shutdown();(out/'acceptance.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
