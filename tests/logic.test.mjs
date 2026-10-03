// Run:  node --test tests/
// Verifies the eligibility engine against HRIDAY-CT-OUT-002 v0.1 §3.4 (cases 1–18 reproduced verbatim)
// plus extended cases covering every branch and every on-screen message (E1–E5, all six E4 variants),
// and an independent re-implementation (REDCap eoi_outcome_calc style) over randomised answer sets.
import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, visibleSteps, toggleRf, toggleCvd, ageSexOk, firstUnanswered, OUTCOME, REASON } from '../js/logic.js';

const clear = (over = {}) => ({
  eoi_sex: 1, eoi_age: 50, eoi_rf: [2], eoi_smoke: 4, eoi_smokeless: 0, eoi_fh: 0,
  eoi_sym_cp: 0, eoi_sym_sob: 0, eoi_sym_syncope: 0, eoi_sym_claud: 0,
  eoi_cvd: [8], eoi_prior_test: 0, eoi_contrast: 0, eoi_other_study: 0, ...over,
});
const M = 1, W = 2, X = 3;
const E = OUTCOME;

// [id, answers, outcome, message, e4 key]
const CASES = [
  // ---- OUT-002 §3.4 cases 1–18 (verbatim) ----
  [1, clear({ eoi_sex: M, eoi_age: 45, eoi_rf: [2] }), E.ELIGIBLE, 'E1', null],
  [2, clear({ eoi_sex: W, eoi_age: 47, eoi_rf: [1], eoi_preg: 0 }), E.NOT_ELIGIBLE, 'E2', null],
  [3, clear({ eoi_sex: M, eoi_age: 71, eoi_rf: [1] }), E.NOT_ELIGIBLE, 'E2', null],
  [4, clear({ eoi_sex: W, eoi_age: 55, eoi_rf: [3], eoi_sym_cp: 1, eoi_cvd: [1], eoi_preg: 0 }), E.NOT_ELIGIBLE, 'E3', null],
  [5, clear({ eoi_sex: M, eoi_age: 60, eoi_rf: [7], eoi_smoke: 1, eoi_prior_test: 1 }), E.NOT_ELIGIBLE, 'E4', 'prior_test'],
  [6, clear({ eoi_sex: W, eoi_age: 62, eoi_rf: [6], eoi_ckd_severe: 1, eoi_preg: 0 }), E.NOT_ELIGIBLE, 'E4', 'severe_kidney'],
  [7, clear({ eoi_sex: M, eoi_age: 50, eoi_rf: [7], eoi_smoke: 4, eoi_fh: 0 }), E.NOT_ELIGIBLE, 'E4', 'no_risk_factor'],
  [8, clear({ eoi_sex: M, eoi_age: 50, eoi_rf: [8], eoi_smoke: 4, eoi_fh: 0 }), E.REVIEW, 'E5', null],
  [9, clear({ eoi_sex: W, eoi_age: 66, eoi_rf: [4], eoi_sym_sob: 2, eoi_preg: 0 }), E.REVIEW, 'E5', null],
  [10, clear({ eoi_sex: M, eoi_age: 42, eoi_rf: [7], eoi_smoke: 2 }), E.ELIGIBLE, 'E1', null],
  [11, clear({ eoi_sex: W, eoi_age: 52, eoi_rf: [7], eoi_fh: 1, eoi_contrast: 2, eoi_preg: 0 }), E.REVIEW, 'E5', null],
  [12, clear({ eoi_sex: W, eoi_age: 51, eoi_rf: [1], eoi_preg: 1 }), E.NOT_ELIGIBLE, 'E4', 'pregnancy'],
  [13, clear({ eoi_sex: X, eoi_age: 55, eoi_rf: [2] }), E.REVIEW, 'E5', null],
  [14, clear({ eoi_sex: M, eoi_age: 70, eoi_rf: [3] }), E.ELIGIBLE, 'E1', null],
  [15, clear({ eoi_sex: M, eoi_age: 58, eoi_rf: [1], eoi_other_study: 1 }), E.REVIEW, 'E5', null],
  [16, clear({ eoi_sex: M, eoi_age: 65, eoi_rf: [2], eoi_cvd: [9] }), E.REVIEW, 'E5', null],
  [17, clear({ eoi_sex: M, eoi_age: 65, eoi_rf: [2], eoi_contrast: 3 }), E.ELIGIBLE, 'E1', null],
  [18, clear({ eoi_sex: W, eoi_age: 60, eoi_rf: [7], eoi_fh: 1, eoi_preg: 0 }), E.ELIGIBLE, 'E1', null],

  // ---- Extended: age/sex boundaries ----
  [19, clear({ eoi_sex: M, eoi_age: 39 }), E.NOT_ELIGIBLE, 'E2', null],
  [20, clear({ eoi_sex: M, eoi_age: 40 }), E.ELIGIBLE, 'E1', null],
  [21, clear({ eoi_sex: W, eoi_age: 49, eoi_preg: 0 }), E.NOT_ELIGIBLE, 'E2', null],
  [22, clear({ eoi_sex: W, eoi_age: 50, eoi_preg: 0 }), E.ELIGIBLE, 'E1', null],
  [23, clear({ eoi_sex: W, eoi_age: 70, eoi_preg: 3 }), E.ELIGIBLE, 'E1', null],
  [24, clear({ eoi_sex: W, eoi_age: 71, eoi_preg: 0 }), E.NOT_ELIGIBLE, 'E2', null],
  [25, clear({ eoi_sex: X, eoi_age: 39 }), E.REVIEW, 'E5', null],   // §9.2: option 3 is not age-gated; physician decides
  [26, clear({ eoi_sex: X, eoi_age: 71 }), E.REVIEW, 'E5', null],
  [27, clear({ eoi_sex: X, eoi_age: 45 }), E.REVIEW, 'E5', null],
  [28, clear({ eoi_sex: W, eoi_age: 40, eoi_preg: 0 }), E.NOT_ELIGIBLE, 'E2', null],

  // ---- Each symptom item, "yes" and "not sure" ----
  [29, clear({ eoi_sym_cp: 1 }), E.NOT_ELIGIBLE, 'E3', null],
  [30, clear({ eoi_sym_sob: 1 }), E.NOT_ELIGIBLE, 'E3', null],
  [31, clear({ eoi_sym_syncope: 1 }), E.NOT_ELIGIBLE, 'E3', null],
  [32, clear({ eoi_sym_claud: 1 }), E.NOT_ELIGIBLE, 'E3', null],
  [33, clear({ eoi_sym_cp: 2 }), E.REVIEW, 'E5', null],
  [34, clear({ eoi_sym_syncope: 2 }), E.REVIEW, 'E5', null],
  [35, clear({ eoi_sym_claud: 2 }), E.REVIEW, 'E5', null],
  [36, clear({ eoi_sym_cp: 1, eoi_sym_sob: 2 }), E.NOT_ELIGIBLE, 'E3', null],

  // ---- Known disease (Q8) ----
  [37, clear({ eoi_cvd: [1] }), E.NOT_ELIGIBLE, 'E4', 'known_disease'],
  [38, clear({ eoi_cvd: [5, 7] }), E.NOT_ELIGIBLE, 'E4', 'known_disease'],
  [39, clear({ eoi_cvd: [9] }), E.REVIEW, 'E5', null],
  [40, clear({ eoi_cvd: [4, 9] }), E.NOT_ELIGIBLE, 'E4', 'known_disease'],

  // ---- Precedence: symptoms > known disease > prior test > kidney > contrast > pregnancy > no risk factor ----
  [41, clear({ eoi_sym_cp: 1, eoi_prior_test: 1, eoi_contrast: 1 }), E.NOT_ELIGIBLE, 'E3', null],
  [42, clear({ eoi_cvd: [3], eoi_prior_test: 1, eoi_contrast: 1 }), E.NOT_ELIGIBLE, 'E4', 'known_disease'],
  [43, clear({ eoi_prior_test: 1, eoi_rf: [6], eoi_ckd_severe: 1, eoi_contrast: 1 }), E.NOT_ELIGIBLE, 'E4', 'prior_test'],
  [44, clear({ eoi_rf: [6], eoi_ckd_severe: 1, eoi_contrast: 1 }), E.NOT_ELIGIBLE, 'E4', 'severe_kidney'],
  [45, clear({ eoi_sex: W, eoi_contrast: 1, eoi_preg: 1 }), E.NOT_ELIGIBLE, 'E4', 'contrast'],
  [46, clear({ eoi_sex: W, eoi_rf: [7], eoi_preg: 1 }), E.NOT_ELIGIBLE, 'E4', 'pregnancy'],

  // ---- Contrast, prior test, other study, kidney ----
  [47, clear({ eoi_contrast: 1 }), E.NOT_ELIGIBLE, 'E4', 'contrast'],
  [48, clear({ eoi_prior_test: 2 }), E.REVIEW, 'E5', null],
  [49, clear({ eoi_other_study: 2 }), E.REVIEW, 'E5', null],
  [50, clear({ eoi_rf: [6], eoi_ckd_severe: 0 }), E.ELIGIBLE, 'E1', null],
  [51, clear({ eoi_rf: [6], eoi_ckd_severe: 2 }), E.REVIEW, 'E5', null],
  [52, clear({ eoi_sex: W, eoi_age: 55, eoi_rf: [6], eoi_ckd_severe: 0, eoi_preg: 3 }), E.ELIGIBLE, 'E1', null],

  // ---- Risk-factor logic ----
  [53, clear({ eoi_rf: [7], eoi_smoke: 1 }), E.ELIGIBLE, 'E1', null],
  [54, clear({ eoi_rf: [7], eoi_smoke: 3 }), E.NOT_ELIGIBLE, 'E4', 'no_risk_factor'],
  [55, clear({ eoi_rf: [7], eoi_smokeless: 1 }), E.NOT_ELIGIBLE, 'E4', 'no_risk_factor'],          // smokeless does not qualify
  [56, clear({ eoi_rf: [7], eoi_fh: 2 }), E.REVIEW, 'E5', null],
  [57, clear({ eoi_rf: [8], eoi_smoke: 1 }), E.ELIGIBLE, 'E1', null],                                // don't know + other risk factor
  [58, clear({ eoi_rf: [1, 8] }), E.ELIGIBLE, 'E1', null],
  [59, clear({ eoi_rf: [3] }), E.ELIGIBLE, 'E1', null],                                                // statin = risk factor, not exclusion
  [60, clear({ eoi_rf: [8], eoi_smoke: 3, eoi_fh: 2 }), E.REVIEW, 'E5', null],
  [61, clear({ eoi_rf: [7], eoi_smoke: 4, eoi_fh: 0, eoi_sym_cp: 2 }), E.NOT_ELIGIBLE, 'E4', 'no_risk_factor'], // §3.1: precedence 7 before review (8)
  [62, clear({ eoi_rf: [4, 5] }), E.ELIGIBLE, 'E1', null],
  [63, clear({ eoi_rf: [1], eoi_smoke: 3, eoi_fh: 2 }), E.ELIGIBLE, 'E1', null],                      // "not sure" FH but another risk factor present
  [64, clear({ eoi_sex: W, eoi_age: 60, eoi_rf: [7], eoi_fh: 1, eoi_preg: 3, eoi_other_study: 0 }), E.ELIGIBLE, 'E1', null],
];

