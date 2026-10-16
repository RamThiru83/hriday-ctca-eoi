/*
 * English master text (v0.2.0).
 * Questions, answer options and outcome messages follow the HRIDAY-CTCA decisions fact sheet of 16 Oct 2026
 * ("Common pre-screening question set"). Privacy-notice, consent and confirmation wording is carried over from
 * HRIDAY-CT-OUT-002 v0.1 where the fact sheet does not change it. Tokens such as {{HELPLINE}} are replaced from config.js.
 * Text marked  // UI  is interface wording that is not in the fact sheet or the source documents and needs EC/CAG review.
 */
import { CALL_LANGUAGES } from './config.js';

/* ------------------------------------------------------------------ Questionnaire (fact sheet: common pre-screening question set) */
export const QUESTIONS = {
  channel: {
    no: 'Q1', field: 'ps_channel', type: 'single',
    text: 'How did you hear about this study?',
    options: [
      { v: 1, label: 'Poster/flyer at a hospital or clinic' },
      { v: 2, label: 'My doctor referred me' },
      { v: 3, label: "Workplace, residents' association or community group" },
      { v: 4, label: 'Social media / WhatsApp' },
      { v: 5, label: 'Diagnostic laboratory' },
      { v: 6, label: 'Other' },
    ],
  },
  age: {
    no: 'Q2', field: 'ps_age', type: 'age',
    text: 'How old are you? (years)',
    hint: 'Please type your age in years, for example 54.', // UI
  },
  hd: {
    no: 'Q3', field: 'ps_hd', type: 'single',
    text: 'Has a doctor ever told you that you have heart disease or blocked arteries? For example: a heart attack, angina, a stent or bypass operation, a stroke or mini-stroke, or blocked arteries in the legs.',
    options: [{ v: 1, label: 'Yes' }, { v: 0, label: 'No' }, { v: 2, label: 'Not sure' }],
  },
  rf: {
    no: 'Q4', field: 'ps_rf', type: 'multi',
    text: 'Do any of these apply to you? Tick all that apply.',
    options: [
      { v: 1, label: 'I smoke now, or I stopped smoking in the last 12 months' },
      { v: 2, label: 'High blood pressure, or I take tablets for blood pressure' },
      { v: 3, label: 'High cholesterol' },
      { v: 4, label: 'Diabetes (high blood sugar)' },
      { v: 5, label: 'Kidney disease that a doctor has called moderate (stage 3)' },
      { v: 6, label: 'Rheumatoid arthritis or lupus (SLE)' },
      { v: 7, label: 'A parent, brother, sister or child had a heart attack, stroke or blocked arteries at a young age (a man before 55, a woman before 65)' },
      { v: 8, label: 'None of these' },
      { v: 9, label: 'Not sure' },
    ],
  },
};

/* ------------------------------------------------------------------ Intro screen */
export const INTRO = {
  title: 'HRIDAY-CTCA research study — can I take part?',
  paras: [
    'This takes about 2 minutes. We will ask your age, whether a doctor has told you that you have heart disease, and whether any common health problems apply to you. This is to see whether you may be able to take part in a research study that compares two ways of checking heart risk: a CT coronary angiography scan (CTCA) or a risk score (QRISK3). A computer decides by chance which one each participant gets.', // UI
    'This is not a medical check. We do not ask your name unless, at the end, you want the study team to contact you. Taking part in the study is voluntary.',
  ],
  emergency: 'If you have chest pain now, or pain that lasts more than a few minutes, call {{EMERGENCY}} or go to the nearest emergency department immediately.', // UI
};

/* ------------------------------------------------------------------ Disclaimer, consent and privacy notice (shown for outcomes 1 and 3 only) */
export const ACK = {
  disclaimer: 'This is not a medical check-up and does not tell you your heart risk.',
  a3_title: 'How we use your details',
  a3_short:
    'The Translational Health Science and Technology Institute (THSTI), Faridabad, is responsible for your details. We will use your name, phone number and the answers you have given only to contact you about the HRIDAY-CTCA research study and to arrange a visit if you want one. The study team at the hospital you choose will see your details. We will not use them for anything else, and we will not share or sell them for marketing. If you do not join the study, we will delete your details within {{DELETION_DAYS}} days after our last contact with you. You can withdraw at any time, ask to see or correct your details, or complain: call {{HELPLINE}} or e-mail {{GRIEVANCE_EMAIL}}.',
  a3_check: 'I have read the privacy notice. I agree that THSTI and the study team at the hospital I choose may use my details to contact me about the HRIDAY-CTCA study.',
  a3_read_full: 'Read the full notice',
};

