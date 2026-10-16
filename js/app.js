import { CONFIG, UI_LANGUAGES } from './config.js';
import {
  QUESTIONS, INTRO, ACK, CONTACT, MESSAGES, UI, FOOTER,
} from './content.js';
import { FAQ } from './data-faq.js';
import { PRIVACY } from './data-privacy.js';
import { STUDY } from './data-study.js';
import {
  classify, visibleSteps, ageValid, toggleRf, firstUnanswered, OUTCOME, REASON, REVIEW_REASON,
} from './logic.js';
import { submitEOI, sendOtp, verifyOtp } from './api.js';
import { prefs, loadPrefs, setPref, speak, stopSpeech, speechSupported } from './a11y.js';

/* ================================================================== tiny DOM helpers */
function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k.nodeType ? k : document.createTextNode(String(k)));
  }
}
const SVG_TAGS = new Set(['svg', 'path', 'circle', 'rect', 'ellipse', 'g']);
function h(tag, attrs, ...kids) {
  const el = SVG_TAGS.has(tag) ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  append(el, kids);
  return el;
}
/** Replace {{TOKENS}} from config/extra; bracketed placeholders are shown with a dashed outline. */
function tpl(str, extra = {}) {
  const vals = { ...CONFIG, ...extra };
  const out = [];
  const re = /\{\{(\w+)\}\}/g;
  let last = 0; let m;
  while ((m = re.exec(str))) {
    if (m.index > last) out.push(str.slice(last, m.index));
    const v = String(vals[m[1]] ?? '');
    out.push(v.startsWith('[') ? h('span', { class: 'ph' }, v) : v);
    last = re.lastIndex;
  }
  if (last < str.length) out.push(str.slice(last));
  return out;
}
const plain = (str, extra = {}) => str.replace(/\{\{(\w+)\}\}/g, (_, k) => String({ ...CONFIG, ...extra }[k] ?? ''));
const isPhone = (s) => /^[\d\s+()-]{6,}$/.test(s);
const phoneNode = (num) => (isPhone(num) ? h('a', { href: 'tel:' + num.replace(/[^\d+]/g, '') }, num) : tpl('{{N}}', { N: num }));
const $ = (sel, root = document) => root.querySelector(sel);

