# HRIDAY-CTCA — Expression of Interest and Self-Screening (DRAFT v0.1)

A mobile-first, elderly- and disability-friendly website where people can check, in about 3 minutes, whether they may be able to take part in the HRIDAY-CTCA trial, and leave their contact details if they wish.

**Status: draft for review. Demonstration build: nothing is sent anywhere.** Bracketed items (helpline, EC number, CTRI, sites, etc.) are placeholders in `js/config.js` and show with a dashed outline.

Source: HRIDAY-CTCA dossier v0.1, OUT-002 (EOI and Self-Screening Toolkit) and OUT-001 (Recruitment Materials Pack). Wording is imported verbatim from those documents; wording not in the source is marked `// UI` in `js/content.js` and needs Ethics Committee approval before use.

## Run locally
    npm run serve        # python3 -m http.server 8080, then open http://localhost:8080
    npm test             # 74 unit tests of the eligibility engine

No build step. Plain ES modules, installable as a PWA.

## How it is organised
- `js/logic.js`: eligibility engine (OUT-002 §3.1/3.2), pure functions, fail-closed (missing answers never become "eligible").
- `js/content.js`, `js/data-*.js`: all participant-facing wording.
- `js/config.js`: flags (`DEMO`, `DRAFT`, `API_BASE`) and placeholders.
- `js/api.js`: payload using REDCap field names (OUT-002 §9.2). Demo mode returns a fake reference.
- `js/a11y.js`: text size, high contrast, read-aloud.
- Reviewer mode (Settings) shows the classification, reasons and payload for UAT.

## Accessibility
Atkinson Hyperlegible font, text up to 200%, high-contrast mode, 56px touch targets, one question per screen, read-aloud, keyboard and screen-reader support. Checked with axe-core (WCAG 2.1 AA): 0 violations.

## Privacy
Nothing is stored; only display preferences are kept on the device. Answers are wiped when the person leaves or finishes. Contact details are collected only after the outcome, a consent tick and the privacy notice (DPDP).

## Going live (not done yet)
1. Build a small server-side proxy (`API_BASE`) with `/eoi`, `/otp/send`, `/otp/verify`. **The REDCap API token must live only on the server.** Use `toRedcapRecord()` in `js/api.js` for checkbox fields.
2. Real SMS OTP, set `DEMO: false`, `DRAFT: false`, remove `noindex`.
3. Fill placeholders; get EC approval of all wording; certified translations (Hindi and others).
4. Anonymous counts and pictograms (pending the community advisory group) are not implemented.

## Converting to iOS and Android
Wrap with Capacitor: `npm i @capacitor/core @capacitor/cli`, `npx cap init`, set `webDir` to this folder, `npx cap add ios android`, then `npx cap sync`. Replace Web Speech with the native text-to-speech plugin and add the store privacy declarations.

## Licence
Atkinson Hyperlegible font: SIL OFL. Project code and text: to be set by the trial sponsor.
