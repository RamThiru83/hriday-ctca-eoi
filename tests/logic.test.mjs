// Run:  npm test   (node --test tests/*.test.mjs)
// Verifies the pre-screening engine (js/logic.js) against the HRIDAY-CTCA decisions fact sheet of 16 Oct 2026,
// "Common pre-screening question set": ps_channel, ps_age, ps_hd, ps_rf -> ps_outcome (1 potentially eligible,
// 2 not eligible, 3 coordinator check needed), with fail-closed handling of missing or invalid answers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  classify, visibleSteps, toggleRf, firstUnanswered, ageOk, ageValid, normaliseRf, riskFactorPresent,
  OUTCOME, REASON, REVIEW_REASON,
} from '../js/logic.js';
import { buildPayload, toRedcapRecord } from '../js/api.js';
import { QUESTIONS } from '../js/content.js';

const E = OUTCOME;
const R = REASON;
const RR = REVIEW_REASON;

/** A valid, potentially eligible answer set, with overrides. */
const ok = (over = {}) => ({ ps_channel: 1, ps_age: 55, ps_hd: 0, ps_rf: [2], ...over });
const out = (a) => classify(a).outcome;

// ------------------------------------------------------------------ the three outcomes
test('potentially eligible: age 40+, no known heart disease, at least one of options 1-7', () => {
  for (const code of [1, 2, 3, 4, 5, 6, 7]) {
    const r = classify(ok({ ps_rf: [code] }));
    assert.equal(r.outcome, E.ELIGIBLE, `option ${code}`);
    assert.deepEqual(r.reasons, []);
    assert.deepEqual(r.review, []);
    assert.equal(r.incomplete, false);
    assert.equal(r.ps_age_ok, 1);
  }
});

test('potentially eligible with several risk factors, and with 9 (not sure) ticked alongside 1-7', () => {
  assert.equal(out(ok({ ps_rf: [1, 2, 3, 4, 5, 6, 7] })), E.ELIGIBLE);
  assert.equal(out(ok({ ps_rf: [2, 9] })), E.ELIGIBLE);
  assert.equal(out(ok({ ps_rf: [1, 9] })), E.ELIGIBLE);
});

test('not eligible: aged under 40 (reason 1, age)', () => {
  const r = classify(ok({ ps_age: 39 }));
  assert.equal(r.outcome, E.NOT_ELIGIBLE);
  assert.deepEqual(r.reasons, [R.AGE]);
  assert.equal(r.ps_age_ok, 0);
});

test('not eligible: Yes to known heart disease (reason 2)', () => {
  const r = classify(ok({ ps_hd: 1 }));
  assert.equal(r.outcome, E.NOT_ELIGIBLE);
  assert.deepEqual(r.reasons, [R.KNOWN_DISEASE]);
});

test('not eligible: only "None of these" (reason 3, no risk factor)', () => {
  const r = classify(ok({ ps_rf: [8] }));
  assert.equal(r.outcome, E.NOT_ELIGIBLE);
  assert.deepEqual(r.reasons, [R.NO_RISK_FACTOR]);
});

test('coordinator check needed: Not sure about heart disease', () => {
  const r = classify(ok({ ps_hd: 2 }));
  assert.equal(r.outcome, E.REVIEW);
  assert.deepEqual(r.review, [RR.HD_NOT_SURE]);
  assert.equal(r.incomplete, false);
});

test('coordinator check needed: option 9 (not sure) without any of 1-7', () => {
  const r = classify(ok({ ps_rf: [9] }));
  assert.equal(r.outcome, E.REVIEW);
  assert.deepEqual(r.review, [RR.RF_NOT_SURE]);
});

test('coordinator check needed: not sure on both questions records both reasons', () => {
  const r = classify(ok({ ps_hd: 2, ps_rf: [9] }));
  assert.equal(r.outcome, E.REVIEW);
  assert.deepEqual(r.review, [RR.HD_NOT_SURE, RR.RF_NOT_SURE]);
});