/* ================================================================== state */
function freshState() {
  return {
    answers: {}, consent: false, contact: {}, result: null, ref: null, payload: null,
    campaign: (new URLSearchParams(location.search).get('c') || '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 40),
    started: false, submitting: false,
  };
}
let S = freshState();

/* ================================================================== layout shell */
const main = () => $('#main');

function buildShell() {
  $('#skip').textContent = UI.skip;
  $('#draftbar-text').textContent = UI.draftbar + (CONFIG.DEMO ? ' ' + UI.demobar : '');
  $('#draftbar').hidden = !CONFIG.DRAFT;
  $('#brand-name').textContent = UI.brand;
  $('#brand-tag').textContent = UI.tagline;
  $('#settings-btn-text').textContent = UI.settings;
  buildSettings();
  buildNav();
  const f = $('#footer-text');
  f.textContent = '';
  append(f, tpl(FOOTER));
}

function buildNav() {
  const nav = $('#tabs');
  nav.textContent = '';
  const items = [
    ['/', UI.nav.home, 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z'],
    ['/check', UI.nav.check, 'M9 12l2 2 4-4M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z'],
    ['/about', UI.nav.about, 'M12 8h.01M11 12h1v5h1M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z'],
    ['/faq', UI.nav.faq, 'M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'FAQ'],
    ['/help', UI.nav.help, 'M5 13v-1a7 7 0 0 1 14 0v1M5 13h2v5H5zM17 13h2v5h-2zM19 18c0 2-2 3-5 3'],
  ];
  for (const [path, label, d, short] of items) {
    nav.append(h('a', { href: '#' + path, 'data-path': path, class: 'tab' },
      h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, h('path', { d })),
      h('span', null, h('span', { class: 'full' }, label), short ? h('span', { class: 'short' }, short) : null)));
  }
}

function buildSettings() {
  const box = $('#settings');
  box.textContent = '';
  const sizeBtns = UI.size_names.map((name, i) => h('button', {
    type: 'button', class: 'seg', 'data-size': i, 'aria-pressed': String(prefs.size === i),
    onclick: () => { setPref('size', i); buildSettings(); },
  }, h('span', { class: 'size-demo s' + i, 'aria-hidden': 'true' }, 'A'), h('span', null, name)));
  box.append(
    h('h2', { id: 'settings-h' }, UI.settings_title),
    h('div', { class: 'set-row', role: 'group', 'aria-label': UI.text_size },
      h('span', { class: 'set-label' }, UI.text_size), h('div', { class: 'segs' }, sizeBtns)),
    h('div', { class: 'set-row' },
      h('span', { class: 'set-label', id: 'hc-label' }, UI.contrast),
      h('button', {
        type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(prefs.contrast), 'aria-labelledby': 'hc-label',
        onclick: () => { setPref('contrast', !prefs.contrast); buildSettings(); },
      }, h('span', { class: 'switch-state' }, prefs.contrast ? UI.contrast_on : UI.contrast_off))),
    speechSupported ? h('div', { class: 'set-row' },
      h('span', { class: 'set-label', id: 'sp-label' }, UI.speak_toggle),
      h('button', {
        type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(prefs.speak), 'aria-labelledby': 'sp-label',
        onclick: () => { setPref('speak', !prefs.speak); stopSpeech(); buildSettings(); },
      }, h('span', { class: 'switch-state' }, prefs.speak ? UI.contrast_on : UI.contrast_off))) : null,
    h('div', { class: 'set-row' },
      h('label', { class: 'set-label', for: 'ui-lang' }, UI.language),
      h('select', { id: 'ui-lang' }, UI_LANGUAGES.map((l) => h('option', { value: l.code, disabled: !l.live, selected: l.live && l.code === 'en' },
        l.label + (l.live ? '' : ' — ' + UI.lang_pending))))),
    CONFIG.DEMO ? h('div', { class: 'set-row' },
      h('span', { class: 'set-label', id: 'rv-label' }, UI.reviewer),
      h('button', {
        type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(prefs.review), 'aria-labelledby': 'rv-label',
        onclick: () => { setPref('review', !prefs.review); buildSettings(); route(); },
      }, h('span', { class: 'switch-state' }, prefs.review ? UI.contrast_on : UI.contrast_off))) : null,
    h('button', { type: 'button', class: 'btn btn-secondary', id: 'settings-close', onclick: closeSettings }, UI.close),
  );
}

function openSettings() {
  $('#settings').hidden = false;
  $('#settings-btn').setAttribute('aria-expanded', 'true');
  $('#settings-h').setAttribute('tabindex', '-1');
  $('#settings-h').focus();
}
function closeSettings() {
  $('#settings').hidden = true;
  $('#settings-btn').setAttribute('aria-expanded', 'false');
  $('#settings-btn').focus();
}

/* ================================================================== router */
const routes = {};
function on(path, fn) { routes[path] = fn; }

let lastPath = null;
let lastTerminal = false;
function route() {
  stopSpeech();
  const hash = location.hash.replace(/^#/, '') || '/';
  const [path] = hash.split('?');
  // Privacy: nothing a person entered survives leaving the screening area or finishing it (shared devices, Back button).
  if (lastPath !== null && path !== lastPath) {
    if ((lastPath.startsWith('/check') && !path.startsWith('/check')) || lastTerminal) S = freshState();
  }
  let fn = routes[path];
  let arg;
  if (!fn) {
    const m = path.match(/^(\/check\/(?:q|contact))\/(\w+)$/);
    if (m) { fn = routes[m[1]]; arg = m[2]; }
  }
  const view = fn ? fn(arg) : notFound();
  if (view === false) return; // the route function redirected
  lastPath = path;
  lastTerminal = !!view.terminal;
  const root = main();
  root.textContent = '';
  root.append(view.el);
  document.title = view.title + ' — ' + UI.brand;
  highlightNav(path);
  $('#tabs').hidden = path.startsWith('/check/');
  document.body.dataset.flow = path.startsWith('/check/') ? 'check' : 'site';
  window.scrollTo(0, 0);
  const hd = $('h1', root);
  if (hd) { hd.setAttribute('tabindex', '-1'); hd.focus({ preventScroll: true }); }
}
function go(path) { location.hash = '#' + path; }
function highlightNav(path) {
  document.querySelectorAll('#tabs .tab').forEach((a) => {
    const p = a.dataset.path;
    const active = p === '/' ? path === '/' : path.startsWith(p);
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}
function notFound() {
  return { title: UI.notfound, el: h('section', { class: 'page' }, h('h1', null, UI.notfound), h('a', { class: 'btn', href: '#/' }, UI.go_home)) };
}

/* ================================================================== shared components */
function btn(label, opts = {}) {
  const tag = opts.href ? 'a' : 'button';
  return h(tag, {
    class: 'btn ' + (opts.kind === 'secondary' ? 'btn-secondary' : opts.kind === 'quiet' ? 'btn-quiet' : 'btn-primary') + (opts.big ? ' btn-big' : ''),
    href: opts.href, type: opts.href ? null : 'button', id: opts.id, onclick: opts.onclick, disabled: opts.disabled,
  }, label);
}

function illustration() {
  const ppl = [
    { x: 44, h: 62, body: '#2F5D8A', skin: '#8D5A3B', hair: '#2b2b2b' },
    { x: 100, h: 74, body: '#C77B1E', skin: '#C48A62', hair: '#d9d9d9' },
    { x: 160, h: 66, body: '#0B5560', skin: '#A96B45', hair: '#3a2a22' },
    { x: 220, h: 78, body: '#5B7F6B', skin: '#6F4630', hair: '#d9d9d9' },
    { x: 276, h: 60, body: '#8A4B5C', skin: '#C48A62', hair: '#2b2b2b' },
  ];
  const svg = h('svg', { viewBox: '0 0 320 150', class: 'illo', 'aria-hidden': 'true', focusable: 'false' });
  svg.innerHTML = '<ellipse cx="160" cy="146" rx="150" ry="8" fill="#0B5560" opacity=".12"/>' +
    ppl.map((p) => {
      const top = 140 - p.h;
      return `<rect x="${p.x - 17}" y="${top + 24}" width="34" height="${p.h - 24}" rx="14" fill="${p.body}"/>` +
        `<circle cx="${p.x}" cy="${top + 12}" r="13" fill="${p.skin}"/>` +
        `<path d="M${p.x - 13} ${top + 10}a13 13 0 0 1 26 0c-6-4-18-4-26 0z" fill="${p.hair}"/>`;
    }).join('');
  return svg;
}

function listenButton(getText) {
  if (!speechSupported) return null;
  let on = false;
  const b = h('button', { type: 'button', class: 'btn btn-quiet listen', 'aria-pressed': 'false' },
    h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, h('path', { d: 'M4 10v4h4l5 4V6L8 10zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11' })),
    h('span', null, UI.listen));
  b.addEventListener('click', async () => {
    if (on) { stopSpeech(); on = false; b.lastChild.textContent = UI.listen; b.setAttribute('aria-pressed', 'false'); return; }
    on = true; b.lastChild.textContent = UI.stop_listening; b.setAttribute('aria-pressed', 'true');
    await speak(getText());
    on = false; b.lastChild.textContent = UI.listen; b.setAttribute('aria-pressed', 'false');
  });
  const wrap = h('div', { class: 'listen-wrap' }, b);
  return wrap;
}

function para(str, extra) { return h('p', null, tpl(str, extra)); }
const leaveLink = () => h('p', { class: 'leave' }, h('a', { href: '#/' }, UI.leave));
/** Text for the Listen button: headings, paragraphs and list items of a screen, without button labels. */
function readable(root) { return [...root.querySelectorAll('h1, h2, p, li')].filter((e) => !e.closest('.review, .listen-wrap, .leave')).map((e) => e.innerText.trim()).join(' '); }

/* ================================================================== static pages */
on('/', () => {
  const el = h('section', { class: 'page home' },
    h('div', { class: 'hero' },
      illustration(),
      h('h1', null, UI.home_title),
      h('p', { class: 'lead' }, UI.home_lead),
      btn(UI.home_cta, { href: '#/check', big: true }),
      h('p', { class: 'note' }, UI.home_cta_note),
      btn(UI.read_first, { href: '#/about', kind: 'secondary' })),
    h('div', { class: 'card' },
      h('h2', null, UI.home_who),
      h('ul', { class: 'ticks' }, UI.home_who_list.map((t) => h('li', null, t)))),
    h('div', { class: 'card' },
      h('h2', null, UI.home_how),
      h('ol', { class: 'steps' }, UI.home_how_list.map(([t, d]) => h('li', null, h('strong', null, t), h('span', null, d))))),
    h('p', { class: 'callout' }, UI.home_research),
    h('div', { class: 'card contact' },
      h('h2', null, UI.contact_title),
      h('dl', null,
        h('dt', null, UI.call_label), h('dd', null, phoneNode(CONFIG.HELPLINE), ' ', h('span', { class: 'sub' }, tpl('({{HELPLINE_HOURS}})'))),
        h('dt', null, UI.desk_label), h('dd', null, tpl('{{DESK}}'))),
      shareButton()),
  );
  return { title: UI.home_title, el };
});

function shareButton() {
  const status = h('span', { class: 'sub', role: 'status' });
  const b = h('button', { type: 'button', class: 'btn btn-secondary', onclick: async () => {
    const data = { title: UI.brand, text: UI.share_text, url: location.origin + location.pathname };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(data.url); status.textContent = UI.copied; }
    } catch { /* cancelled */ }
  } }, UI.share);
  return h('div', { class: 'share' }, b, status);
}

on('/about', () => {
  const d = STUDY.desc;
  const stepsItems = STUDY.steps.map((s) => {
    const m = s.match(/^(\d+)\. ([^.]+)\. (.*)$/);
    return m ? h('li', null, h('strong', null, m[2]), h('span', null, m[3])) : h('li', null, s);
  });
  const who = STUDY.who;
  const splitAt = who.findIndex((x) => /^You cannot take part/.test(x));
  const can = who.slice(1, splitAt).map((x) => x.replace(/^•\s*/, ''));
  const cannot = who.slice(splitAt + 1, who.length - 1).map((x) => x.replace(/^•\s*/, ''));
  const piText = STUDY.back.find((x) => x.startsWith('Who is doing this study?')).replace(/^Who is doing this study\?\s*/, '');
  const el = h('section', { class: 'page prose' },
    h('h1', null, UI.about_title),
    h('p', { class: 'lead' }, d['One sentence']),
    h('div', { class: 'card' }, h('h2', null, UI.about_why), STUDY.why.map((p) => h('p', null, p))),
    h('div', { class: 'card' },
      h('h2', null, UI.about_who),
      h('p', null, who[0]),
      h('ul', { class: 'ticks' }, can.map((x) => h('li', null, x))),
      h('p', null, h('strong', null, who[splitAt])),
      h('ul', { class: 'crosses' }, cannot.map((x) => h('li', null, x))),
      h('p', null, who[who.length - 1])),
    h('div', { class: 'card' }, h('h2', null, UI.about_steps), h('ol', { class: 'steps' }, stepsItems)),
    h('div', { class: 'card' }, h('h2', null, UI.about_safety), STUDY.safety.map((p) => h('p', null, p))),
    h('p', { class: 'callout' }, d['Voluntariness statement']),
    h('div', { class: 'card' }, h('h2', null, UI.about_pi), h('p', null, tplBrackets(piText))),
    btn(UI.about_check_cta, { href: '#/check', big: true }),
    h('p', null, h('a', { href: '#/faq' }, UI.faq_title)),
  );
  return { title: UI.about_title, el };
});

on('/faq', () => {
  const el = h('section', { class: 'page prose' },
    h('h1', null, UI.faq_title), h('p', { class: 'lead' }, UI.faq_lead),
    h('div', { class: 'faq' }, FAQ.map((f) => h('details', null,
      h('summary', null, h('span', { class: 'qn', 'aria-hidden': 'true' }, f.n), h('span', null, f.q)),
      h('div', { class: 'ans' }, h('p', null, tplBrackets(f.a)))))),
    btn(UI.about_check_cta, { href: '#/check', big: true }));
  return { title: UI.faq_title, el };
});

/** Show [bracketed placeholders] in source text with the dashed outline. */
function tplBrackets(str) {
  const out = []; const re = /\[[^\]]+\]/g; let last = 0; let m;
  while ((m = re.exec(str))) {
    if (m.index > last) out.push(str.slice(last, m.index));
    out.push(h('span', { class: 'ph' }, m[0])); last = re.lastIndex;
  }
  if (last < str.length) out.push(str.slice(last));
  return out;
}

on('/privacy', () => {
  const title = PRIVACY.title.replace(/^HRIDAY-CTCA research study — /, '');
  const el = h('section', { class: 'page prose' },
    h('h1', null, UI.privacy_title),
    h('p', { class: 'sub' }, tpl(UI.privacy_for, { V: CONFIG.PRIVACY_NOTICE_VERSION, D: CONFIG.PRIVACY_NOTICE_DATE })),
    h('p', { class: 'sub' }, title),
    PRIVACY.sections.map((s) => h('div', { class: 'card' },
      s.h ? h('h2', null, s.h) : null,
      h('p', null, tplBrackets(s.t)))),
    h('p', null, h('a', { href: '#/help' }, UI.nav.help)));
  return { title: UI.privacy_title, el };
});

on('/help', () => {
  const el = h('section', { class: 'page prose' },
    h('h1', null, UI.help_title),
    h('div', { class: 'card contact' },
      h('h2', null, UI.contact_title),
      h('dl', null,
        h('dt', null, UI.call_label), h('dd', null, phoneNode(CONFIG.HELPLINE), ' ', h('span', { class: 'sub' }, tpl('({{HELPLINE_HOURS}})'))),
        h('dt', null, UI.desk_label), h('dd', null, tpl('{{DESK}}')),
        h('dt', null, 'Grievance Officer'), h('dd', null, tpl('{{GRIEVANCE_NAME}}, THSTI, {{GRIEVANCE_EMAIL}}, {{GRIEVANCE_PHONE}}')))),
    h('div', { class: 'card' }, h('h2', null, UI.help_access), UI.help_access_body.map((t) => h('p', null, t))),
    h('div', { class: 'card' }, h('h2', null, UI.help_privacy),
      h('p', null, tpl(ACK.a3_short)),
      h('a', { class: 'btn btn-secondary', href: '#/privacy' }, ACK.a3_read_full)),
    CONFIG.DEMO ? h('div', { class: 'card review' }, h('h2', null, UI.help_reviewer), reviewerNotes()) : null,
  );
  return { title: UI.help_title, el };
});

function reviewerNotes() {
  const li = (t) => h('li', null, t);
  return h('div', null,
    h('p', null, 'Source: ' + CONFIG.SOURCE_DOCS + '. App version ' + CONFIG.APP_VERSION + '.'),
    h('ul', null,
      li('The questions, answer options and outcome messages follow the HRIDAY-CTCA fact sheet of 16 October 2026 (common pre-screening question set). The study text and FAQ were updated to the same sheet; privacy and consent wording is from OUT-001/002 v0.1.'),
      li('Wording that is not in the fact sheet is marked “// UI” in the source files.'),
      li('Every item still to be confirmed is shown as a bracketed placeholder with a dashed outline.'),
      li('Switch on “Reviewer mode” in Settings to see, on each outcome screen, how the answers were classified (REDCap variable names and codes); and on the final screen, the record that would be sent.'),
      li('Nothing is saved or sent in this build. One-time-code demonstration code: ' + CONFIG.DEMO_OTP + '.')));
}

/* ================================================================== questionnaire */
on('/check', () => {
  S = freshState();
  const el = h('section', { class: 'page prose' },
    h('h1', null, INTRO.title),
    INTRO.paras.map((p) => h('p', { class: 'lead-p' }, p)),
    h('div', { class: 'emergency', role: 'note' }, h('strong', { class: 'tag' }, 'Important'), h('p', null, tpl(INTRO.emergency))),
    h('div', { class: 'stack' },
      btn(UI.start, { href: '#/check/q/channel', big: true, id: 'start-btn' }),
      btn(UI.read_first, { href: '#/about', kind: 'secondary' }),
      h('a', { class: 'textlink', href: '#/privacy' }, UI.privacy)));
  return { title: INTRO.title, el };
});

function pruneAnswers() {
  const keep = new Set(visibleSteps(S.answers).map((id) => QUESTIONS[id].field));
  for (const f of Object.keys(S.answers)) if (!keep.has(f)) delete S.answers[f];
}

function stepProgress(id) {
  const list = visibleSteps(S.answers);
  return { n: list.indexOf(id) + 1, total: list.length };
}

on('/check/q', (id) => {
  const q = QUESTIONS[id];
  if (!q) return notFound();
  // Guard: need earlier answers (no reload persistence by design).
  if (id !== 'channel' && S.answers.ps_channel == null) { go('/check'); return false; }
  const steps = visibleSteps(S.answers);
  if (id !== 'channel' && !steps.includes(id)) { go('/check'); return false; }
  const { n, total } = stepProgress(id);
  const pct = Math.round(((n - 1) / total) * 100);
  const idx = steps.indexOf(id);
  const prev = idx > 0 ? steps[idx - 1] : null;

  const errBox = h('p', { class: 'error', id: 'q-error', role: 'alert' });
  const form = h('form', { novalidate: true, class: 'qform', onsubmit: (e) => { e.preventDefault(); next(); } });
  let getValue;

  const legendId = 'q-text';
  const qText = h('h1', { id: legendId, class: 'qtext' }, h('span', { class: 'sr-only' }, plain(UI.q_of, { N: n, T: total }) + '. '), q.text);
  const note = h('p', { class: 'sr-only', role: 'status', id: 'q-note' });
  let fieldNode;

  if (q.type === 'age') {
    const input = h('input', {
      id: 'age', name: 'age', type: 'text', inputmode: 'numeric', autocomplete: 'off', maxlength: '3', pattern: '[0-9]*',
      'aria-describedby': 'age-hint q-error', class: 'bigfield', value: S.answers.ps_age != null ? String(S.answers.ps_age) : '',
    });
    fieldNode = h('div', { class: 'field' }, h('p', { id: 'age-hint', class: 'hint' }, q.hint), h('label', { for: 'age', class: 'sr-only' }, q.text), input);
    getValue = () => {
      const v = input.value.trim();
      input.removeAttribute('aria-invalid');
      const num = /^\d{1,3}$/.test(v) ? parseInt(v, 10) : NaN;
      if (!ageValid(num)) { input.setAttribute('aria-invalid', 'true'); return { error: UI.age_error, focus: input }; }
      return { value: num };
    };
  } else if (q.type === 'single') {
    const name = 'opt';
    const cur = S.answers[q.field];
    fieldNode = h('div', { class: 'options', role: 'radiogroup', 'aria-labelledby': legendId },
      q.options.map((o, i) => h('label', { class: 'opt' },
        h('input', { type: 'radio', name, value: String(o.v), checked: cur === o.v, 'aria-describedby': 'q-error' }),
        h('span', { class: 'mark', 'aria-hidden': 'true' }), h('span', { class: 'txt' }, o.label))));
    getValue = () => {
      const c = fieldNode.querySelector('input:checked');
      if (!c) return { error: UI.choose_answer, focus: fieldNode.querySelector('input') };
      return { value: Number(c.value) };
    };
  } else { // multi
    let sel = Array.isArray(S.answers[q.field]) ? [...S.answers[q.field]] : [];
    const boxes = q.options.map((o) => h('input', {
      type: 'checkbox', value: String(o.v), checked: sel.includes(o.v), 'aria-describedby': 'q-error',
      onchange: () => {
        const before = sel;
        sel = toggleRf(sel, o.v);
        boxes.forEach((b, i) => { b.checked = sel.includes(q.options[i].v); });
        errBox.textContent = '';
        note.textContent = '';
        // "None of these" (8) is exclusive: tell the person when choosing it, or choosing another answer, cleared something.
        if (before.some((c) => c !== o.v && !sel.includes(c))) setTimeout(() => { note.textContent = UI.others_cleared; }, 50);
      },
    }));
    fieldNode = h('div', { class: 'options', role: 'group', 'aria-labelledby': legendId },
      q.options.map((o, i) => h('label', { class: 'opt opt-check' }, boxes[i], h('span', { class: 'mark', 'aria-hidden': 'true' }), h('span', { class: 'txt' }, o.label))));
    getValue = () => (sel.length ? { value: [...sel].sort((a, b) => a - b) } : { error: UI.choose_one_or_more, focus: boxes[0] });
  }

  function next() {
    const r = getValue();
    if (r.error) { errBox.textContent = r.error; r.focus && r.focus.focus(); return; }
    errBox.textContent = '';
    S.answers[q.field] = r.value;
    pruneAnswers(); // under 40, or Yes to known heart disease: later questions drop out and the result follows
    const st = visibleSteps(S.answers);
    const nx = st[st.indexOf(id) + 1];
    if (nx) go('/check/q/' + nx); else go('/check/result');
  }

  const listenText = () => q.text + (q.options ? ' ' + q.options.map((o) => o.label).join('. ') + '.' : '');
  const encourage = pct >= 50 && pct < 75 ? UI.encourage_mid : pct >= 75 ? UI.encourage_late : '';

  form.append(
    h('div', { class: 'qhead' },
      h('p', { class: 'step-count' }, plain(UI.q_of, { N: n, T: total })),
      h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct), 'aria-valuetext': plain(UI.q_of, { N: n, T: total }), 'aria-label': UI.progress_label },
        h('div', { class: 'bar-fill', style: `width:${Math.max(pct, 4)}%` })),
      encourage ? h('p', { class: 'encourage' }, encourage) : null),
    qText, listenButton(listenText), fieldNode, errBox, note,
    h('div', { class: 'actions' },
      prev ? btn(UI.back, { kind: 'secondary', onclick: () => go('/check/q/' + prev) }) : btn(UI.back, { kind: 'secondary', onclick: () => go('/check') }),
      h('button', { type: 'submit', class: 'btn btn-primary' }, UI.next)),
    h('p', { class: 'leave' }, h('a', { href: '#/' }, UI.leave)));

  return { title: q.no + ' · ' + q.text, el: h('section', { class: 'page qpage' }, form) };
});

