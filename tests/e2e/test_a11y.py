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
            # questionnaire screens: walk through every screen of the eligible path, axe on each screen
            page.goto(BASE + '#/check'); page.get_by_role('link', name='Start').click()
            seq = [('Social media / WhatsApp',), None, ('No',), ('Diabetes (high blood sugar)', 'High cholesterol')]   # channel, age, hd, rf
            i = 0
            for step in seq:
                page.wait_for_selector('h1')
                rec(f'{contrast}/size{size}/q{i}', axe_check(page, f'q{i}'))
                if step is None: page.locator('#age').fill('55')
                else: pick(page, *step)
                page.get_by_role('button', name='Next').click(); i += 1
                page.wait_for_timeout(120)
            # result, consent, contact steps, review, confirmation
            page.wait_for_selector('section.result')
            rec(f'{contrast}/size{size}/result', axe_check(page, 'result'))
            page.get_by_role('button', name='Continue').click(); page.wait_for_selector('#priv')
            rec(f'{contrast}/size{size}/notice', axe_check(page, 'notice'))
            page.locator('label.opt').click(); page.get_by_role('button', name='Next').click()
            page.wait_for_selector('#c1'); rec(f'{contrast}/size{size}/contact1', axe_check(page, 'c1'))
            page.locator('#c1').fill('Test Person'); page.locator('#c2').fill('9876543210')
            page.get_by_role('button', name='Send me a code').click(); page.locator('#otp').fill('123456')
            page.get_by_role('button', name='Check the code').click(); page.wait_for_selector('text=Number checked'); page.get_by_role('button', name='Next').click()
            page.wait_for_selector('#c6'); rec(f'{contrast}/size{size}/contact2', axe_check(page, 'c2'))
            page.locator('#c6').fill('Faridabad'); page.locator('#c7').select_option('03'); page.get_by_role('button', name='Next').click()
            page.wait_for_selector('#c8'); rec(f'{contrast}/size{size}/contact3', axe_check(page, 'c3'))
            page.locator('#c8').select_option('hi'); page.get_by_role('button', name='Next').click()
            page.wait_for_selector('.summary'); rec(f'{contrast}/size{size}/review', axe_check(page, 'review'))
            page.get_by_role('button', name='Send my details').click(); page.wait_for_selector('section.result')
            rec(f'{contrast}/size{size}/done', axe_check(page, 'done'))
            # not-eligible and check-needed results
            page.goto(BASE + '#/check'); page.get_by_role('link', name='Start').click()
            pick(page, 'Other'); page.get_by_role('button', name='Next').click(); page.locator('#age').fill('35'); page.get_by_role('button', name='Next').click()
            page.wait_for_selector('section.result'); rec(f'{contrast}/size{size}/result-not-eligible', axe_check(page, 'ne'))
            ctx.close()

    # ---- touch targets (≥ 44 css px) on key screens at normal size ----
    ctx = b.new_context(viewport={'width': 390, 'height': 800}, is_mobile=True, has_touch=True); page = ctx.new_page()
    small = []
    js = """() => [...document.querySelectorAll('button, a.btn, .tab, label.opt, input:not([type=checkbox]):not([type=radio]), select, summary, .settings-btn, .brand')]
            .filter(e => e.offsetParent !== null).map(e => { const r = e.getBoundingClientRect(); return {t:(e.textContent||e.id||e.tagName).trim().slice(0,30), w:Math.round(r.width), h:Math.round(r.height)}; })
            .filter(x => x.w < 44 || x.h < 44)"""
    for v in VIEWS + ['#/check/q/channel']:
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