test('not sure about heart disease but a risk factor present: still review, not eligible', () => {
  assert.equal(out(ok({ ps_hd: 2, ps_rf: [4] })), E.REVIEW);
  assert.equal(out(ok({ ps_hd: 2, ps_rf: [4, 9] })), E.REVIEW);
});

// ------------------------------------------------------------------ age boundaries
test('age boundaries: 39 not eligible, 40 eligible, no upper limit up to 110', () => {
  assert.equal(out(ok({ ps_age: 39 })), E.NOT_ELIGIBLE);
  assert.equal(out(ok({ ps_age: 40 })), E.ELIGIBLE);
  assert.equal(out(ok({ ps_age: 41 })), E.ELIGIBLE);
  assert.equal(out(ok({ ps_age: 70 })), E.ELIGIBLE); // the old upper limit is gone
  assert.equal(out(ok({ ps_age: 71 })), E.ELIGIBLE);
  assert.equal(out(ok({ ps_age: 99 })), E.ELIGIBLE);
  assert.equal(out(ok({ ps_age: 110 })), E.ELIGIBLE);
});

test('age 18 is the smallest valid entry and is not eligible (under 40)', () => {
  const r = classify(ok({ ps_age: 18 }));
  assert.equal(r.outcome, E.NOT_ELIGIBLE);
  assert.deepEqual(r.reasons, [R.AGE]);
});

test('ps_age_ok follows the 40-year threshold only', () => {
  assert.equal(ageOk(39), 0);
  assert.equal(ageOk(40), 1);
  assert.equal(ageOk(110), 1);
  assert.equal(ageOk(18), 0);
  for (const bad of [undefined, null, '', 'abc', '45', 17, 111, 200, -5, 45.5, NaN, Infinity]) assert.equal(ageOk(bad), null, String(bad));
});

test('ageValid accepts whole numbers 18-110 only', () => {
  assert.equal(ageValid(18), true);
  assert.equal(ageValid(110), true);
  for (const bad of [17, 111, 0, -1, 45.5, '50', null, undefined, NaN]) assert.equal(ageValid(bad), false, String(bad));
});

test('age under 40 wins over every other answer (the questionnaire stops after the age question)', () => {
  assert.deepEqual(classify(ok({ ps_age: 30, ps_hd: 1 })).reasons, [R.AGE]);
  assert.deepEqual(classify(ok({ ps_age: 30, ps_rf: [8] })).reasons, [R.AGE]);
  assert.deepEqual(classify({ ps_channel: 1, ps_age: 30 }).reasons, [R.AGE]); // later questions not asked, so not needed
});

// ------------------------------------------------------------------ fail closed: missing and invalid answers
test('missing answers never give "potentially eligible" (fail closed to check needed, incomplete)', () => {
  const cases = [
    {},
    { ps_channel: 1 },
    { ps_channel: 1, ps_age: 55 },
    { ps_channel: 1, ps_age: 55, ps_hd: 0 },
    { ps_channel: 1, ps_age: 55, ps_rf: [2] },
    { ps_channel: 1, ps_hd: 0, ps_rf: [2] },
    ok({ ps_age: undefined }),
    ok({ ps_hd: undefined }),
    ok({ ps_hd: null }),
    ok({ ps_rf: undefined }),
    ok({ ps_rf: [] }),
    ok({ ps_rf: null }),
  ];
  for (const c of cases) {
    const r = classify(c);
    assert.notEqual(r.outcome, E.ELIGIBLE, JSON.stringify(c));
    assert.equal(r.outcome, E.REVIEW, JSON.stringify(c));
    assert.equal(r.incomplete, true, JSON.stringify(c));
    assert.deepEqual(r.review, [RR.INCOMPLETE]);
  }
});

test('classify() with no argument does not throw and does not give "eligible"', () => {
  assert.equal(classify().outcome, E.REVIEW);
});

