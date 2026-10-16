/*
 * HRIDAY-CTCA pre-screening — eligibility engine (v0.2.0)
 * Implements the "Common pre-screening question set" of the HRIDAY-CTCA decisions fact sheet (16 Oct 2026).
 * The web app and the REDCap instrument must match exactly, so every key below is the REDCap variable name.
 * Pure functions: no DOM, no I/O, no storage.
 *
 *   ps_channel  1 poster/flyer at a hospital or clinic · 2 my doctor referred me · 3 workplace, residents' association
 *               or community group · 4 social media / WhatsApp · 5 diagnostic laboratory · 6 other
 *               (recorded only; it NEVER affects the outcome)
 *   ps_age      integer 18–110. ps_age_ok = 1 if age >= 40 (no upper age limit; the same for every sex and gender)
 *   ps_hd       1 yes · 0 no · 2 not sure       ("Has a doctor ever told you that you have heart disease or blocked arteries?")
 *   ps_rf       checkbox, array of codes 1–9:
 *                 1 smokes now / stopped in the last 12 months   2 high blood pressure (or BP tablets)
 *                 3 high cholesterol                              4 diabetes
 *                 5 kidney disease stage 3                        6 rheumatoid arthritis or lupus (SLE)
 *                 7 close family member with early heart disease (man < 55, woman < 65)
 *                 8 none of these (EXCLUSIVE: cannot be combined with any other option)
 *                 9 not sure
 *               Any of 1–7 = a risk factor is present. Option 9 may be ticked together with 1–7.
 *   ps_outcome  1 potentially eligible · 2 not eligible · 3 coordinator check needed
 *
 * Rules (precedence, first match wins):
 *   1. age is not a whole number 18–110            -> 3 (incomplete; fail closed, never "eligible")
 *   2. age < 40                                    -> 2, reason 1 (age). The questionnaire stops here.
 *   3. ps_hd = 1 (yes)                             -> 2, reason 2 (known disease). Nothing further is asked. Reason 3 is also
 *                                                     recorded if ps_rf happens to be "none of these" only.
 *   4. ps_hd missing/invalid, or ps_rf missing/invalid
 *      (empty, unknown code, or 8 combined with any other code)
 *                                                  -> 3 (incomplete; fail closed)
 *   5. ps_rf = [8] only                            -> 2, reason 3 (no risk factor). Applies also when ps_hd = 2, because a person
 *                                                     with no risk factor cannot qualify however "not sure" is resolved.
 *   6. ps_hd = 0 and any of 1–7                    -> 1 potentially eligible
 *   7. everything else (ps_hd = 2, or ps_rf has 9 and no 1–7) -> 3 coordinator check needed
 *
 * Final eligibility is always decided by a study doctor (site cardiologist / investigator), never by this tool.
 */

export const OUTCOME = Object.freeze({ ELIGIBLE: 1, NOT_ELIGIBLE: 2, REVIEW: 3 });

/** Not-eligible reason codes (fact sheet: "reason 1 age", "reason 2 known disease", "reason 3 no risk factor"). */
export const REASON = Object.freeze({ AGE: 1, KNOWN_DISEASE: 2, NO_RISK_FACTOR: 3 });

/** Why a "coordinator check needed" outcome was reached. App-side labels for reviewers; not REDCap codes. */
export const REVIEW_REASON = Object.freeze({ HD_NOT_SURE: 1, RF_NOT_SURE: 2, INCOMPLETE: 3 });

export const AGE_MIN_VALID = 18;
export const AGE_MAX_VALID = 110;
export const AGE_THRESHOLD = 40;

export const RF_CODES = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9]);
export const RF_QUALIFYING = Object.freeze([1, 2, 3, 4, 5, 6, 7]);
export const RF_NONE = 8;
export const RF_NOT_SURE = 9;

/** True for a whole number within the REDCap validation range 18–110. Strings and decimals are rejected (fail closed). */
export function ageValid(age) {
  return typeof age === 'number' && Number.isInteger(age) && age >= AGE_MIN_VALID && age <= AGE_MAX_VALID;
}

/** ps_age_ok: 1 if age >= 40, 0 if a valid age under 40, null if the age is missing or invalid. No upper limit. */
export function ageOk(age) {
  if (!ageValid(age)) return null;
  return age >= AGE_THRESHOLD ? 1 : 0;
}

/** ps_hd is valid only as 1, 0 or 2. */
export const hdValid = (v) => v === 0 || v === 1 || v === 2;

/**
 * Normalise a ps_rf answer: returns a sorted array of unique codes, or null if it is missing or invalid
 * (not an array, empty, a code outside 1–9, or 8 ("none of these") combined with any other option).
 */
