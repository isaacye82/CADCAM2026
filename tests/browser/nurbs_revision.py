from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader']);pg=b.new_page(viewport={'width':1366,'height':900});errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto('http://127.0.0.1:4173/courses/13.nurbs.html');pg.wait_for_function('document.body.dataset.ready==="true"')
 def st():return pg.evaluate('nurbsLab.getState()')
 def slide(label,val):pg.get_by_label(label,exact=True).evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input"));e.dispatchEvent(new Event("change"));}',str(val))
 assert pg.locator('#console').bounding_box()['x']>pg.locator('.workspace').bounding_box()['x']
 assert pg.locator('.explain').bounding_box()['y']>pg.locator('.viewport-card').bounding_box()['y']
 before=st()['general']['curve'];slide('参数 u · 有效域归一化',.7);assert st()['general']['curve']==before
 slide('所选控制点权重 w',.3);assert st()['general']['curve']['W'][0]>1.9
 assert 'R=' in pg.locator('#basis-values').inner_text()
 slide('主曲线线宽 / px',7);assert st()['lineWidth']==7
 # Click blank canvas, then ensure weights disabled and point can be selected again.
 pg.locator('#stage').click(position={'x':20,'y':80});assert not st()['selected'];assert pg.get_by_label('控制点权重 wᵢ',exact=True).is_disabled()
 pg.get_by_label('选中控制点',exact=True).select_option('1,0');assert st()['selected']
 pg.get_by_label('几何类型',exact=True).select_option('surface');before=st()['general']['patches'];slide('曲面显示分辨率',22);assert st()['general']['patches']==before;assert '22' in pg.locator('#readout').inner_text()
 pg.locator('[data-tab=aero]').click()
 for model,label,val in [('fuselage','长度',12),('nacelle','入口半径',2),('wing','后掠角 / °',30)]:
  pg.get_by_label('外形构造',exact=True).select_option(model);slide(label,val);assert '→' in pg.locator('#mapping').inner_text();assert 'N' in pg.locator('#mapping').inner_text()
 pg.screenshot(path='work/nurbs/revision-desktop.png',full_page=True)
 pg.set_viewport_size({'width':390,'height':844});pg.get_by_role('button',name='参数设置',exact=True).click();assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth');pg.screenshot(path='work/nurbs/revision-mobile.png',full_page=True)
 assert not errors,errors
 print('Revision interaction checks passed')
 b.close()