test('cases 1–18 reproduce OUT-002 §3.4 exactly', () => {
  assert.equal(CASES.filter((c) => c[0] <= 18).length, 18);
});

for (const [id, ans, outcome, message, e4] of CASES) {
  test(`case ${id}`, () => {
    const r = classify(ans);
    assert.equal(r.outcome, outcome, `outcome (got ${r.outcome}, msg ${r.message})`);
    assert.equal(r.message, message, 'message');
    assert.equal(r.e4, e4, 'E4 variant');
  });
}

test('at least 40 cases, every message and every E4 variant covered', () => {
  assert.ok(CASES.length >= 40);
  const msgs = new Set(CASES.map((c) => c[3]));
  ['E1', 'E2', 'E3', 'E4', 'E5'].forEach((m) => assert.ok(msgs.has(m), m));
  const e4 = new Set(CASES.map((c) => c[4]).filter(Boolean));
  ['known_disease', 'prior_test', 'severe_kidney', 'contrast', 'pregnancy', 'no_risk_factor'].forEach((k) => assert.ok(e4.has(k), k));
});

test('all applicable not-eligible reasons are recorded, in precedence order', () => {
  const r = classify(clear({ eoi_sym_cp: 1, eoi_cvd: [1], eoi_prior_test: 1, eoi_rf: [6], eoi_ckd_severe: 1, eoi_contrast: 1 }));
  assert.deepEqual(r.reasons, [REASON.SYMPTOMS, REASON.KNOWN_DISEASE, REASON.PRIOR_TEST, REASON.SEVERE_KIDNEY, REASON.CONTRAST]);
  assert.equal(r.message, 'E3');
});

