# HRIDAY-CTCA — Expression of Interest and Pre-screening (DRAFT v0.2.0)

A mobile-first, elderly- and disability-friendly website where people can check, in about 2 minutes, whether they may be able to take part in the HRIDAY-CTCA trial, and leave their contact details if they wish.

**Status: draft for review. Demonstration build: nothing is sent anywhere.** Bracketed items (helpline, EC number, CTRI, sites, etc.) are placeholders in `js/config.js` and show with a dashed outline.

v0.2.0 reduces the pre-screening to the "Common pre-screening question set" of the HRIDAY-CTCA decisions fact sheet (16 Oct 2026, minutes of Oct 2026). The web app and the REDCap instrument must match exactly, so every key in the code is the REDCap variable name. Wording that is not in the fact sheet is marked `// UI` in the source files and needs Ethics Committee approval before use.

## Questions (one per screen)
| Variable | Question | Codes |
|---|---|---|
| `ps_channel` | How did you hear about this study? | 1 poster/flyer · 2 my doctor referred me · 3 workplace, residents' association or community group · 4 social media / WhatsApp · 5 diagnostic laboratory · 6 other. Recorded only; never affects the outcome |
| `ps_age` | How old are you? (years) | integer 18–110; `ps_age_ok` = 1 if 40 or over (no upper limit) |
| `ps_hd` | Has a doctor ever told you that you have heart disease or blocked arteries? (examples given) | 1 yes · 0 no · 2 not sure |
| `ps_rf` | Do any of these apply to you? Tick all that apply. | checkbox 1 smoker (now or stopped in last 12 months) · 2 high BP or BP tablets · 3 high cholesterol · 4 diabetes · 5 kidney disease stage 3 · 6 rheumatoid arthritis or lupus · 7 close relative with early heart disease (man < 55, woman < 65) · 8 none of these (exclusive) · 9 not sure |

There is no sex question, and no questions on symptoms, previous tests, contrast, pregnancy, tobacco, other studies or detailed history: the coordinator and the site cardiologist check those at screening.

## Rules (`js/logic.js`, `ps_outcome`)
1. Age missing or not a whole number 18–110: outcome 3 (incomplete, fail closed).
2. Age under 40: **2 not eligible**, reason 1 (age). The questionnaire stops.
3. `ps_hd` = Yes: **2 not eligible**, reason 2 (known disease). Nothing more is asked.
4. Any other missing or invalid answer (including 8 combined with another option): **3**, incomplete (fail closed).
5. `ps_rf` = 8 only: **2 not eligible**, reason 3 (no risk factor), also when `ps_hd` = Not sure (interpretation: a person with no risk factor cannot qualify however "not sure" is resolved).
6. `ps_hd` = No and at least one of 1–7: **1 potentially eligible**.
7. Otherwise (`ps_hd` = Not sure, or 9 without any of 1–7): **3 coordinator check needed**.

Missing answers never give outcome 1. Final eligibility is always decided by a study doctor.

## After the result
Outcomes 1 and 3 only: a short disclaimer ("This is not a medical check-up and does not tell you your heart risk."), one consent tick with the privacy notice (DPDP Act 2023), then contact details in three screens: `ps_name`, `ps_mobile` (one-time code; demo code `123456`), `ps_city`, `ps_site`, `ps_lang`, optional `ps_calltime`, optional `ps_appt_request`. Outcome 2 gets a polite message by reason and a reminder to see their doctor; no contact details are collected and nothing is sent. The coordinator calls within 2 working days.

Payload fields that are **not** in the fact sheet and need confirming with the REDCap data manager: `ps_campaign` (the `?c=` link code), `ps_consent`, `ps_privacy_version`, and the `ps_calltime` codes (1 morning, 2 afternoon, 3 evening).

## Run locally
    npm run serve        # python3 -m http.server 8080, then open http://localhost:8080
    npm test             # 47 unit tests of the eligibility engine, payload and text checks

Browser tests (Playwright and axe-core, not part of `npm test`): serve the site, then from `tests/e2e` run `python3 test_flows.py` and `python3 test_a11y.py` with `BASE`, `AXE_JS` (path to `axe.min.js`) and `SHOTS` set as needed.

No build step. Plain ES modules, installable as a PWA.

## How it is organised
- `js/logic.js`: eligibility engine, pure functions, fail-closed.
- `js/content.js`, `js/data-*.js`: all participant-facing wording.
- `js/config.js`: flags (`DEMO`, `DRAFT`, `API_BASE`), version and placeholders.
- `js/api.js`: payload using REDCap field names; `toRedcapRecord()` writes `ps_rf___1` to `ps_rf___9` as 1/0. Demo mode returns a fake reference.
- `js/a11y.js`: text size, high contrast, read-aloud.
- Reviewer mode (Settings) shows the classification, reasons, answers and payload for UAT.

## Accessibility
Atkinson Hyperlegible font, text up to 200%, high-contrast mode, 56px touch targets, one question per screen, read-aloud, keyboard and screen-reader support. Checked with axe-core (WCAG 2.x A and AA plus best practice) on every screen at normal, large and high-contrast settings: 0 violations.

## Privacy
Nothing is stored; only display preferences are kept on the device. Answers are wiped when the person leaves or finishes. Contact details are collected only for outcomes 1 and 3, after the outcome, a short disclaimer, a consent tick and the privacy notice (DPDP).

## Going live (not done yet)
1. Build a small server-side proxy (`API_BASE`) with `/eoi`, `/otp/send`, `/otp/verify`. **The REDCap API token must live only on the server.** Use `toRedcapRecord()` in `js/api.js` for the `ps_rf` checkbox field.
2. Real SMS OTP, set `DEMO: false`, `DRAFT: false`, remove `noindex`.
3. Fill placeholders; get EC approval of all wording; certified translations (Hindi and others).
4. Anonymous counts and pictograms (pending the community advisory group) are not implemented.

## Converting to iOS and Android
Wrap with Capacitor: `npm i @capacitor/core @capacitor/cli`, `npx cap init`, set `webDir` to this folder, `npx cap add ios android`, then `npx cap sync`. Replace Web Speech with the native text-to-speech plugin and add the store privacy declarations.

## Licence
Atkinson Hyperlegible font: SIL OFL. Project code and text: to be set by the trial sponsor.