/* ---- result ---- */
const NE_KEY = { [REASON.AGE]: 'age', [REASON.KNOWN_DISEASE]: 'known_disease', [REASON.NO_RISK_FACTOR]: 'no_risk_factor' };

on('/check/result', () => {
  const missing = firstUnanswered(S.answers);
  if (missing) { go(S.answers.ps_channel == null ? '/check' : '/check/q/' + missing); return false; }
  const r = classify(S.answers);
  S.result = r;
  const el = h('section', { class: 'page prose result' });
  const kids = [];
  const goOn = r.outcome === OUTCOME.ELIGIBLE || r.outcome === OUTCOME.REVIEW;

  if (goOn) {
    const msg = r.outcome === OUTCOME.ELIGIBLE ? MESSAGES.eligible : MESSAGES.review;
    kids.push(h('h1', null, msg.title), msg.paras.map((p) => h('p', null, p)));
    kids.push(h('div', { class: 'stack' },
      btn(UI.continue, { big: true, onclick: () => go('/check/notice') }),
      btn(UI.no_thanks, { kind: 'secondary', onclick: () => { S.consent = false; go('/check/end'); } })));
  } else {
    const msg = MESSAGES.not_eligible;
    kids.push(h('h1', null, msg.title), h('p', null, msg.reasons[NE_KEY[r.reasons[0]]]), h('p', null, msg.closing));
    if (r.reasons[0] === REASON.AGE) {
      kids.push(h('p', null, msg.more), h('ul', null,
        h('li', null, h('a', { href: '#/about' }, UI.about_title)),
        h('li', null, 'Helpline: ', phoneNode(CONFIG.HELPLINE))), shareButton());
    }
    kids.push(exitButtons());
  }
  append(el, kids);
  const lb = listenButton(() => readable(el));
  if (lb) el.insertBefore(lb, $('h1', el).nextSibling);
  if (goOn) el.append(leaveLink());
  if (prefs.review) el.append(reviewPanel(r));
  return { title: 'Your answers', el, terminal: !goOn };
});