test('flags: age 70 and women 40–49', () => {
  assert.equal(classify(clear({ eoi_age: 70 })).flags.age70, true);
  assert.equal(classify(clear({ eoi_age: 69 })).flags.age70, false);
  assert.equal(classify(clear({ eoi_sex: W, eoi_age: 48 })).flags.womanUnder50, true);
  assert.equal(classify(clear({ eoi_sex: W, eoi_age: 50, eoi_preg: 0 })).flags.womanUnder50, false);
  assert.equal(classify(clear({ eoi_sex: M, eoi_age: 45 })).flags.womanUnder50, false);
});

test('exclusive-option rules (Q3 and Q8): 7/8 and 8/9 never combine with conditions or each other (§9.3)', () => {
  assert.deepEqual(toggleRf([1, 2], 7), [7]);
  assert.deepEqual(toggleRf([7], 1), [1]);
  assert.deepEqual(toggleRf([7], 8), [8]);
  assert.deepEqual(toggleRf([1], 8), [8]);
  assert.deepEqual(toggleRf([8], 2), [2]);
  assert.deepEqual(toggleRf([1, 2], 1), [2]);
  assert.deepEqual(toggleCvd([1, 5], 8), [8]);
  assert.deepEqual(toggleCvd([8], 3), [3]);
  assert.deepEqual(toggleCvd([1], 9), [9]);
  assert.deepEqual(toggleCvd([9], 8), [8]);
  assert.deepEqual(toggleCvd([9], 4), [4]);
});