test('invalid values never give "potentially eligible"', () => {
  const bad = [
    ok({ ps_age: '55' }), ok({ ps_age: 55.5 }), ok({ ps_age: 111 }), ok({ ps_age: 17 }), ok({ ps_age: NaN }),
    ok({ ps_hd: 3 }), ok({ ps_hd: '0' }), ok({ ps_hd: -1 }), ok({ ps_hd: true }),
    ok({ ps_rf: 2 }), ok({ ps_rf: '2' }), ok({ ps_rf: [0] }), ok({ ps_rf: [10] }), ok({ ps_rf: ['2'] }), ok({ ps_rf: [2.5] }),
    ok({ ps_rf: [2, 8] }), ok({ ps_rf: [8, 9] }), ok({ ps_rf: [1, 8] }),
  ];
  for (const c of bad) {
    const o = classify(c).outcome;
    assert.notEqual(o, E.ELIGIBLE, JSON.stringify(c));
  }
});

test('"None of these" combined with any other option is invalid, not "no risk factor" and not eligible', () => {
  for (const combo of [[1, 8], [2, 8], [7, 8], [8, 9], [1, 2, 8]]) {
    const r = classify(ok({ ps_rf: combo }));
    assert.equal(r.outcome, E.REVIEW, JSON.stringify(combo));
    assert.equal(r.incomplete, true);
  }
});

test('Yes to known heart disease is conclusive even if ps_rf is missing or invalid', () => {
  assert.equal(out(ok({ ps_hd: 1, ps_rf: undefined })), E.NOT_ELIGIBLE);
  assert.equal(out(ok({ ps_hd: 1, ps_rf: [] })), E.NOT_ELIGIBLE);
  assert.equal(out(ok({ ps_hd: 1, ps_rf: [2, 8] })), E.NOT_ELIGIBLE);
  assert.equal(out({ ps_age: 60, ps_hd: 1 }), E.NOT_ELIGIBLE); // rf is not asked after a Yes
});

test('Yes to heart disease with "None of these" records both reasons, in order', () => {
  assert.deepEqual(classify(ok({ ps_hd: 1, ps_rf: [8] })).reasons, [R.KNOWN_DISEASE, R.NO_RISK_FACTOR]);
});

test('Yes to heart disease wins over a risk factor', () => {
  assert.equal(out(ok({ ps_hd: 1, ps_rf: [1, 2, 3] })), E.NOT_ELIGIBLE);
});

test('Not sure about heart disease together with "None of these" is not eligible (no risk factor), not review', () => {
  const r = classify(ok({ ps_hd: 2, ps_rf: [8] }));
  assert.equal(r.outcome, E.NOT_ELIGIBLE);
  assert.deepEqual(r.reasons, [R.NO_RISK_FACTOR]);
});

// ------------------------------------------------------------------ option 8 exclusivity and checkbox behaviour
test('toggleRf: ticking "None of these" (8) clears every other option', () => {
  assert.deepEqual(toggleRf([1, 2, 9], 8), [8]);
  assert.deepEqual(toggleRf([], 8), [8]);
});

test('toggleRf: ticking any other option clears "None of these"', () => {
  for (const code of [1, 2, 3, 4, 5, 6, 7, 9]) assert.deepEqual(toggleRf([8], code), [code], String(code));
});

test('toggleRf: 9 (not sure) can sit alongside 1-7, result is sorted', () => {
  assert.deepEqual(toggleRf([4], 9), [4, 9]);
  assert.deepEqual(toggleRf([9], 2), [2, 9]);
  assert.deepEqual(toggleRf([7, 1], 3), [1, 3, 7]);
});

test('toggleRf: unticking removes only that option and does not mutate the input', () => {
  const cur = [1, 2];
  assert.deepEqual(toggleRf(cur, 1), [2]);
  assert.deepEqual(cur, [1, 2]);
  assert.deepEqual(toggleRf([8], 8), []);
});

test('toggleRf never produces a combination that classify() treats as invalid', () => {
  const codes = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  let state = [];
  let seed = 12345;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  for (let i = 0; i < 5000; i++) {
    state = toggleRf(state, codes[Math.floor(rnd() * codes.length)]);
    if (state.length) assert.notEqual(normaliseRf(state), null, JSON.stringify(state));
  }
});