function exitButtons() {
  return h('div', { class: 'stack' }, btn(UI.go_home, { href: '#/', big: true }), btn(UI.restart, { kind: 'secondary', href: '#/check' }));
}

const nameOf = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k]));
const REASON_NAMES = nameOf(REASON);
const REVIEW_NAMES = nameOf(REVIEW_REASON);
function reviewPanel(r) {
  const outName = { 1: 'POTENTIALLY ELIGIBLE', 2: 'NOT ELIGIBLE', 3: 'COORDINATOR CHECK NEEDED' }[r.outcome];
  return h('aside', { class: 'card review', 'aria-label': UI.rev_outcome },
    h('h2', null, UI.rev_outcome),
    h('dl', null,
      h('dt', null, 'Outcome'), h('dd', null, outName + ' (ps_outcome = ' + r.outcome + ')'),
      h('dt', null, 'ps_age_ok'), h('dd', null, String(r.ps_age_ok)),
      h('dt', null, 'Not-eligible reasons'), h('dd', null, r.reasons.map((x) => x + ' ' + REASON_NAMES[x]).join(', ') || '—'),
      h('dt', null, 'Check-needed reasons'), h('dd', null, r.review.map((x) => REVIEW_NAMES[x]).join(', ') || '—'),
      h('dt', null, 'Answers (ps_channel never affects the outcome)')),
    h('pre', null, JSON.stringify(S.answers)));
}

