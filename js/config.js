/*
 * Deployment settings. Every unknown in the source documents is a bracketed placeholder ("[helpline number]"),
 * shown on screen with a dashed outline so reviewers can see exactly what is still to be filled in.
 * Replace a value with the real one and the outline disappears.
 */
export const CONFIG = {
  /** true = demonstration build: nothing is sent or stored; banner and reviewer tools are shown. Set false for live use. */
  DEMO: true,

  /** true = show the "draft for review, not EC-approved" banner. Set false only after EC approval of the final text. */
  DRAFT: true,

  /** Back-end endpoint (a server-side proxy to the REDCap EOI project — never put a REDCap API token in this app). */
  API_BASE: null,

  APP_VERSION: '0.1.0',
  SOURCE_DOCS: 'HRIDAY-CT-OUT-001 and OUT-002, v0.1 (14-Sep-2026), draft for review',
  PRIVACY_NOTICE_VERSION: '[x.x]',
  PRIVACY_NOTICE_DATE: '[DD-MMM-YYYY]',

  // Contact details and approvals (placeholders until confirmed)
  HELPLINE: '[helpline number]',
  HELPLINE_HOURS: '[days and times]',
  DESK: '[location, days and times]',
  PORTAL_URL: '[portal short URL]',
  EMERGENCY: '[108 / 112 — confirm local emergency number]',
  GRIEVANCE_NAME: '[Name, designation]',
  GRIEVANCE_EMAIL: '[grievance officer e-mail]',
  GRIEVANCE_PHONE: '[telephone]',
  GRIEVANCE_ADDRESS: '[address]',
  EC_NAME: '[name of Ethics Committee]',
  EC_NUMBER: '[number]',
  EC_DATE: '[DD-MMM-YYYY]',
  CTRI: '[CTRI/YYYY/MM/NNNNNN]',
  HOSPITAL: '[Hospital name, city]',
  MATERIAL_REF: '[OUT-002/portal]',
  MATERIAL_VERSION: '[x.x]',
  MATERIAL_DATE: '[DD-MMM-YYYY]',
  DELETION_DAYS: '[90]',
  REPLY_DAYS: '[the period set by law, or 30 days, whichever is shorter]',

  /** Demonstration one-time code (used only when DEMO is true). */
  DEMO_OTP: '123456',

  /** Active sites (OUT-002 §9.2, codes 01–20). Replace with the real list when sites are activated. */
  SITES: Array.from({ length: 20 }, (_, i) => {
    const code = String(i + 1).padStart(2, '0');
    return { code, name: `[Site ${code} — hospital name, city]`, phone: '[site telephone number]' };
  }),
};

/** Languages offered for the screen text. Only English is live; others appear once certified translations exist (OUT-001 §10). */
export const UI_LANGUAGES = [
  { code: 'en', label: 'English', live: true },
  { code: 'hi', label: 'हिन्दी (Hindi)', live: false },
];

/** Languages offered for the study team's calls and written materials (OUT-002 §9.2 codelist). */
export const CALL_LANGUAGES = [
  ['en', 'English'], ['hi', 'Hindi'], ['ta', 'Tamil'], ['te', 'Telugu'], ['kn', 'Kannada'], ['ml', 'Malayalam'],
  ['bn', 'Bengali'], ['as', 'Assamese'], ['kha', 'Khasi'], ['ur', 'Urdu'], ['pa', 'Punjabi'], ['99', 'Other'],
];