test('normaliseRf and riskFactorPresent', () => {
  assert.deepEqual(normaliseRf([3, 1, 3]), [1, 3]);
  assert.equal(normaliseRf([]), null);
  assert.equal(normaliseRf([8, 1]), null);
  assert.equal(riskFactorPresent([8]), false);
  assert.equal(riskFactorPresent([9]), false);
  assert.equal(riskFactorPresent([8, 9]), false);
  assert.equal(riskFactorPresent([9, 4]), true);
  assert.equal(riskFactorPresent(undefined), false);
});

// ------------------------------------------------------------------ channel never affects the outcome
test('ps_channel (any of 1-6, missing or invalid) never changes the outcome, reasons or review reasons', () => {
  const bases = [
    ok(), ok({ ps_age: 39 }), ok({ ps_hd: 1 }), ok({ ps_hd: 2 }), ok({ ps_rf: [8] }), ok({ ps_rf: [9] }),
    ok({ ps_age: undefined }), ok({ ps_rf: [] }), ok({ ps_hd: 2, ps_rf: [9] }),
  ];
  for (const base of bases) {
    const ref = classify({ ...base, ps_channel: 1 });
    for (const ch of [1, 2, 3, 4, 5, 6, undefined, null, 0, 99, 'x']) {
      assert.deepEqual(classify({ ...base, ps_channel: ch }), ref, JSON.stringify({ base, ch }));
    }
    const noChannel = { ...base }; delete noChannel.ps_channel;
    assert.deepEqual(classify(noChannel), ref);
  }
});

// ------------------------------------------------------------------ question flow
test('visibleSteps: channel, age, hd, rf for age 40+', () => {
  assert.deepEqual(visibleSteps({}), ['channel', 'age', 'hd', 'rf']);
  assert.deepEqual(visibleSteps({ ps_age: 40 }), ['channel', 'age', 'hd', 'rf']);
  assert.deepEqual(visibleSteps({ ps_age: 110, ps_hd: 0 }), ['channel', 'age', 'hd', 'rf']);
  assert.deepEqual(visibleSteps({ ps_age: 55, ps_hd: 2 }), ['channel', 'age', 'hd', 'rf']);
});

test('visibleSteps: ends after age under 40, and after Yes to known heart disease', () => {
  assert.deepEqual(visibleSteps({ ps_age: 39 }), ['channel', 'age']);
  assert.deepEqual(visibleSteps({ ps_age: 18 }), ['channel', 'age']);
  assert.deepEqual(visibleSteps({ ps_age: 60, ps_hd: 1 }), ['channel', 'age', 'hd']);
});

test('visibleSteps: an invalid age does not end the questionnaire (the age screen validates it)', () => {
  assert.deepEqual(visibleSteps({ ps_age: 17 }).includes('hd'), true);
});

test('only the four fact-sheet questions exist, with the REDCap variable names', () => {
  assert.deepEqual(Object.keys(QUESTIONS), ['channel', 'age', 'hd', 'rf']);
  assert.deepEqual(Object.values(QUESTIONS).map((q) => q.field), ['ps_channel', 'ps_age', 'ps_hd', 'ps_rf']);
});

