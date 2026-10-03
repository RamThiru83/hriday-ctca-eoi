/*
 * HRIDAY-CTCA self-screening — eligibility engine
 * Implements HRIDAY-CT-OUT-002 v0.1, Section 3.1 (classification rules) and 3.2 (edge cases).
 * Pure functions, no DOM, no I/O. Answer keys and codes follow the REDCap field list (OUT-002 §9.2).
 *
 *   eoi_sex        1 man · 2 woman · 3 prefer to describe differently
 *   eoi_age        integer 18–99
 *   eoi_rf         array of 1 diabetes · 2 high BP · 3 high cholesterol/statin · 4 RA · 5 SLE · 6 kidney disease
 *                   · 7 none of these · 8 don't know / never checked
 *   eoi_smoke      1 current · 2 quit ≤12 months · 3 quit >12 months · 4 never
 *   eoi_smokeless  1 yes · 0 no                      (recorded only)
 *   eoi_fh         1 yes · 0 no · 2 not sure
 *   eoi_ckd_severe 1 yes · 0 no · 2 not sure         (asked only if eoi_rf includes 6)
 *   eoi_sym_cp / eoi_sym_sob / eoi_sym_syncope / eoi_sym_claud   1 yes · 0 no · 2 not sure
 *   eoi_cvd        array of 1–7 conditions · 8 none · 9 not sure
 *   eoi_prior_test 1 yes · 0 no · 2 not sure
 *   eoi_contrast   1 yes · 0 no · 3 never had such a test · 2 not sure
 *   eoi_preg       1 yes · 0 no · 3 not applicable    (asked of women only, §9.2)
 *   eoi_other_study 1 yes · 0 no · 2 not sure
 */

export const OUTCOME = Object.freeze({ ELIGIBLE: 1, NOT_ELIGIBLE: 2, REVIEW: 3 });

/** Reason codes — same list as REDCap eoi_reason (§9.2). */
export const REASON = Object.freeze({
  AGE_SEX: 1, SYMPTOMS: 2, KNOWN_DISEASE: 3, PRIOR_TEST: 4, SEVERE_KIDNEY: 5,
  CONTRAST: 6, PREGNANCY: 7, NO_RISK_FACTOR: 8, UNCERTAIN: 9, SEX_UNSPECIFIED: 10, OTHER_STUDY: 11,
});

/** Message key shown for each not-eligible reason in the E4 block (OUT-002 §3.3). */
export const E4_KEY = Object.freeze({
  [REASON.KNOWN_DISEASE]: 'known_disease',
  [REASON.PRIOR_TEST]: 'prior_test',
  [REASON.SEVERE_KIDNEY]: 'severe_kidney',
  [REASON.CONTRAST]: 'contrast',
  [REASON.PREGNANCY]: 'pregnancy',
  [REASON.NO_RISK_FACTOR]: 'no_risk_factor',
});

const has = (arr, code) => Array.isArray(arr) && arr.includes(code);

/** Age/sex criterion (Inclusion 1). "Describe differently" is not age-gated here: it always continues and is routed
 *  to clinician review (§3.1; §9.2 branching `eoi_age_ok = 1 or eoi_sex = 3`), where the physician applies the sex-specific range. */
export function ageSexOk(sex, age) {
  const a = Number(age);
  if (!Number.isInteger(a)) return false;
  if (sex === 1) return a >= 40 && a <= 70;
  if (sex === 2) return a >= 50 && a <= 70;
  if (sex === 3) return a >= 18 && a <= 99;
  return false;
}

/** True when a risk factor from Q3, Q4 or Q5 is present (Inclusion 2). Q4a is never counted. */
export function riskFactorPresent(a) {
  const rf = a.eoi_rf || [];
  return [1, 2, 3, 4, 5, 6].some((c) => rf.includes(c)) || a.eoi_smoke === 1 || a.eoi_smoke === 2 || a.eoi_fh === 1;
}

/**
 * Classify a set of answers.
 * If the age/sex check fails, the other answers are not needed (the questionnaire stops after Q2).
 * @returns {{outcome:number, message:string, e4:string|null, reasons:number[], review:number[],
 *            flags:{age70:boolean, womanUnder50:boolean}}}
 */