export function normaliseRf(rf) {
  if (!Array.isArray(rf) || rf.length === 0) return null;
  if (!rf.every((c) => Number.isInteger(c) && c >= 1 && c <= 9)) return null;
  const set = [...new Set(rf)].sort((a, b) => a - b);
  if (set.includes(RF_NONE) && set.length > 1) return null;
  return set;
}

/** True when at least one of options 1–7 is ticked. Options 8 and 9 never count as a risk factor. */
export function riskFactorPresent(rf) {
  return Array.isArray(rf) && rf.some((c) => RF_QUALIFYING.includes(c));
}

/**
 * Classify a set of answers.
 * @param {{ps_channel?:number, ps_age?:number, ps_hd?:number, ps_rf?:number[]}} a  ps_channel is ignored on purpose.
 * @returns {{outcome:number, ps_age_ok:(0|1|null), reasons:number[], review:number[], incomplete:boolean}}
 */
export function classify(a = {}) {
  const ps_age_ok = ageOk(a.ps_age);
  const out = (outcome, extra = {}) => ({ outcome, ps_age_ok, reasons: [], review: [], incomplete: false, ...extra });
  const incomplete = () => out(OUTCOME.REVIEW, { review: [REVIEW_REASON.INCOMPLETE], incomplete: true });

  // 1. Age missing or outside 18–110: cannot decide. Fail closed.
  if (ps_age_ok === null) return incomplete();

  // 2. Under 40: stop.
  if (ps_age_ok === 0) return out(OUTCOME.NOT_ELIGIBLE, { reasons: [REASON.AGE] });

  const rf = normaliseRf(a.ps_rf);

  // 3. Known heart disease: not eligible, whatever else was (or was not) answered.
  if (a.ps_hd === 1) {
    const reasons = [REASON.KNOWN_DISEASE];
    if (rf && rf.length === 1 && rf[0] === RF_NONE) reasons.push(REASON.NO_RISK_FACTOR);
    return out(OUTCOME.NOT_ELIGIBLE, { reasons });
  }

  // 4. Any missing or invalid answer: fail closed.
  if (!hdValid(a.ps_hd) || rf === null) return incomplete();

  // 5. "None of these" only: no risk factor.
  if (rf.length === 1 && rf[0] === RF_NONE) return out(OUTCOME.NOT_ELIGIBLE, { reasons: [REASON.NO_RISK_FACTOR] });

  // 6. No known heart disease and at least one risk factor.
  const hasRf = riskFactorPresent(rf);
  if (a.ps_hd === 0 && hasRf) return out(OUTCOME.ELIGIBLE);

  // 7. Not sure about heart disease and/or about risk factors.
  const review = [];
  if (a.ps_hd === 2) review.push(REVIEW_REASON.HD_NOT_SURE);
  if (!hasRf && rf.includes(RF_NOT_SURE)) review.push(REVIEW_REASON.RF_NOT_SURE);
  return out(OUTCOME.REVIEW, { review });
}

/**
 * Which questions are shown, given the answers so far (used by the UI and the tests).
 * channel, age; then, only if age is 40 or over (or not yet answered), hd; then rf unless the person has said Yes to hd.
 */
export function visibleSteps(a = {}) {
  const steps = ['channel', 'age'];
  if (ageOk(a.ps_age) === 0) return steps; // under 40: the questionnaire ends after the age question
  steps.push('hd');
  if (a.ps_hd !== 1) steps.push('rf'); // Yes to known heart disease: not eligible, nothing more is asked
  return steps;
}

/**
 * Checkbox behaviour for ps_rf. "None of these" (8) is exclusive: choosing it clears every other option, and choosing any
 * other option clears it. "Not sure" (9) may be ticked together with 1–7.
 * Returns the new sorted selection.
 */
export function toggleRf(current, code) {
  const set = new Set(current);
  if (set.has(code)) { set.delete(code); return [...set].sort((x, y) => x - y); }
  if (code === RF_NONE) return [RF_NONE];
  set.delete(RF_NONE);
  set.add(code);
  return [...set].sort((x, y) => x - y);
}

/** The first visible question whose answer is still missing, or null. Stops anyone reaching a result with a gap. */
export function firstUnanswered(a = {}) {
  const field = { channel: 'ps_channel', age: 'ps_age', hd: 'ps_hd', rf: 'ps_rf' };
  for (const id of visibleSteps(a)) {
    const v = a[field[id]];
    if (v === undefined || v === null || (Array.isArray(v) && v.length === 0)) return id;
  }
  return null;
}