test('FAIL CLOSED: missing/blank answers can never produce "potentially eligible" (audit C1)', () => {
  const full = clear({ eoi_sex: M, eoi_age: 50 });
  assert.equal(classify(full).outcome, E.ELIGIBLE);
  for (const k of ['eoi_sym_cp', 'eoi_sym_sob', 'eoi_sym_syncope', 'eoi_sym_claud', 'eoi_cvd', 'eoi_prior_test', 'eoi_contrast', 'eoi_other_study']) {
    const a = { ...full }; delete a[k];
    assert.notEqual(classify(a).outcome, E.ELIGIBLE, 'missing ' + k);
    const b = { ...full, [k]: null };
    assert.notEqual(classify(b).outcome, E.ELIGIBLE, 'null ' + k);
  }
  assert.notEqual(classify({ eoi_sex: M, eoi_age: 45, eoi_rf: [2] }).outcome, E.ELIGIBLE);
  assert.notEqual(classify({ ...full, eoi_cvd: [] }).outcome, E.ELIGIBLE);
  assert.notEqual(classify({ ...full, eoi_rf: [6] }).outcome, E.ELIGIBLE, 'kidney ticked, Q6 unanswered');
  assert.notEqual(classify({ ...full, eoi_sex: W, eoi_age: 55 }).outcome, E.ELIGIBLE, 'woman, Q11 unanswered');
  assert.equal(classify({ ...full, eoi_sex: W, eoi_age: 55, eoi_preg: 0 }).outcome, E.ELIGIBLE);
});

test('firstUnanswered finds the first missing step and returns null when complete', () => {
  assert.equal(firstUnanswered({ eoi_sex: M }), 'age');
  assert.equal(firstUnanswered({ eoi_sex: M, eoi_age: 50, eoi_rf: [2] }), 'smoke');
  assert.equal(firstUnanswered(clear()), null);
  assert.equal(firstUnanswered(clear({ eoi_rf: [6] })), 'ckd_severe');
  assert.equal(firstUnanswered(clear({ eoi_sex: W, eoi_age: 55 })), 'preg');
  assert.equal(firstUnanswered({ eoi_sex: M, eoi_age: 30 }), null); // questionnaire ends after Q2
});

test('questionnaire flow: ends after Q2 when age/sex fail; Q6 and pregnancy only when relevant', () => {
  assert.deepEqual(visibleSteps({ eoi_sex: M, eoi_age: 30 }), ['sex', 'age']);
  const base = visibleSteps({ eoi_sex: M, eoi_age: 50, eoi_rf: [2] });
  assert.ok(!base.includes('ckd_severe') && !base.includes('preg'));
  assert.ok(visibleSteps({ eoi_sex: M, eoi_age: 50, eoi_rf: [6] }).includes('ckd_severe'));
  assert.ok(visibleSteps({ eoi_sex: W, eoi_age: 55, eoi_rf: [2] }).includes('preg'));
  assert.ok(!visibleSteps({ eoi_sex: X, eoi_age: 55, eoi_rf: [2] }).includes('preg'), 'Q11 is for women only (§9.2)');
  assert.equal(visibleSteps({ eoi_sex: M, eoi_age: 50, eoi_rf: [2] }).length, 14);
});