test('ps_channel options are codes 1-6 and ps_rf options are codes 1-9 in the fact-sheet wording', () => {
  assert.deepEqual(QUESTIONS.channel.options.map((o) => o.v), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(QUESTIONS.channel.options.map((o) => o.label), [
    'Poster/flyer at a hospital or clinic', 'My doctor referred me', "Workplace, residents' association or community group",
    'Social media / WhatsApp', 'Diagnostic laboratory', 'Other',
  ]);
  assert.deepEqual(QUESTIONS.hd.options.map((o) => [o.v, o.label]), [[1, 'Yes'], [0, 'No'], [2, 'Not sure']]);
  assert.deepEqual(QUESTIONS.rf.options.map((o) => o.v), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(QUESTIONS.rf.options.map((o) => o.label), [
    'I smoke now, or I stopped smoking in the last 12 months',
    'High blood pressure, or I take tablets for blood pressure',
    'High cholesterol',
    'Diabetes (high blood sugar)',
    'Kidney disease that a doctor has called moderate (stage 3)',
    'Rheumatoid arthritis or lupus (SLE)',
    'A parent, brother, sister or child had a heart attack, stroke or blocked arteries at a young age (a man before 55, a woman before 65)',
    'None of these',
    'Not sure',
  ]);
  assert.equal(QUESTIONS.age.text, 'How old are you? (years)');
  assert.equal(QUESTIONS.channel.text, 'How did you hear about this study?');
  assert.equal(QUESTIONS.rf.text, 'Do any of these apply to you? Tick all that apply.');
  assert.equal(QUESTIONS.hd.text, 'Has a doctor ever told you that you have heart disease or blocked arteries? For example: a heart attack, angina, a stent or bypass operation, a stroke or mini-stroke, or blocked arteries in the legs.');
});

test('firstUnanswered walks the visible questions in order and stops after an early exit', () => {
  assert.equal(firstUnanswered({}), 'channel');
  assert.equal(firstUnanswered({ ps_channel: 3 }), 'age');
  assert.equal(firstUnanswered({ ps_channel: 3, ps_age: 50 }), 'hd');
  assert.equal(firstUnanswered({ ps_channel: 3, ps_age: 50, ps_hd: 0 }), 'rf');
  assert.equal(firstUnanswered({ ps_channel: 3, ps_age: 50, ps_hd: 0, ps_rf: [] }), 'rf');
  assert.equal(firstUnanswered({ ps_channel: 3, ps_age: 50, ps_hd: 0, ps_rf: [2] }), null);
  assert.equal(firstUnanswered({ ps_channel: 3, ps_age: 39 }), null);
  assert.equal(firstUnanswered({ ps_channel: 3, ps_age: 50, ps_hd: 1 }), null);
  assert.equal(firstUnanswered({ ps_age: 39 }), 'channel'); // the channel is still asked first
});

// ------------------------------------------------------------------ independent oracle over every combination
// Written from the fact sheet text, separately from js/logic.js: age >= 40 else 2; hd Yes 2; none-only 2; hd No + any of 1-7 -> 1; else 3.
function oracle(a) {
  const age = a.ps_age;
  const ageInt = Number.isInteger(age) && age >= 18 && age <= 110;
  if (!ageInt) return 3;
  if (age < 40) return 2;
  if (a.ps_hd === 1) return 2;
  const rf = a.ps_rf;
  if (![0, 2].includes(a.ps_hd)) return 3;
  if (!Array.isArray(rf) || rf.length === 0) return 3;
  const s = new Set(rf);
  if (s.has(8) && s.size > 1) return 3;
  if (s.size === 1 && s.has(8)) return 2;
  const any17 = [1, 2, 3, 4, 5, 6, 7].some((c) => s.has(c));
  if (a.ps_hd === 0 && any17) return 1;
  return 3;
}

test('classify agrees with an independent fact-sheet oracle on every age x hd x rf-subset combination', () => {
  let n = 0;
  const ages = [undefined, 17, 18, 25, 39, 40, 41, 69, 70, 71, 85, 110, 111];
  const hds = [undefined, 0, 1, 2, 3];
  for (const age of ages) for (const hd of hds) for (let mask = 0; mask < 512; mask++) {
    const rf = []; for (let b = 0; b < 9; b++) if (mask & (1 << b)) rf.push(b + 1);
    for (const channel of [undefined, 4]) {
      const a = { ps_channel: channel, ps_age: age, ps_hd: hd, ps_rf: rf };
      assert.equal(classify(a).outcome, oracle(a), JSON.stringify(a));
      n++;
    }
  }
  assert.equal(n, 13 * 5 * 512 * 2);
});

test('"potentially eligible" is returned only when all four conditions hold (exhaustive)', () => {
  const ages = [undefined, 39, 40, 110, 111];
  for (const age of ages) for (const hd of [undefined, 0, 1, 2]) for (let mask = 0; mask < 512; mask++) {
    const rf = []; for (let b = 0; b < 9; b++) if (mask & (1 << b)) rf.push(b + 1);
    const r = classify({ ps_age: age, ps_hd: hd, ps_rf: rf });
    if (r.outcome === E.ELIGIBLE) {
      assert.ok(age >= 40 && age <= 110 && hd === 0 && rf.some((c) => c >= 1 && c <= 7) && !rf.includes(8), JSON.stringify({ age, hd, rf }));
    }
  }
});

test('the result always has the documented shape', () => {
  for (const a of [ok(), ok({ ps_age: 30 }), ok({ ps_hd: 2 }), {}]) {
    const r = classify(a);
    assert.deepEqual(Object.keys(r).sort(), ['incomplete', 'outcome', 'ps_age_ok', 'reasons', 'review']);
    assert.ok([1, 2, 3].includes(r.outcome));
    assert.ok(Array.isArray(r.reasons) && Array.isArray(r.review));
    if (r.outcome === E.NOT_ELIGIBLE) assert.ok(r.reasons.length >= 1 && r.reasons.every((x) => [1, 2, 3].includes(x)));
    if (r.outcome !== E.NOT_ELIGIBLE) assert.deepEqual(r.reasons, []);
  }
});

// ------------------------------------------------------------------ payload (REDCap names and codes)
const contact = { name: 'Test Person', mobile: '9876543210', city: 'Faridabad', site: '03', lang: 'hi', calltime: 2, appt: true };

test('buildPayload uses the REDCap variable names and codes of the fact sheet', () => {
  const p = buildPayload({ answers: ok({ ps_rf: [2, 4] }), contact, consent: true, campaign: 'PH1' });
  assert.deepEqual(
    { ps_channel: p.ps_channel, ps_age: p.ps_age, ps_age_ok: p.ps_age_ok, ps_hd: p.ps_hd, ps_rf: p.ps_rf, ps_outcome: p.ps_outcome },
    { ps_channel: 1, ps_age: 55, ps_age_ok: 1, ps_hd: 0, ps_rf: [2, 4], ps_outcome: 1 });
  assert.deepEqual(
    { n: p.ps_name, m: p.ps_mobile, c: p.ps_city, s: p.ps_site, l: p.ps_lang, t: p.ps_calltime, a: p.ps_appt_request },
    { n: 'Test Person', m: '9876543210', c: 'Faridabad', s: '03', l: 'hi', t: 2, a: 1 });
  for (const k of Object.keys(p)) assert.match(k, /^ps_/, k);
});

test('buildPayload: optional ps_calltime and ps_appt_request may be empty', () => {
  const p = buildPayload({ answers: ok({ ps_hd: 2 }), contact: { ...contact, calltime: '', appt: false }, consent: true });
  assert.equal(p.ps_outcome, 3);
  assert.equal(p.ps_calltime, '');
  assert.equal(p.ps_appt_request, 0);
});

test('buildPayload refuses not-eligible, incomplete and unconsented states (nothing is ever built for them)', () => {
  assert.throws(() => buildPayload({ answers: ok({ ps_age: 39 }), contact, consent: true }));
  assert.throws(() => buildPayload({ answers: ok({ ps_hd: 1 }), contact, consent: true }));
  assert.throws(() => buildPayload({ answers: ok({ ps_rf: [8] }), contact, consent: true }));
  assert.throws(() => buildPayload({ answers: { ps_channel: 1 }, contact, consent: true }));
  assert.throws(() => buildPayload({ answers: ok(), contact, consent: false }));
});

test('payload carries no removed fields (no sex, symptoms, prior tests, contrast, pregnancy, tobacco, other study)', () => {
  const p = buildPayload({ answers: ok(), contact, consent: true });
  const text = JSON.stringify(Object.keys(p));
  for (const gone of ['sex', 'sym', 'cvd', 'prior', 'contrast', 'preg', 'smoke', 'other_study', 'ckd', 'eoi_']) assert.ok(!text.includes(gone), gone);
});

test('toRedcapRecord writes ps_rf as ps_rf___1 .. ps_rf___9 with 1 for ticked and 0 for unticked', () => {
  const rec = toRedcapRecord(buildPayload({ answers: ok({ ps_rf: [2, 9] }), contact, consent: true }));
  for (let c = 1; c <= 9; c++) assert.equal(rec['ps_rf___' + c], c === 2 || c === 9 ? 1 : 0, 'ps_rf___' + c);
  assert.equal(rec.ps_rf, undefined);
  assert.equal(rec.ps_hd, 0);
});

// ------------------------------------------------------------------ participant-facing text matches the fact sheet
// Built from pieces so that the removed name does not appear in the repository, even in this test.
const REMOVED_PERSON = new RegExp(['Nit' + 'ya', 'Wad' + 'hwa'].join('|'), 'i');
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const TEXT_FILES = ['js/content.js', 'js/data-study.js', 'js/data-faq.js', 'js/data-privacy.js'];

test('participant-facing text has no "men 40-70 / women 50-70", "primary prevention", calcium score, 4.5 years or 30-54 months', () => {
  for (const f of TEXT_FILES) {
    const t = read(f);
    assert.ok(!/primary prevention/i.test(t), f + ': primary prevention');
    assert.ok(!/calcium|\bCAC\b/i.test(t), f + ': calcium / CAC');
    assert.ok(!/4½|4\.5 years|four and a half/i.test(t), f + ': 4.5 years');
    assert.ok(!/30[–-]54|54 months/i.test(t), f + ': 30-54 months');
    assert.ok(!/40[–-]70|40 to 70|50[–-]70|50 to 70|aged 70|\b70 years\b/i.test(t), f + ': 40-70 / 50-70');
    assert.ok(!REMOVED_PERSON.test(t), f + ': removed person');
    assert.ok(!/CCTA/.test(t), f + ': CCTA');
  }
});

test('study text states the 36-48 month follow-up, the 10 mL sample and the free / not-paid wording', () => {
  const all = TEXT_FILES.map(read).join('\n');
  assert.ok(/at least 3 years and up to 4 years/.test(all));
  assert.ok(/36 to 48 months/.test(all));
  assert.ok(/about 2 teaspoons, 10 mL|about 2 teaspoons \(10 mL\)/.test(all));
  assert.ok(/the study does not pay for them/.test(all));
  assert.ok(/Study tests, the scan .{0,40}and study visits are free|study tests, the scan \(if allocated\) and study visits are free/i.test(all));
  assert.ok(/travel costs? .{0,40}reimbursed|Reasonable travel costs for study visits are reimbursed/i.test(all));
  assert.ok(/aged 40 or over/.test(all));
  assert.ok(/stage 3/.test(all));
  assert.ok(/a man before 55, a woman before 65/.test(all));
  assert.ok(/QRISK3/.test(all) && /CTCA/.test(all));
});

test('the whole repository has no mention of the removed person', () => {
  for (const f of [...TEXT_FILES, 'js/app.js', 'js/logic.js', 'js/api.js', 'js/config.js', 'README.md', 'index.html', 'package.json', 'sw.js']) {
    assert.ok(!REMOVED_PERSON.test(read(f)), f);
  }
});

test('the version is 0.2.1 everywhere it is shown', () => {
  assert.equal(JSON.parse(read('package.json')).version, '0.2.1');
  assert.match(read('js/config.js'), /APP_VERSION: '0\.2\.1'/);
  assert.match(read('sw.js'), /hriday-eoi-v0\.2\.1/);
});

test('aspirin for a non-cardiovascular reason does not exclude (16-Oct-2026)', () => {
  const t = read('js/data-study.js');
  assert.ok(/If you take aspirin for another reason, you can still take part/.test(t));
  assert.ok(!/aspirin-type tablets for another reason/.test(t));
});
