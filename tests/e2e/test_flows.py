"""End-to-end flows on a phone-sized viewport: every outcome message, the contact flow, console errors, axe, overflow."""
import sys, json, re
from playwright.sync_api import sync_playwright, expect
from helpers import *

problems = []
def log(msg): print(msg, flush=True)
def check(cond, msg):
    if not cond: problems.append(msg); log('FAIL  ' + msg)
    else: log('ok    ' + msg)

def has_text(loc, text, msg, timeout=4000):
    try:
        expect(loc).to_contain_text(text, timeout=timeout); check(True, msg)
    except AssertionError:
        check(False, msg + f'  (got: {loc.inner_text()[:80]!r})')

def start(page):
    page.goto(BASE + '#/check'); page.get_by_role('link', name='Start').click()

def run_flow(page, name, steps, expect_h1, expect_review=None):
    """steps: list of (type, value) in screen order. type 'one'/'multi' -> labels to click; 'age' -> text."""
    start(page)
    for kind, val in steps:
        if kind == 'age': page.locator('#age').fill(str(val))
        else: pick(page, *([val] if isinstance(val, str) else val))
        nxt(page)
    page.wait_for_url(re.compile(r'#/check/result'))
    page.wait_for_selector('section.result')
    has_text(page.locator('h1'), expect_h1, f'{name}: headline contains "{expect_h1}"')
    return page

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, locale='en-IN')
    page = ctx.new_page()
    errors = []
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(str(e)))

    # ---------- static pages ----------
    for path, h1 in [('', 'Heart research study'), ('#/about', 'About the study'), ('#/faq', 'Questions and answers'),
                     ('#/privacy', 'Privacy notice'), ('#/help', 'Help and contact'), ('#/check', 'can I take part')]:
        page.goto(BASE + path)
        page.wait_for_selector('h1')
        check(h1 in page.locator('h1').first.inner_text(), f'page {path or "/"} renders "{h1}"')
        check(hscroll(page) <= 0, f'page {path or "/"} has no horizontal scroll at 390px')
        page.screenshot(path=f'{SHOTS}/page_{(path or "home").strip("#/").replace("/","_") or "home"}.png', full_page=True)

    # ---------- E1: potentially eligible ----------
    ok_tail = [('one','No'),('one','No'),('one','No'),('one','No'),  # Q7a-d
               ('multi','None of these'),('one','No'),('one','No'),('one','No')]  # Q8, Q9, Q10, Q12
    man_ok = [('one','A man'),('age',58),('multi','High blood pressure'),('one','I have never smoked'),('one','No'),('one','No')] + ok_tail
    run_flow(page, 'E1 man 58 HBP', man_ok, 'you may be able to take part')
    page.screenshot(path=f'{SHOTS}/result_E1.png', full_page=True)

    # ---------- E2 immediate age exit (no health questions) ----------
    start(page); pick(page,'A woman'); nxt(page); page.locator('#age').fill('47'); nxt(page)
    page.wait_for_url(re.compile('#/check/result')); page.wait_for_selector('section.result')
    has_text(page.locator('h1'), 'Thank you for your interest', 'E2: woman 47 sees age message straight after Q2')
    check('Women become eligible at 50' in page.locator('main').inner_text(), 'E2: women under 50 see the "eligible at 50" line')
    page.screenshot(path=f'{SHOTS}/result_E2.png', full_page=True)

    # ---------- E3 symptoms ----------
    s = [('one','A man'),('age',60),('multi','Diabetes (sugar)'),('one','I have never smoked'),('one','No'),('one','No'),
         ('one','Yes'),('one','No'),('one','No'),('one','No'),('multi','Heart attack'),('one','No'),('one','No'),('one','No')]
    run_flow(page, 'E3 symptoms (+known disease)', s, 'Please read this carefully')
    has_text(page.locator('main'), 'chest pain now', 'E3: emergency instruction present')
    check('{{' not in page.locator('main').inner_text(), 'E3: no unreplaced template tokens')
    page.screenshot(path=f'{SHOTS}/result_E3.png', full_page=True)

    # ---------- E4 variants ----------
    def e4_flow(name, tweaks, want, text):
        base = {'sex':'A man','age':60,'rf':'High blood pressure','smoke':'I have never smoked','smokeless':'No','fh':'No',
                'sym':['No','No','No','No'],'cvd':'None of these','prior':'No','contrast':'No','other':'No', 'ckd':None}
        base.update(tweaks)
        steps = [('one',base['sex']),('age',base['age']),('multi',base['rf']),('one',base['smoke']),('one',base['smokeless']),('one',base['fh'])]
        if base['ckd']: steps.append(('one',base['ckd']))
        steps += [('one',x) for x in base['sym']] + [('multi',base['cvd']),('one',base['prior']),('one',base['contrast']),('one',base['other'])]
        run_flow(page, name, steps, want)
        has_text(page.locator('main'), text, name + ': reason text shown')
    e4_flow('E4 prior test', {'prior':'Yes'}, 'Thank you for your interest', 'CT scan of the heart')
    e4_flow('E4 contrast allergy', {'contrast':'Yes'}, 'Thank you for your interest', 'serious reaction to such a dye')
    e4_flow('E4 severe kidney', {'rf':'Kidney disease (reduced kidney function)','ckd':'Yes'}, 'Thank you for your interest', 'severe kidney disease')
    e4_flow('E4 known disease', {'cvd':'Stroke or mini-stroke (TIA)'}, 'Thank you for your interest', 'heart disease, a stroke')
    e4_flow('E4 no risk factor', {'rf':'None of these'}, 'Thank you for your interest', 'you do not have any of them')
    page.screenshot(path=f'{SHOTS}/result_E4.png', full_page=True)

    # ---------- E5 review (kidney Q6 not sure) ----------
    s = [('one','A man'),('age',62),('multi','Kidney disease (reduced kidney function)'),('one','I have never smoked'),('one','No'),('one','No'),
         ('one','Not sure'),  # Q6
         ('one','No'),('one','No'),('one','No'),('one','No'),('multi','None of these'),('one','No'),('one','No'),('one','No')]
    run_flow(page, 'E5 kidney not sure', s, 'We need a little more information')
    page.screenshot(path=f'{SHOTS}/result_E5.png', full_page=True)

    # ---------- full path: E1 woman -> A1 -> A2 -> notice -> contact -> review -> done ----------
    s = [('one','A woman'),('age',55),('multi','High blood pressure'),('one','I have never smoked'),('one','No'),('one','No'),
         ('one','No'),('one','No'),('one','No'),('one','No'),('multi','None of these'),('one','No'),('one','No'),
         ('one','Not applicable to me'),('one','No')]
    run_flow(page, 'E1 woman 55', s, 'you may be able to take part')
    page.get_by_role('button', name='Continue').click()
    page.wait_for_url(re.compile('#/check/ack'))
    # cannot proceed without ticking
    nxt(page); has_text(page.locator('#ack-error'), 'Please tick', 'A1: error shown when not ticked')
    page.locator('label.opt').click(); nxt(page)
    page.wait_for_url(re.compile('contact-ask'))
    pick(page, 'Yes, please contact me'); nxt(page)
    page.wait_for_url(re.compile('/check/notice'))
    nxt(page); has_text(page.locator('#priv-error'), 'Please tick', 'A3: error when privacy box not ticked')
    page.locator('details summary').click()
    check('data fiduciary' in page.locator('details').inner_text(), 'A3: full notice expands inline')
    page.locator('label.opt').click(); nxt(page)
    page.screenshot(path=f'{SHOTS}/contact1.png', full_page=True)
    # step 1: name + mobile + otp
    page.locator('#c1').fill('Test Person'); page.locator('#c2').fill('9876543210')
    nxt(page); has_text(page.locator('#c2-err'), 'check your number', 'C2: must verify code before continuing')
    page.get_by_role('button', name='Send me a code').click()
    page.locator('#otp').fill('000000'); page.get_by_role('button', name='Check the code').click()
    has_text(page.locator('#otp-err'), 'does not match', 'OTP: wrong code rejected')
    page.locator('#otp').fill('123456'); page.get_by_role('button', name='Check the code').click()
    has_text(page.locator('main'), 'Number checked', 'OTP: demo code accepted')
    nxt(page)
    # step 2
    nxt(page); has_text(page.locator('#c3-err'), 'Please choose', 'C3: required')
    pick(page, 'SMS only'); page.locator('#c5').fill('bad'); nxt(page)
    has_text(page.locator('#c5-err'), 'e-mail', 'C5: bad email rejected')
    page.locator('#c5').fill(''); nxt(page)
    # step 3
    page.locator('#c6').fill('12345'); nxt(page); has_text(page.locator('#c6-err'), '6-digit', 'C6: 5-digit PIN rejected')
    page.locator('#c6').fill('121001'); page.locator('#c7').select_option('03'); nxt(page)
    # step 4
    page.locator('#c8').select_option('hi'); pick(page, 'Morning (9–12)', 'Weekends'); nxt(page)
    # step 5
    pick(page, 'Leaflet'); pick(page, 'Yes'); page.locator('#c11s').select_option(index=2); nxt(page)
    page.wait_for_url(re.compile('/check/review'))
    page.screenshot(path=f'{SHOTS}/review.png', full_page=True)
    txt = page.locator('main').inner_text()
    check('Test Person' in txt and '9876543210' in txt and '121001' in txt, 'Review screen lists entered details')
    page.get_by_role('button', name='Send my details').click()
    page.wait_for_url(re.compile('/check/done')); page.wait_for_selector('section.result')
    has_text(page.locator('h1'), 'Thank you, Test Person', 'E7: confirmation uses name')
    check(re.search(r'HR-\d{6}', page.locator('h1').inner_text()) is not None, 'E7: reference number format HR-nnnnnn')
    page.screenshot(path=f'{SHOTS}/done.png', full_page=True)

    # ---------- reload mid-flow returns to start (no persistence) ----------
    page.goto(BASE + '#/check/q/fh'); page.reload(); page.wait_for_selector('h1')
    has_text(page.locator('h1'), 'can I take part', 'Deep link without answers returns to intro (nothing persisted)')

    check(not errors, 'no console errors: ' + '; '.join(errors)[:300])
    b.close()

print('\nPROBLEMS:', len(problems)); [print(' -', x) for x in problems]
sys.exit(1 if problems else 0)