test('ageSexOk rejects non-integers', () => {
  assert.equal(ageSexOk(M, 45.5), false);
  assert.equal(ageSexOk(M, NaN), false);
  assert.equal(ageSexOk(undefined, 50), false);
});

// ------------------------------------------------------------------------------------------------
// Independent cross-check: a second implementation written as nested conditionals in the style of the
// REDCap calculated field eoi_outcome_calc (returns 1, 2 or 3), compared on 200,000 random answer sets.
// ------------------------------------------------------------------------------------------------
function redcapStyle(a) {
  const ok = (a.eoi_sex === 1 && a.eoi_age >= 40 && a.eoi_age <= 70) ||
             (a.eoi_sex === 2 && a.eoi_age >= 50 && a.eoi_age <= 70);
  if (!ok && a.eoi_sex !== 3) return 2;
  if (a.eoi_sex === 3 && !(a.eoi_age >= 18 && a.eoi_age <= 99)) return 2;
  const rf = (c) => (a.eoi_rf || []).includes(c);
  const cv = (c) => (a.eoi_cvd || []).includes(c);
  const anyRf = rf(1) || rf(2) || rf(3) || rf(4) || rf(5) || rf(6) || a.eoi_smoke <= 2 || a.eoi_fh === 1;
  const sym1 = a.eoi_sym_cp === 1 || a.eoi_sym_sob === 1 || a.eoi_sym_syncope === 1 || a.eoi_sym_claud === 1;
  const cvd1 = cv(1) || cv(2) || cv(3) || cv(4) || cv(5) || cv(6) || cv(7);
  const noRf = rf(7) && !rf(1) && !rf(2) && !rf(3) && !rf(4) && !rf(5) && !rf(6) && !rf(8) &&
               a.eoi_smoke >= 3 && a.eoi_fh === 0;
  if (sym1 || cvd1 || a.eoi_prior_test === 1 || a.eoi_ckd_severe === 1 || a.eoi_contrast === 1 || a.eoi_preg === 1 || noRf) return 2;
  const unsure =
    a.eoi_sex === 3 ||
    (!anyRf && (rf(8) || a.eoi_fh === 2)) ||
    a.eoi_ckd_severe === 2 ||
    a.eoi_sym_cp === 2 || a.eoi_sym_sob === 2 || a.eoi_sym_syncope === 2 || a.eoi_sym_claud === 2 ||
    cv(9) || a.eoi_prior_test === 2 || a.eoi_contrast === 2 ||
    a.eoi_other_study === 1 || a.eoi_other_study === 2;
  if (unsure) return 3;
  return anyRf ? 1 : 3;
}

test('independent REDCap-style recalculation agrees on 200,000 random answer sets', () => {
  let seed = 20260914;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const subset = (items, noneCode, unsureCode) => {
    const r = rnd();
    if (r < 0.25) return [noneCode];
    if (r < 0.35 && unsureCode) return [unsureCode];
    const out = items.filter(() => rnd() < 0.25);
    return out.length ? out : [items[0]];
  };
  for (let i = 0; i < 200000; i++) {
    const a = {
      eoi_sex: pick([1, 2, 3]), eoi_age: 30 + Math.floor(rnd() * 50),
      eoi_rf: subset([1, 2, 3, 4, 5, 6], 7, 8), eoi_smoke: pick([1, 2, 3, 4]), eoi_smokeless: pick([0, 1]),
      eoi_fh: pick([0, 1, 2]),
      eoi_sym_cp: pick([0, 0, 0, 1, 2]), eoi_sym_sob: pick([0, 0, 0, 1, 2]), eoi_sym_syncope: pick([0, 0, 0, 1, 2]), eoi_sym_claud: pick([0, 0, 0, 1, 2]),
      eoi_cvd: subset([1, 2, 3, 4, 5, 6, 7], 8, 9), eoi_prior_test: pick([0, 0, 0, 1, 2]),
      eoi_contrast: pick([0, 0, 3, 1, 2]), eoi_other_study: pick([0, 0, 0, 1, 2]),
    };
    if (a.eoi_rf.includes(6)) a.eoi_ckd_severe = pick([0, 0, 1, 2]);
    if (a.eoi_sex === 2) a.eoi_preg = pick([0, 0, 1, 3]);
    const got = classify(a).outcome;
    const want = redcapStyle(a);
    assert.equal(got, want, JSON.stringify(a));
  }
});
