/*
 * Submission layer. In the demonstration build nothing leaves the device.
 * For live use set CONFIG.API_BASE to a server-side proxy that holds the REDCap API token and writes to the
 * "HRIDAY-CTCA EOI and pre-screening" project (OUT-002 §9). The REDCap token must never ship in this app.
 */
import { CONFIG } from './config.js';
import { classify } from './logic.js';

/** eoi_source code for this channel (1 = self-screening app/website; confirm against the REDCap data dictionary). */
export const SOURCE_CODE = 1;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Map the in-memory state to the REDCap field names and codes of OUT-002 §9.2. */
export function buildPayload(state) {
  const a = state.answers;
  const c = state.contact || {};
  const res = classify(a);
  const p = {
    eoi_source: SOURCE_CODE,
    eoi_campaign: state.campaign || '',
    eoi_lang_used: 'en',
    eoi_sex: a.eoi_sex, eoi_age: a.eoi_age,
    eoi_rf: a.eoi_rf, eoi_smoke: a.eoi_smoke, eoi_smokeless: a.eoi_smokeless, eoi_fh: a.eoi_fh,
    eoi_ckd_severe: a.eoi_ckd_severe,
    eoi_sym_cp: a.eoi_sym_cp, eoi_sym_sob: a.eoi_sym_sob, eoi_sym_syncope: a.eoi_sym_syncope, eoi_sym_claud: a.eoi_sym_claud,
    eoi_cvd: a.eoi_cvd, eoi_prior_test: a.eoi_prior_test, eoi_contrast: a.eoi_contrast,
    eoi_preg: a.eoi_preg, eoi_other_study: a.eoi_other_study,
    eoi_outcome: res.outcome, eoi_reason: [...res.reasons, ...res.review], eoi_msg_shown: res.message,
    eoi_flag_age70: res.flags.age70 ? 1 : 0,
    eoi_ack_random: state.ackRandom ? 1 : 0,
    eoi_contact_consent: state.contactConsent ? 1 : 0,
  };
  if (state.contactConsent) {
    const pinIsNumber = /^\d{6}$/.test(c.place || '');
    Object.assign(p, {
      eoi_privacy_ack: state.privacyAck ? 1 : 0,
      eoi_privacy_version: CONFIG.PRIVACY_NOTICE_VERSION,
      eoi_name: c.name, eoi_mobile: c.mobile, eoi_mobile_verified: c.verified ? 1 : 0,
      eoi_msg_ok: c.msgOk, eoi_alt_mobile: c.alt || '', eoi_email: c.email || '',
      eoi_pin: pinIsNumber ? c.place : '', eoi_town: pinIsNumber ? '' : c.place,
      eoi_pref_site: c.site, eoi_pref_lang: c.lang, eoi_pref_time: c.times || [],
      eoi_heard: c.heard, eoi_heard_other: c.heardOther || '',
      eoi_book_slot: c.bookSlot, eoi_slot_requested: c.bookSlot === 1 ? c.slot : '',
    });
  }
  return p;
}

/** Flatten checkbox arrays to REDCap's `field___code` = 1 columns, for the server-side proxy's import call. */
export function toRedcapRecord(payload) {
  const out = {};
  for (const [k, v] of Object.entries(payload)) {
    if (Array.isArray(v)) v.forEach((code) => { out[`${k}___${code}`] = 1; });
    else out[k] = v;
  }
  return out;
}

/** Returns { ref } on success; throws on failure. */
export async function submitEOI(state) {
  const payload = buildPayload(state);
  if (!CONFIG.API_BASE) {
    await wait(700);
    const ref = 'HR-' + String(Math.floor(Math.random() * 900000) + 100000);
    return { ref, demo: true, payload };
  }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(`${CONFIG.API_BASE}/eoi`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctl.signal,
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    return { ref: j.ref, demo: false, payload };
  } finally { clearTimeout(timer); }
}

export async function sendOtp(mobile) {
  if (!CONFIG.API_BASE) { await wait(400); return { ok: true }; }
  const r = await fetch(`${CONFIG.API_BASE}/otp/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile }) });
  return { ok: r.ok };
}

export async function verifyOtp(mobile, code) {
  if (!CONFIG.API_BASE) { await wait(300); return { ok: code === CONFIG.DEMO_OTP }; }
  const r = await fetch(`${CONFIG.API_BASE}/otp/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile, code }) });
  return { ok: r.ok };
}