/* ---- disclaimer, consent tick and privacy notice (outcomes 1 and 3 only) ---- */
/** True only if every visible question is answered and the answers classify as potentially eligible or check needed. */
function eligibleToContinue() {
  if (firstUnanswered(S.answers)) return false;
  const r = classify(S.answers);
  return r.outcome === OUTCOME.ELIGIBLE || r.outcome === OUTCOME.REVIEW;
}

on('/check/end', () => {
  if (!eligibleToContinue()) { go('/check'); return false; }
  const msg = MESSAGES.end;
  const el = h('section', { class: 'page prose' }, h('h1', null, msg.title), msg.paras.map((p) => para(p)), exitButtons());
  return { title: msg.title, el, terminal: true };
});

on('/check/notice', () => {
  if (!eligibleToContinue()) { go('/check'); return false; }
  const cb = h('input', { type: 'checkbox', id: 'priv', checked: S.consent, 'aria-describedby': 'priv-error' });
  const err = h('p', { class: 'error', id: 'priv-error', role: 'alert' });
  const full = h('details', { class: 'inline-details' }, h('summary', null, ACK.a3_read_full),
    PRIVACY.sections.map((s) => h('div', null, s.h ? h('h3', null, s.h) : null, h('p', null, tplBrackets(s.t)))));
  const el = h('form', { class: 'page prose', novalidate: true, onsubmit: (e) => {
    e.preventDefault();
    if (!cb.checked) { err.textContent = UI.tick_to_go_on; cb.focus(); return; }
    S.consent = true; go('/check/contact/1');
  } },
  h('h1', null, ACK.a3_title),
  h('p', { class: 'callout' }, ACK.disclaimer),
  h('div', { class: 'card' }, h('p', null, tpl(ACK.a3_short))),
  full,
  h('label', { class: 'opt opt-check single' }, cb, h('span', { class: 'mark', 'aria-hidden': 'true' }), h('span', { class: 'txt' }, ACK.a3_check)),
  err,
  h('div', { class: 'actions' }, btn(UI.back, { kind: 'secondary', onclick: () => go('/check/result') }), h('button', { type: 'submit', class: 'btn btn-primary' }, UI.next)),
  leaveLink());
  const lb = listenButton(() => plain(ACK.a3_title + '. ' + ACK.disclaimer + ' ' + ACK.a3_short));
  if (lb) el.insertBefore(lb, el.children[1]);
  return { title: ACK.a3_title, el };
});