export function classify(a) {
  const flags = {
    age70: Number(a.eoi_age) === 70,
    womanUnder50: a.eoi_sex === 2 && Number(a.eoi_age) >= 40 && Number(a.eoi_age) < 50,
  };

  if (!ageSexOk(a.eoi_sex, a.eoi_age)) {
    return { outcome: OUTCOME.NOT_ELIGIBLE, message: 'E2', e4: null, reasons: [REASON.AGE_SEX], review: [], flags };
  }

  const rf = a.eoi_rf || [];
  const cvd = a.eoi_cvd || [];
  const sx = [a.eoi_sym_cp, a.eoi_sym_sob, a.eoi_sym_syncope, a.eoi_sym_claud];

  // ---- Not-eligible reasons, in precedence order (all that apply are recorded) ----
  const reasons = [];
  if (sx.some((v) => v === 1)) reasons.push(REASON.SYMPTOMS);
  if ([1, 2, 3, 4, 5, 6, 7].some((c) => cvd.includes(c))) reasons.push(REASON.KNOWN_DISEASE);
  if (a.eoi_prior_test === 1) reasons.push(REASON.PRIOR_TEST);
  if (a.eoi_ckd_severe === 1) reasons.push(REASON.SEVERE_KIDNEY);
  if (a.eoi_contrast === 1) reasons.push(REASON.CONTRAST);
  if (a.eoi_preg === 1) reasons.push(REASON.PREGNANCY);

  // "No risk factor": Q3 = None only, Q4 = quit >12 months or never, Q5 = No (no don't-know/not-sure on Q3 or Q5)
  const noRiskFactor =
    rf.length === 1 && rf[0] === 7 && (a.eoi_smoke === 3 || a.eoi_smoke === 4) && a.eoi_fh === 0;
  if (noRiskFactor) reasons.push(REASON.NO_RISK_FACTOR);

  if (reasons.length > 0) {
    const first = reasons[0];
    const message = first === REASON.SYMPTOMS ? 'E3' : 'E4';
    return { outcome: OUTCOME.NOT_ELIGIBLE, message, e4: E4_KEY[first] || null, reasons, review: [], flags };
  }

  // ---- Clinician review ----
  const review = [];
  const rfPresent = riskFactorPresent(a);
  if (a.eoi_sex === 3) review.push(REASON.SEX_UNSPECIFIED);
  if (!rfPresent && (has(rf, 8) || a.eoi_fh === 2)) review.push(REASON.UNCERTAIN);
  if (a.eoi_ckd_severe === 2) review.push(REASON.UNCERTAIN);
  if (sx.some((v) => v === 2)) review.push(REASON.UNCERTAIN);
  if (has(cvd, 9)) review.push(REASON.UNCERTAIN);
  if (a.eoi_prior_test === 2) review.push(REASON.UNCERTAIN);
  if (a.eoi_contrast === 2) review.push(REASON.UNCERTAIN);
  if (a.eoi_other_study === 1 || a.eoi_other_study === 2) review.push(REASON.OTHER_STUDY);

  if (review.length > 0) {
    return { outcome: OUTCOME.REVIEW, message: 'E5', e4: null, reasons: [], review: [...new Set(review)], flags };
  }

  // ---- Potentially eligible: every condition of §3.1 row 9 must be positively answered. Missing answers never
  //      count as "No": an incomplete answer set is routed to review (fail closed), never to eligible. ----
  const complete =
    rfPresent &&
    sx.every((v) => v === 0) &&
    cvd.length === 1 && cvd[0] === 8 &&
    a.eoi_prior_test === 0 &&
    (a.eoi_contrast === 0 || a.eoi_contrast === 3) &&
    (a.eoi_sex !== 2 || a.eoi_preg === 0 || a.eoi_preg === 3) &&
    a.eoi_other_study === 0 &&
    (!has(rf, 6) || a.eoi_ckd_severe === 0) &&
    a.eoi_sex !== 3;
  if (!complete) {
    return { outcome: OUTCOME.REVIEW, message: 'E5', e4: null, reasons: [], review: [REASON.UNCERTAIN], flags, incomplete: true };
  }
  return { outcome: OUTCOME.ELIGIBLE, message: 'E1', e4: null, reasons: [], review: [], flags };
}

/** Which questions are shown, given the answers so far. Used by the UI and by the tests. */
export function visibleSteps(a) {
  const steps = ['sex', 'age'];
  if (a.eoi_sex && a.eoi_age != null && !ageSexOk(a.eoi_sex, a.eoi_age)) return steps; // ends after Q2
  steps.push('rf', 'smoke', 'smokeless', 'fh');
  if (has(a.eoi_rf, 6)) steps.push('ckd_severe');
  steps.push('sym_cp', 'sym_sob', 'sym_syncope', 'sym_claud', 'cvd', 'prior_test', 'contrast');
  if (a.eoi_sex === 2) steps.push('preg');
  steps.push('other_study');
  return steps;
}

/** Q3 exclusive options (§9.2/§9.3): "None of these" (7) and "I don't know" (8) cannot be combined with conditions 1–6 or with each other. */
export function toggleRf(current, code) {
  const set = new Set(current);
  if (set.has(code)) { set.delete(code); return [...set]; }
  if (code === 7 || code === 8) return [code];
  set.delete(7); set.delete(8); set.add(code);
  return [...set];
}

/** Q8 exclusive options: "None of these" (8) and "Not sure" (9) cannot be combined with conditions 1–7 or with each other. */
export function toggleCvd(current, code) {
  const set = new Set(current);
  if (set.has(code)) { set.delete(code); return [...set]; }
  if (code === 8 || code === 9) return [code];
  set.delete(8); set.delete(9); set.add(code);
  return [...set];
}

/** Steps whose answer is still missing (used to stop anyone reaching a result, or submitting, with unanswered questions). */
export function firstUnanswered(a) {
  const map = {
    sex: 'eoi_sex', age: 'eoi_age', rf: 'eoi_rf', smoke: 'eoi_smoke', smokeless: 'eoi_smokeless', fh: 'eoi_fh',
    ckd_severe: 'eoi_ckd_severe', sym_cp: 'eoi_sym_cp', sym_sob: 'eoi_sym_sob', sym_syncope: 'eoi_sym_syncope',
    sym_claud: 'eoi_sym_claud', cvd: 'eoi_cvd', prior_test: 'eoi_prior_test', contrast: 'eoi_contrast',
    preg: 'eoi_preg', other_study: 'eoi_other_study',
  };
  for (const id of visibleSteps(a)) {
    const v = a[map[id]];
    if (v === undefined || v === null || (Array.isArray(v) && v.length === 0)) return id;
  }
  return null;
}
