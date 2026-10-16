/*
 * Submission layer. In the demonstration build nothing leaves the device.
 * For live use set CONFIG.API_BASE to a server-side proxy that holds the REDCap API token and writes to the
 * HRIDAY-CTCA pre-screening instrument in REDCap. The REDCap token must never ship in this app.
 * Only people classified "potentially eligible" (1) or "coordinator check needed" (3) who tick the consent box and give
 * contact details are ever submitted. Not-eligible answers are never sent or stored.
 */
import { CONFIG } from './config.js';
import { classify, OUTCOME, RF_CODES } from './logic.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Checkbox fields: REDCap needs one `field___code` column per option. */
export const CHECKBOX_FIELDS = Object.freeze({ ps_rf: RF_CODES });

/**
 * Map the in-memory state to the REDCap variable names and codes of the common pre-screening question set.
 * Throws if the answers are not outcome 1 or 3, or consent was not ticked (fail closed: nothing is built for anyone else).
 *   ps_campaign, ps_consent and ps_privacy_version are not in the fact sheet's field list: confirm names with the REDCap data manager.
 */
export function buildPayload(state) {
  const a = state.answers;
  const c = state.contact || {};
  const res = classify(a);
  if (res.outcome === OUTCOME.NOT_ELIGIBLE || res.incomplete || !state.consent) throw new Error('Contact details are collected only for outcomes 1 and 3, after consent.');
  return {
    ps_channel: a.ps_channel,
    ps_age: a.ps_age,
    ps_age_ok: res.ps_age_ok,
    ps_hd: a.ps_hd,
    ps_rf: a.ps_rf,
    ps_outcome: res.outcome,
    ps_campaign: state.campaign || '',
    ps_consent: 1,
    ps_privacy_version: CONFIG.PRIVACY_NOTICE_VERSION,
    ps_name: c.name,
    ps_mobile: c.mobile,
    ps_city: c.city,
    ps_site: c.site,
    ps_lang: c.lang,
    ps_calltime: c.calltime || '',
    ps_appt_request: c.appt ? 1 : 0,
  };
}

/** Flatten checkbox arrays to REDCap's `field___code` = 1/0 columns, for the server-side proxy's import call. */
export function toRedcapRecord(payload) {
  const out = {};
  for (const [k, v] of Object.entries(payload)) {
    if (Array.isArray(v) || CHECKBOX_FIELDS[k]) {
      const chosen = new Set(v || []);
      (CHECKBOX_FIELDS[k] || [...chosen]).forEach((code) => { out[`${k}___${code}`] = chosen.has(code) ? 1 : 0; });
    } else out[k] = v;
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
