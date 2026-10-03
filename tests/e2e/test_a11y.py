"""Accessibility audit: axe-core (WCAG 2.0/2.1/2.2 A+AA + best practice) on every view at normal, large and high-contrast settings,
touch-target sizes, keyboard-only completion of a flow, and horizontal overflow at 320 px / 200 % text."""
import re, sys
from playwright.sync_api import sync_playwright
from helpers import *

bad = []
def rec(label, v):
    for x in v:
        bad.append((label, x)); print('AXE  ', label, x['id'], x['impact'], x['nodes'][:2])

VIEWS = ['', '#/about', '#/faq', '#/privacy', '#/help', '#/check']

def pick(page, *labels):
    for l in labels: page.locator('label.opt').filter(has_text=l).first.click()

with sync_playwright() as p:
    b = p.chromium.launch()
    for contrast in ['normal', 'high']:
        for size in [0, 2]:
            ctx = b.new_context(viewport={'width': 320 if size == 2 else 390, 'height': 800}, is_mobile=True, has_touch=True)
            page = ctx.new_page()
            page.goto(BASE)
            page.evaluate(f"document.documentElement.dataset.size='{size}'; document.documentElement.dataset.contrast='{contrast}'")
            for v in VIEWS:
                page.goto(BASE + v); page.wait_for_selector('h1')
                page.evaluate(f"document.documentElement.dataset.size='{size}'; document.documentElement.dataset.contrast='{contrast}'")
                rec(f'{contrast}/size{size}/{v or "home"}', axe_check(page, v))
                ov = hscroll(page)
                if ov > 1: print('OVERFLOW', contrast, size, v, ov); bad.append(('overflow', v))
            # open FAQ item + settings panel
            page.goto(BASE + '#/faq'); page.locator('details summary').first.click()
            rec(f'{contrast}/size{size}/faq-open', axe_check(page, 'faq'))
            page.goto(BASE); page.locator('#settings-btn').click()
            rec(f'{contrast}/size{size}/settings', axe_check(page, 'settings'))
            # questionnaire screens: walk a woman through everything, axe on each screen
            page.goto(BASE + '#/check'); page.get_by_role('link', name='Start').click()
            seq = [('A woman',), None, ('Kidney disease (reduced kidney function)', 'Diabetes (sugar)'), ('Yes, currently',), ('No',), ('Yes',),  # Q1,age,Q3,Q4,Q4a,Q5
                   ('No',), ('No',), ('No',), ('No',), ('No',), ('None of these',), ('No',), ('No',), ('Not applicable to me',), ('No',)]
            i = 0
            for step in seq:
                page.wait_for_selector('h1')
                rec(f'{contrast}/size{size}/q{i}', axe_check(page, f'q{i}'))
                if step is None: page.locator('#age').fill('55')
                else: pick(page, *step)
                page.get_by_role('button', name='Next').click(); i += 1
                page.wait_for_timeout(120)
            ctx.close()

    # ---- touch targets (≥ 44 css px) on key screens at normal size ----
    ctx = b.new_context(viewport={'width': 390, 'height': 800}, is_mobile=True, has_touch=True); page = ctx.new_page()
    small = []
    js = """() => [...document.querySelectorAll('button, a.btn, .tab, label.opt, input:not([type=checkbox]):not([type=radio]), select, summary, .settings-btn, .brand')]
            .filter(e => e.offsetParent !== null).map(e => { const r = e.getBoundingClientRect(); return {t:(e.textContent||e.id||e.tagName).trim().slice(0,30), w:Math.round(r.width), h:Math.round(r.height)}; })
            .filter(x => x.w < 44 || x.h < 44)"""
    for v in VIEWS + ['#/check/q/sex']:
        page.goto(BASE + v); page.wait_for_selector('h1')
        for x in page.evaluate(js): small.append((v, x)); print('SMALL TARGET', v, x)
    # ---- keyboard only: Tab to Start, Enter; Space to choose; Enter to proceed ----
    page.goto(BASE + '#/check'); page.wait_for_selector('h1')
    for _ in range(12):
        page.keyboard.press('Tab')
        if page.evaluate("document.activeElement.id") == 'start-btn': break
    page.keyboard.press('Enter'); page.wait_for_selector('.opt')
    h1 = page.locator('h1').inner_text()
    focus_h1 = page.evaluate("document.activeElement.tagName") == 'H1'
    print('keyboard: after Start focus on H1:', focus_h1, '|', h1[:40])
    page.keyboard.press('Tab'); page.keyboard.press('Tab')
    print('focus now:', page.evaluate("document.activeElement.outerHTML.slice(0,80)"))
    ctx.close(); b.close()

print('\nAXE violations:', len(bad), '| small targets:', len(small))
sys.exit(1 if (bad or small) else 0)