/* ---- contact details in three short screens ---- */
const CONTACT_STEPS = 3;
/** Accepts "98765 43210", "+91 98765 43210", "09876543210" and returns the 10 digits (or the cleaned text if it cannot). */
const normMobile = (v) => { let d = String(v).replace(/[\s\-().]/g, ''); if (d.startsWith('+91')) d = d.slice(3); else if (d.startsWith('91') && d.length === 12) d = d.slice(2); else if (d.startsWith('0') && d.length === 11) d = d.slice(1); return d; };
const MOBILE_OK = (v) => /^\d{10}$/.test(v) && Number(v) >= 6000000000 && Number(v) <= 9999999999;

function field(id, label, input, { hint } = {}) {
  input.setAttribute('aria-describedby', (hint ? id + '-hint ' : '') + id + '-err');
  return h('div', { class: 'field' },
    h('label', { for: id, class: 'flabel' }, label),
    hint ? h('p', { class: 'hint', id: id + '-hint' }, hint) : null,
    input,
    h('p', { class: 'error', id: id + '-err', role: 'alert' }));
}
function setErr(id, msg) { const e = $('#' + id + '-err'); if (e) e.textContent = msg || ''; const i = $('#' + id); if (i) { if (msg) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid'); } }

on('/check/contact', (n) => {
  const step = Number(n);
  if (!S.consent || !eligibleToContinue() || !(step >= 1 && step <= CONTACT_STEPS)) { go('/check'); return false; }
  const c = S.contact;
  const back = () => go(step === 1 ? '/check/notice' : '/check/contact/' + (step - 1));
  const nextPath = step === CONTACT_STEPS ? '/check/review' : '/check/contact/' + (step + 1);
  let title; let body; let validate;

  if (step === 1) {
    title = 'Your name and mobile number';
    const name = h('input', { id: 'c1', type: 'text', autocomplete: 'name', maxlength: '100', class: 'bigfield', value: c.name || '' });
    const mobile = h('input', { id: 'c2', type: 'tel', inputmode: 'tel', autocomplete: 'tel-national', maxlength: '16', class: 'bigfield', value: c.mobile || '' });
    const codeBox = h('div', { class: 'otp', hidden: true });
    const codeIn = h('input', { id: 'otp', type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6', class: 'bigfield' });
    const status = h('p', { class: 'ok', role: 'status' }, c.verified ? UI.verified : '');
    const sendBtn = h('button', { type: 'button', class: 'btn btn-secondary', id: 'send-code' }, UI.send_code);
    const verBtn = h('button', { type: 'button', class: 'btn btn-secondary' }, UI.verify);
    const info = h('p', { class: 'hint' });
    codeBox.append(info, field('otp', UI.code_label, codeIn), verBtn);
    const mb = () => normMobile(mobile.value);
    mobile.addEventListener('input', () => { if (c.verified && c.verifiedFor !== mb()) { c.verified = false; status.textContent = ''; } });
    sendBtn.addEventListener('click', async () => {
      setErr('c2', '');
      if (!MOBILE_OK(mb())) { setErr('c2', UI.mobile_error); mobile.focus(); return; }
      sendBtn.disabled = true;
      try {
        const r = await sendOtp(mb());
        if (!r.ok) throw new Error('otp');
      } catch {
        sendBtn.disabled = false; setErr('c2', plain(UI.otp_send_failed)); return;
      }
      sendBtn.disabled = false;
      codeBox.hidden = false;
      info.textContent = '';
      append(info, [plain(UI.code_sent, { MOBILE: mb() }), CONFIG.DEMO ? ' ' + plain(UI.code_demo, { CODE: CONFIG.DEMO_OTP }) : '']);
      codeIn.focus();
    });
    const doVerify = async () => {
      setErr('otp', '');
      let r;
      try { r = await verifyOtp(mb(), codeIn.value.trim()); } catch { r = { ok: false }; }
      if (!r.ok) { setErr('otp', UI.verify_error); codeIn.focus(); return; }
      c.verified = true; c.verifiedFor = mb(); c.mobile = mb();
      status.textContent = UI.verified; codeBox.hidden = true;
      $('#contact-next').focus();
    };
    verBtn.addEventListener('click', doVerify);
    codeIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doVerify(); } });
    body = [field('c1', CONTACT.c1, name), field('c2', CONTACT.c2, mobile, { hint: '10 digits, for example 9876543210' }), sendBtn, codeBox, status];
    validate = () => {
      let ok = true;
      setErr('c1', ''); setErr('c2', '');
      const nm = name.value.trim();
      if (!nm) { setErr('c1', UI.name_error); name.focus(); ok = false; }
      const num = mb();
      if (!MOBILE_OK(num)) { setErr('c2', UI.mobile_error); if (ok) mobile.focus(); ok = false; }
      else if (!(c.verified && c.verifiedFor === num)) { setErr('c2', UI.verify_first); if (ok) sendBtn.focus(); ok = false; }
      if (ok) { c.name = nm; c.mobile = num; }
      return ok;
    };
  } else if (step === 2) {
    title = 'Where you live and which hospital';
    const city = h('input', { id: 'c6', type: 'text', inputmode: 'text', autocomplete: 'address-level2', maxlength: '60', class: 'bigfield', value: c.city || '' });
    const site = h('select', { id: 'c7', class: 'bigfield' }, h('option', { value: '' }, UI.site_choose),
      CONFIG.SITES.map((s) => h('option', { value: s.code, selected: c.site === s.code }, s.name)));
    body = [field('c6', CONTACT.c6, city), field('c7', CONTACT.c7, site)];
    validate = () => {
      let ok = true; setErr('c6', ''); setErr('c7', '');
      const cv = city.value.trim();
      if (!cv) { setErr('c6', UI.city_error); city.focus(); ok = false; }
      if (!site.value) { setErr('c7', UI.select_error); if (ok) site.focus(); ok = false; }
      if (ok) { c.city = cv; c.site = site.value; }
      return ok;
    };
  } else {
    title = 'Language, best time to call and appointment';
    const lang = h('select', { id: 'c8', class: 'bigfield' }, h('option', { value: '' }, UI.lang_choose),
      CONTACT.languages.map((l) => h('option', { value: l.v, selected: c.lang === l.v }, l.label)));
    const time = h('select', { id: 'c9', class: 'bigfield' }, h('option', { value: '' }, CONTACT.c9_none),
      CONTACT.c9_opts.map((o) => h('option', { value: o.v, selected: c.calltime === o.v }, o.label)));
    const appt = h('input', { type: 'checkbox', id: 'c11', checked: !!c.appt, 'aria-describedby': 'c11-hint' });
    body = [field('c8', CONTACT.c8, lang), field('c9', CONTACT.c9, time),
      h('div', { class: 'field' },
        h('label', { class: 'opt opt-check single' }, appt, h('span', { class: 'mark', 'aria-hidden': 'true' }), h('span', { class: 'txt' }, CONTACT.c11)),
        h('p', { class: 'hint', id: 'c11-hint' }, CONTACT.c11_hint))];
    validate = () => {
      setErr('c8', '');
      if (!lang.value) { setErr('c8', UI.select_error); lang.focus(); return false; }
      c.lang = lang.value; c.calltime = time.value ? Number(time.value) : ''; c.appt = appt.checked;
      return true;
    };
  }

  const el = h('form', { class: 'page qpage', novalidate: true, onsubmit: (e) => { e.preventDefault(); if (validate()) go(nextPath); } },
    h('div', { class: 'qhead' }, h('p', { class: 'step-count' }, `Your details: ${step} of ${CONTACT_STEPS}`),
      h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(((step - 1) / CONTACT_STEPS) * 100)), 'aria-label': UI.progress_label },
        h('div', { class: 'bar-fill', style: `width:${Math.max(4, Math.round(((step - 1) / CONTACT_STEPS) * 100))}%` }))),
    h('h1', { class: 'qtext' }, title), body,
    h('div', { class: 'actions' }, btn(UI.back, { kind: 'secondary', onclick: back }), h('button', { type: 'submit', class: 'btn btn-primary', id: 'contact-next' }, UI.next)),
    h('p', { class: 'leave' }, h('a', { href: '#/' }, UI.leave)));
  return { title, el };
});

