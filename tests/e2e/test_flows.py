"""End-to-end flows on a phone-sized viewport (v0.2.0): the three outcomes, the not-eligible reasons, consent + contact flow,
console errors, horizontal overflow. Serve the site first (python3 -m http.server 8080) and set BASE if the port differs."""
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

CH = 'Poster/flyer at a hospital or clinic'
RF = {1: 'I smoke now', 2: 'High blood pressure', 3: 'High cholesterol', 4: 'Diabetes (high', 5: 'Kidney disease that a doctor', 6: 'Rheumatoid arthritis or lupus', 7: 'A parent, brother, sister or child', 8: 'None of these', 9: 'Not sure'}

def run_flow(page, name, age, hd=None, rf=None, channel=CH):
    """Answer channel, age, then (if the questionnaire continues) hd and rf. Returns when the result screen is shown."""
    start(page)
    pick(page, channel); nxt(page)
    page.locator('#age').fill(str(age)); nxt(page)
    if hd is not None:
        page.wait_for_selector('label.opt'); pick(page, hd); nxt(page)
    if rf is not None:
        page.wait_for_selector('label.opt-check'); pick(page, *[RF[c] for c in rf]); nxt(page)
    page.wait_for_url(re.compile(r'#/check/result')); page.wait_for_selector('section.result')

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
        page.goto(BASE + path); page.wait_for_selector('h1')
        check(h1 in page.locator('h1').first.inner_text(), f'page {path or "/"} renders "{h1}"')
        check(hscroll(page) <= 0, f'page {path or "/"} has no horizontal scroll at 390px')
        page.screenshot(path=f'{SHOTS}/page_{(path or "home").strip("#/").replace("/","_") or "home"}.png', full_page=True)
    page.goto(BASE); txt = page.locator('main').inner_text()
    check('Aged 40 or over' in txt and 'no upper age limit' in txt, 'home page: aged 40 or over, no upper limit')
    check('70' not in txt, 'home page: no 70 anywhere')
    page.goto(BASE + '#/about'); txt = page.locator('main').inner_text()
    for must in ['CT coronary angiography scan (CTCA)', 'QRISK3', 'stage 3', 'a man before 55, a woman before 65', '10 mL', '36 to 48 months', 'at least 3 years and up to 4 years', 'does not pay for them', 'A study doctor makes the final decision']:
        check(must in txt, f'about page contains "{must}"')
    for bad in ['primary prevention', 'calcium', '4½', '30–54', 'Nit' + 'ya', 'Wad' + 'hwa', 'men aged 40']:
        check(bad.lower() not in txt.lower(), f'about page does not contain "{bad}"')
    page.goto(BASE + '#/check'); check('chest pain now' in page.locator('main').inner_text(), 'intro: emergency line present')

    # ---------- the questionnaire has exactly 4 questions on the eligible path, in the fact-sheet order ----------
    start(page)
    heads = []
    for ans in [lambda: pick(page, CH), lambda: page.locator('#age').fill('62'), lambda: pick(page, 'No'), lambda: pick(page, RF[2])]:
        page.wait_for_selector('h1.qtext'); heads.append(page.locator('h1.qtext').inner_text()); ans(); nxt(page)
    check(['How did you hear' in heads[0], 'How old are you' in heads[1], 'Has a doctor ever told you' in heads[2], 'Do any of these apply' in heads[3]] == [True] * 4,
          'questions shown: channel, age, known heart disease, risk-factor checklist (4 screens)')
    check(all(('of 4' in h) for h in heads), 'progress says "of 4" on each screen')

    # ---------- outcome 1: potentially eligible ----------
    run_flow(page, 'eligible', 58, 'No', [2])
    has_text(page.locator('h1'), 'You may be able to take part.', 'outcome 1: headline')
    check('A study team member will call you to explain the study. A study doctor will make the final decision.' in page.locator('main').inner_text(), 'outcome 1: fact-sheet message')
    page.screenshot(path=f'{SHOTS}/result_eligible.png', full_page=True)

    # ---------- outcome 1 at age 85 (no upper limit) ----------
    run_flow(page, 'eligible 85', 85, 'No', [4, 7])
    has_text(page.locator('h1'), 'You may be able to take part.', 'outcome 1: age 85 is accepted (no upper limit)')
    run_flow(page, 'eligible 110', 110, 'No', [1])
    has_text(page.locator('h1'), 'You may be able to take part.', 'outcome 1: age 110 is accepted')

    # ---------- outcome 3: check needed ----------
    run_flow(page, 'check hd', 62, 'Not sure', [3])
    has_text(page.locator('h1'), 'A study team member will call to check a few details.', 'outcome 3: Not sure about heart disease')
    page.screenshot(path=f'{SHOTS}/result_check.png', full_page=True)
    run_flow(page, 'check rf', 62, 'No', [9])
    has_text(page.locator('h1'), 'A study team member will call to check a few details.', 'outcome 3: risk factor "Not sure"')

    # ---------- outcome 2: not eligible, three reasons; no contact details collected ----------
    start(page); pick(page, 'Other'); nxt(page); page.locator('#age').fill('39'); nxt(page)
    page.wait_for_url(re.compile('#/check/result')); page.wait_for_selector('section.result')
    mt = page.locator('main').inner_text()
    check('aged 40 or over' in mt and 'cannot take part' in mt, 'outcome 2 (age 39): age message, stops straight after the age question')
    check('doctor' in mt and 'Continue' not in mt, 'outcome 2 (age): doctor reminder, no Continue button')
    page.screenshot(path=f'{SHOTS}/result_not_eligible_age.png', full_page=True)

    start(page); pick(page, CH); nxt(page); page.locator('#age').fill('50'); nxt(page); pick(page, 'Yes'); nxt(page)
    page.wait_for_url(re.compile('#/check/result')); page.wait_for_selector('section.result')
    mt = page.locator('main').inner_text()
    check('not been told that they have heart disease' in mt and 'doctor' in mt, 'outcome 2 (Yes to heart disease): stops straight after Q3, polite message')
    check(page.locator('#priv').count() == 0 and 'Continue' not in mt, 'outcome 2 (known disease): no consent / contact route')
    page.screenshot(path=f'{SHOTS}/result_not_eligible_hd.png', full_page=True)

    run_flow(page, 'no rf', 50, 'No', [8])
    mt = page.locator('main').inner_text()
    check('you do not have any of them' in mt and 'doctor' in mt, 'outcome 2 (None of these): no-risk-factor message')

    # ---------- direct URL to the contact steps without eligibility is bounced ----------
    page.goto(BASE + '#/check/notice'); has_text(page.locator('h1'), 'can I take part', 'consent screen cannot be reached without an eligible result')
    page.goto(BASE + '#/check/contact/1'); has_text(page.locator('h1'), 'can I take part', 'contact screen cannot be reached without an eligible result')

    # ---------- option 8 exclusivity in the browser ----------
    start(page); pick(page, CH); nxt(page); page.locator('#age').fill('50'); nxt(page); pick(page, 'No'); nxt(page)
    page.wait_for_selector('label.opt-check')
    pick(page, RF[1], RF[2], RF[9])
    check(page.locator('input[type=checkbox]:checked').count() == 3, 'checklist: 1, 2 and 9 can be ticked together')
    pick(page, RF[8])
    check(page.locator('input[type=checkbox]:checked').count() == 1 and page.locator('label.opt-check', has_text='None of these').locator('input').is_checked(), 'checklist: ticking "None of these" clears the rest')
    has_text(page.locator('#q-note'), 'cleared', 'checklist: the clearing is announced to screen readers')
    pick(page, RF[4])
    check(page.locator('input[type=checkbox]:checked').count() == 1 and page.locator('label.opt-check', has_text='Diabetes').locator('input').is_checked(), 'checklist: ticking another option clears "None of these"')
    # nothing ticked -> error, no result
    pick(page, RF[4]); nxt(page)
    has_text(page.locator('#q-error'), 'Please tick at least one', 'checklist: empty answer is refused')

    # ---------- age validation ----------
    start(page); pick(page, CH); nxt(page)
    for bad in ['', 'abc', '17', '111', '45.5']:
        page.locator('#age').fill(bad); nxt(page)
        has_text(page.locator('#q-error'), 'between 18 and 110', f'age "{bad}" is refused')

    # ---------- full path: outcome 1 -> consent -> contact -> review -> done ----------
    run_flow(page, 'full', 55, 'No', [2])
    page.get_by_role('button', name='Continue').click()
    page.wait_for_url(re.compile('#/check/notice')); page.wait_for_selector('#priv')
    mt = page.locator('main').inner_text()
    check('This is not a medical check-up and does not tell you your heart risk.' in mt, 'consent: disclaimer shown')
    nxt(page); has_text(page.locator('#priv-error'), 'Please tick', 'consent: error when box not ticked')
    page.locator('details summary').click()
    check('data fiduciary' in page.locator('details').inner_text(), 'consent: full privacy notice expands inline')
    page.screenshot(path=f'{SHOTS}/notice.png', full_page=True)
    page.locator('label.opt').click(); nxt(page)
    page.wait_for_selector('#c1')
    page.locator('#c1').fill('Test Person'); page.locator('#c2').fill('9876543210')
    nxt(page); has_text(page.locator('#c2-err'), 'check your number', 'contact: must verify code before continuing')
    page.get_by_role('button', name='Send me a code').click()
    page.locator('#otp').fill('000000'); page.get_by_role('button', name='Check the code').click()
    has_text(page.locator('#otp-err'), 'does not match', 'OTP: wrong code rejected')
    page.locator('#otp').fill('123456'); page.get_by_role('button', name='Check the code').click()
    has_text(page.locator('main'), 'Number checked', 'OTP: demo code accepted')
    nxt(page)
    page.wait_for_selector('#c6')
    nxt(page); has_text(page.locator('#c6-err'), 'city or town', 'contact: city required')
    page.locator('#c6').fill('Faridabad'); page.locator('#c7').select_option('03'); nxt(page)
    page.wait_for_selector('#c8')
    nxt(page); has_text(page.locator('#c8-err'), 'Please choose', 'contact: language required')
    page.locator('#c8').select_option('hi')   # calltime and appointment are optional: leave both empty first
    check(page.locator('#c9').count() == 1 and page.locator('#c11').count() == 1, 'contact: optional call time and appointment request present')
    page.locator('#c9').select_option('2'); page.locator('label.opt-check').click(); nxt(page)
    page.wait_for_url(re.compile('/check/review'))
    page.screenshot(path=f'{SHOTS}/review.png', full_page=True)
    txt = page.locator('main').inner_text()
    check('Test Person' in txt and '9876543210' in txt and 'Faridabad' in txt and 'Afternoon' in txt and 'I would like to book one' in txt, 'review screen lists entered details')
    check('E-mail' not in txt and 'Other number' not in txt, 'review: no e-mail / alternate number fields any more')
    page.get_by_role('button', name='Send my details').click()
    page.wait_for_url(re.compile('/check/done')); page.wait_for_selector('section.result')
    has_text(page.locator('h1'), 'Thank you, Test Person', 'confirmation uses the name')
    check(re.search(r'HR-\d{6}', page.locator('h1').inner_text()) is not None, 'confirmation: demo reference HR-nnnnnn')
    check('within 2 working days' in page.locator('main').inner_text(), 'confirmation: call within 2 working days')
    page.screenshot(path=f'{SHOTS}/done.png', full_page=True)

    # ---------- reviewer mode shows REDCap names and the record that would be sent ----------
    page.evaluate("localStorage.clear()")
    page.goto(BASE); page.locator('#settings-btn').click()
    page.locator('#rv-label').locator('xpath=following-sibling::button').click()
    run_flow(page, 'review mode', 52, 'No', [2, 6])
    rt = page.locator('aside.review').inner_text()
    check('ps_outcome = 1' in rt and 'ps_age_ok' in rt and '"ps_rf":[2,6]' in rt.replace(' ', ''), 'reviewer mode: ps_outcome / ps_age_ok / ps_rf shown')
    page.get_by_role('button', name='Continue').click(); page.locator('label.opt').click(); nxt(page)
    page.locator('#c1').fill('Rev Test'); page.locator('#c2').fill('9876543211'); page.get_by_role('button', name='Send me a code').click()
    page.locator('#otp').fill('123456'); page.get_by_role('button', name='Check the code').click(); has_text(page.locator('main'), 'Number checked', 'reviewer flow: number checked'); nxt(page)
    page.locator('#c6').fill('Delhi'); page.locator('#c7').select_option('01'); nxt(page)
    page.locator('#c8').select_option('en'); nxt(page); page.get_by_role('button', name='Send my details').click()
    page.wait_for_selector('aside.review pre')
    payload = json.loads(page.locator('aside.review pre').inner_text())
    check(set(payload) >= {'ps_channel','ps_age','ps_age_ok','ps_hd','ps_rf','ps_outcome','ps_name','ps_mobile','ps_city','ps_site','ps_lang','ps_calltime','ps_appt_request'} and all(k.startswith('ps_') for k in payload), 'payload uses ps_* REDCap names only')
    check(payload['ps_outcome'] == 1 and payload['ps_rf'] == [2, 6] and payload['ps_appt_request'] == 0 and payload['ps_site'] == '01', 'payload values and codes correct')

    # ---------- reload mid-flow returns to start (no persistence) ----------
    page.goto(BASE + '#/check/q/hd'); page.reload(); page.wait_for_selector('h1')
    has_text(page.locator('h1'), 'can I take part', 'deep link without answers returns to intro (nothing persisted)')

    # ---------- banners, large text and high contrast still work ----------
    page.goto(BASE)
    check(page.locator('#draftbar').is_visible() and 'Draft for review' in page.locator('#draftbar').inner_text() and 'Demonstration' in page.locator('#draftbar').inner_text(), 'DRAFT and DEMO banners visible')
    page.locator('#settings-btn').click()
    page.get_by_role('button', name='Extra large').click()
    check(page.evaluate("document.documentElement.dataset.size") == '2', 'settings: extra large text')
    page.locator('#hc-label').locator('xpath=following-sibling::button').click()
    check(page.evaluate("document.documentElement.dataset.contrast") == 'high', 'settings: high contrast')
    page.evaluate("localStorage.clear()")

    check(not errors, 'no console errors: ' + '; '.join(errors)[:300])
    b.close()

print('\nPROBLEMS:', len(problems)); [print(' -', x) for x in problems]
sys.exit(1 if problems else 0)