export const CONTACT = {
  c1: 'Your name (as you would like us to address you)',
  c2: 'Your mobile number (10 digits). We will send a one-time code to check it.',
  c6: 'Your city or town',
  c7: 'Which hospital would you prefer?',
  c8: 'Which language would you like us to use when we call?',
  c9: 'When is a good time to call you? (optional)', // UI
  c9_none: 'No preference', // UI
  c9_opts: [{ v: 1, label: 'Morning (9–12)' }, { v: 2, label: 'Afternoon (12–4)' }, { v: 3, label: 'Evening (4–7)' }],
  c11: 'I would like to book a screening appointment',
  c11_hint: 'This is optional. The study team will also talk about this on the phone.', // UI
  languages: CALL_LANGUAGES.map(([v, label]) => ({ v, label })),
};

/* ------------------------------------------------------------------ Outcome messages */
export const MESSAGES = {
  eligible: {
    title: 'You may be able to take part.',
    paras: [
      'A study team member will call you to explain the study. A study doctor will make the final decision.',
      'Taking part is voluntary. You can say no now, or at any time later.',
    ],
  },
  review: {
    title: 'A study team member will call to check a few details.',
    paras: [
      'Some of your answers need a short check before we can say whether you may be able to take part. A study doctor will make the final decision.', // UI
      'Taking part is voluntary. You can say no now, or at any time later.',
    ],
  },
  not_eligible: {
    title: 'Thank you for your interest.',
    reasons: {
      age: 'This study is for people aged 40 or over, so you cannot take part at present. This does not mean anything is wrong with your heart.', // UI
      known_disease: 'The study is for people who have not been told that they have heart disease, a stroke or blocked arteries. Please continue your care with your own doctor, who can advise you about preventing further problems.',
      no_risk_factor: 'The study is for people who have at least one of the risk factors we asked about. Based on your answers, you do not have any of them — which is good news.',
    },
    closing: 'Please talk to your doctor about keeping your heart healthy, and keep up regular health checks — blood pressure, blood sugar and cholesterol. We have not saved any of your details. Thank you for your time.', // UI
    more: 'To learn more about the study, or to share it with someone who may be interested:',
  },
  end: {
    title: 'Thank you.',
    paras: [
      'We have not saved your name or contact details. Only anonymous counts of answers are kept, to help us plan the study. If you change your mind, you can come back here at any time, call the helpline {{HELPLINE}}, or ask at the HRIDAY desk at any participating hospital.',
    ],
  },
  done: {
    title: 'Thank you, {{NAME}}. Your reference number is {{REF}}.',
    p1: 'The study team at {{HOSPITAL}} will call you from {{SITE_PHONE}} within 2 working days, at your preferred time where possible.',
    next_h: 'What happens next:',
    next: 'a short call (about 10 minutes) to confirm a few details and answer your questions; then, if you wish, a first visit at the hospital (about 2 hours; come fasting).',
    appt: 'You asked to book a screening appointment. The team will arrange it with you on the phone.', // UI
    changed_h: 'Changed your mind?',
    changed: 'Call {{HELPLINE}} and tell the team. We will then delete your details.', // UI
    closing: 'This is a research study. Taking part is voluntary. A study doctor makes the final decision on whether you can take part.',
  },
};