/* ---- review and submit ---- */
on('/check/review', () => {
  const c = S.contact;
  if (S.ref) { go('/check/done'); return false; }
  if (!S.consent || !eligibleToContinue() || !c.verified || !c.name || !c.mobile || !c.city || !c.site || !c.lang) { go('/check'); return false; }
  const site = CONFIG.SITES.find((s) => s.code === c.site);
  const lang = CONTACT.languages.find((l) => l.v === c.lang);
  const time = CONTACT.c9_opts.find((o) => o.v === c.calltime);
  const row = (k, v, to) => h('div', { class: 'row' }, h('dt', null, k), h('dd', null, h('span', { class: 'val' }, v), h('a', { href: '#/check/contact/' + to, 'aria-label': UI.change + ' ' + k }, UI.change)));
  const errBox = h('p', { class: 'error', role: 'alert' });
  const sendBtn = h('button', { type: 'button', class: 'btn btn-primary btn-big' }, UI.send_details);
  sendBtn.addEventListener('click', async () => {
    if (S.submitting) return;
    S.submitting = true; sendBtn.disabled = true; sendBtn.textContent = UI.sending; errBox.textContent = '';
    try {
      const r = await submitEOI(S);
      S.ref = r.ref; S.payload = r.payload; S.submitting = false;
      go('/check/done');
    } catch {
      S.submitting = false; sendBtn.disabled = false; sendBtn.textContent = UI.send_details;
      errBox.textContent = plain(UI.send_failed);
    }
  });
  const sm = UI.summary;
  const el = h('section', { class: 'page prose' },
    h('h1', null, UI.review_title), h('p', { class: 'lead-p' }, UI.review_intro),
    h('dl', { class: 'summary' },
      row(sm.name, c.name, 1), row(sm.mobile, c.mobile, 1),
      row(sm.city, c.city, 2), row(sm.site, site.name, 2),
      row(sm.lang, lang.label, 3), row(sm.time, time ? time.label : sm.none, 3),
      row(sm.appt, c.appt ? sm.yes : sm.no, 3)),
    h('p', { class: 'hint' }, UI.submit_note), errBox,
    h('div', { class: 'actions' }, btn(UI.back, { kind: 'secondary', onclick: () => go('/check/contact/' + CONTACT_STEPS) }), sendBtn),
    h('p', { class: 'leave' }, h('a', { href: '#/' }, UI.leave_unsent)));
  return { title: UI.review_title, el };
});

