import sys
from playwright.sync_api import sync_playwright
from helpers import *
with sync_playwright() as p:
    b=p.chromium.launch(); 
    for size,name in [(0,'s0'),(2,'s2')]:
        ctx=b.new_context(viewport={'width':360,'height':780},device_scale_factor=2,is_mobile=True,has_touch=True)
        pg=ctx.new_page()
        pg.goto(BASE); pg.evaluate(f"document.documentElement.dataset.size='{size}'")
        pg.screenshot(path=f'{SHOTS}/home_{name}.png')
        pg.goto(BASE+'#/check/q/sex'); 
        pg.goto(BASE+'#/check'); pg.get_by_role('link',name='Start').click(); pg.locator('label.opt').nth(1).click()
        pg.screenshot(path=f'{SHOTS}/q1_{name}.png')
        ctx.close()
    ctx=b.new_context(viewport={'width':360,'height':780},device_scale_factor=2,is_mobile=True)
    pg=ctx.new_page(); pg.goto(BASE); pg.evaluate("document.documentElement.dataset.contrast='high'"); pg.screenshot(path=f'{SHOTS}/home_hc.png')
    pg.goto(BASE+'#/check'); pg.get_by_role('link',name='Start').click(); pg.locator('label.opt').nth(0).click(); pg.screenshot(path=f'{SHOTS}/q1_hc.png')
    b.close()