/* ------------------------------------------------------------------ Interface text (UI — not in the source documents) */
export const UI = {
  brand: 'HRIDAY-CTCA',
  tagline: 'Heart research study',
  skip: 'Skip to main content',
  draftbar: 'Draft for review — not yet approved by an Ethics Committee.',
  demobar: 'Demonstration: nothing you enter is saved or sent.',
  nav: { home: 'Home', check: 'Check', about: 'About', faq: 'Questions', help: 'Help' },
  settings: 'Settings',
  settings_title: 'Make this easier to use',
  text_size: 'Text size',
  size_names: ['Normal', 'Large', 'Extra large'],
  contrast: 'High contrast',
  contrast_on: 'On', contrast_off: 'Off',
  language: 'Language',
  lang_pending: 'coming after certified translation',
  speak_toggle: 'Show “Listen” buttons',
  reviewer: 'Reviewer mode (shows how each answer was classified)',
  close: 'Close',
  start: 'Start',
  next: 'Next',
  back: 'Back',
  listen: 'Listen',
  stop_listening: 'Stop',
  leave: 'Leave the questions',
  restart: 'Start again',
  continue: 'Continue',
  no_thanks: 'No, thank you',
  privacy: 'Privacy notice',
  read_first: 'Read about the study first',
  choose_answer: 'Please choose an answer to go on.',
  choose_one_or_more: 'Please tick at least one answer, or choose “None of these”.',
  q_of: 'Question {{N}} of {{T}}',
  progress_label: 'Progress through the questions',
  encourage_mid: 'You are about halfway.',
  encourage_late: 'Nearly there.',
  tick_to_go_on: 'Please tick the box to go on.',
  age_error: 'Please type your age as a whole number between 18 and 110.',
  name_error: 'Please type your name.',
  mobile_error: 'Please type a 10-digit mobile number.',
  city_error: 'Please type your city or town.', // UI
  select_error: 'Please choose from the list.',
  verify_error: 'The code does not match. Please try again.',
  otp_send_failed: 'We could not send the code just now. Please check the number and try again, or call {{HELPLINE}}.', // UI
  others_cleared: 'Some of your other choices were cleared because “None of these” cannot be combined with other answers.', // UI
  leave_unsent: 'Leave without sending', // UI
  verify_first: 'Please check your number with the code before going on.',
  send_code: 'Send me a code',
  code_label: 'Type the 6-digit code',
  code_sent: 'We have sent a code to {{MOBILE}}.',
  code_demo: 'Demonstration only: the code is {{CODE}}.',
  verified: 'Number checked.',
  verify: 'Check the code',
  change_number: 'Change number',
  review_title: 'Please check your details',
  review_intro: 'Nothing is sent until you press the button below.',
  change: 'Change',
  submit_note: 'By sending, you agree that the study team may contact you, as described in the notice you accepted.',
  send_details: 'Send my details',
  sending: 'Sending…',
  send_failed: 'We could not send your details. Please check your connection and try again, or call {{HELPLINE}}.',
  home_title: 'Heart research study',
  home_lead: 'Could you take part? Answer a few simple questions to find out.',
  home_cta: 'Check if I can take part',
  home_cta_note: 'About 2 minutes. No name needed.', // UI
  home_who: 'Who can take part?',
  home_who_list: [
    'Aged 40 or over (there is no upper age limit)', // UI
    'With at least one risk factor, such as high blood pressure, high cholesterol, diabetes or smoking', // UI
    'With no heart symptoms and no known heart disease', // UI
  ],
  home_how: 'How it works',
  home_how_list: [
    ['Check', 'Answer a few questions here, or by phone, or at the hospital desk.'],
    ['Talk', 'If you wish, the study team calls you to explain the study.'],
    ['Decide', 'A study doctor makes the final decision. You decide whether to join. You can say no at any time.'], // UI
  ],
  home_research: 'This is research. Taking part is voluntary. Your usual care will not change if you say no.',
  contact_title: 'Prefer to talk to someone?',
  call_label: 'Call or give a missed call',
  desk_label: 'Ask at the HRIDAY desk',
  share: 'Share with someone',
  share_text: 'HRIDAY-CTCA heart research study — you may be able to take part.',
  copied: 'Link copied.',
  about_title: 'About the study',
  about_one: 'In one sentence',
  about_why: 'Why is this study being done?',
  about_who: 'Who can take part?',
  about_steps: 'What happens if I take part?',
  about_safety: 'Is it safe? What are my rights?',
  about_pi: 'Who is doing this study?',
  about_check_cta: 'Check if I can take part',
  faq_title: 'Questions and answers',
  faq_lead: 'Tap a question to open the answer.',
  help_title: 'Help and contact',
  help_privacy: 'Privacy notice',
  help_access: 'Accessibility',
  help_access_body: [
    'Text can be made larger and the colours made stronger from the Settings button at the top of every page.',
    'Each question has a Listen button that reads it aloud (where your phone or computer supports it).',
    'Everything on this site works with a keyboard and with a screen reader. There are no time limits.',
    'If you cannot use this site, call the helpline or ask at the HRIDAY desk: staff will go through the same questions with you, or read them aloud, and can complete the form for you.',
  ],
  help_reviewer: 'Notes for reviewers',
  not_a_medical_check: 'This is not a medical check.',
  where_data: 'What happens to my answers?',
  footer_label: 'Study information',
  privacy_title: 'Privacy notice',
  privacy_for: 'Version {{V}} dated {{D}}',
  notfound: 'That page was not found.',
  go_home: 'Go to the home page',
  summary: {
    name: 'Name', mobile: 'Mobile', city: 'City or town',
    site: 'Hospital', lang: 'Language for calls', time: 'Good time to call', appt: 'Screening appointment',
    none: 'Not given', yes: 'I would like to book one', no: 'Not asked for', // UI
  },
  site_choose: 'Choose a hospital',
  lang_choose: 'Choose a language',
  rev_outcome: 'Reviewer panel',
  rev_payload: 'Record that would be sent (REDCap field names)',
};

/* ------------------------------------------------------------------ Standard footer (OUT-001 §2.1) */
export const FOOTER =
  'HRIDAY-CTCA research study · Sponsor: Translational Health Science and Technology Institute (BRIC-THSTI), Faridabad · Participating hospital: {{HOSPITAL}} · Material {{MATERIAL_REF}} · Version {{MATERIAL_VERSION}} dated {{MATERIAL_DATE}} · Approved by {{EC_NAME}}, approval no. {{EC_NUMBER}}, dated {{EC_DATE}} · Registered with the Clinical Trials Registry – India: {{CTRI}} · This material may be used only in the form approved by the Ethics Committee.';