/* ---- confirmation ---- */
on('/check/done', () => {
  if (!S.ref) { go('/check'); return false; }
  const c = S.contact; const m = MESSAGES.done;
  const site = CONFIG.SITES.find((s) => s.code === c.site);
  const el = h('section', { class: 'page prose result' },
    h('h1', null, ...tpl(m.title, { NAME: c.name, REF: S.ref })),
    h('p', null, tpl(m.p1, { HOSPITAL: site.name, SITE_PHONE: site.phone })),
    h('p', null, h('strong', null, m.next_h + ' '), m.next, c.appt ? [' ', m.appt] : null),
    h('p', null, h('strong', null, m.changed_h + ' '), tpl(m.changed)),
    h('p', { class: 'callout' }, m.closing),
    CONFIG.DEMO ? h('p', { class: 'hint' }, 'Demonstration: this reference number is not real and nothing was sent.') : null,
    prefs.review ? h('aside', { class: 'card review' }, h('h2', null, UI.rev_payload), h('pre', null, JSON.stringify(S.payload, null, 1))) : null,
    h('div', { class: 'stack' }, btn(UI.go_home, { href: '#/', big: true }), shareButton()));
  return { title: 'Confirmation', el, terminal: true };
});

/* ================================================================== boot */
function boot() {
  loadPrefs();
  buildShell();
  $('#settings-btn').addEventListener('click', () => ($('#settings').hidden ? openSettings() : closeSettings()));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#settings').hidden) closeSettings(); });
  window.addEventListener('hashchange', route);
  route();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}
boot();
