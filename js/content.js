/*
 * English master text — HRIDAY-CT-OUT-002 v0.1 §2.2–2.4 (questionnaire), §3.3 (messages E1–E7), §4.1 (short notice).
 * Wording is verbatim from the source document. Tokens such as {{HELPLINE}} are replaced from config.js.
 * Text marked  // UI  is interface wording that is not in the source documents and needs EC/CAG review with the rest.
 */
import { CALL_LANGUAGES } from './config.js';

/* ------------------------------------------------------------------ Questionnaire (OUT-002 §2.3) */
const YNS = [{ v: 1, label: 'Yes' }, { v: 0, label: 'No' }, { v: 2, label: 'Not sure' }];

export const QUESTIONS = {
  sex: {
    no: 'Q1', field: 'eoi_sex', type: 'single',
    text: 'Are you a man or a woman?',
    options: [{ v: 1, label: 'A man' }, { v: 2, label: 'A woman' }, { v: 3, label: 'I prefer to describe myself differently' }],
  },
  age: {
    no: 'Q2', field: 'eoi_age', type: 'age',
    text: 'How old are you? (completed years)',
    hint: 'Please type your age in years, for example 54.', // UI
  },
  rf: {
    no: 'Q3', field: 'eoi_rf', type: 'multi',
    text: 'Has a doctor ever told you that you have any of these, or do you take medicines for them? Tick all that apply.',
    options: [
      { v: 1, label: 'Diabetes (sugar)' },
      { v: 2, label: 'High blood pressure' },
      { v: 3, label: 'High cholesterol, or I take a cholesterol tablet (statin)' },
      { v: 4, label: 'Rheumatoid arthritis' },
      { v: 5, label: 'Lupus (SLE)' },
      { v: 6, label: 'Kidney disease (reduced kidney function)' },
      { v: 7, label: 'None of these' },
      { v: 8, label: "I don't know / I have never been checked" },
    ],
  },
  smoke: {
    no: 'Q4', field: 'eoi_smoke', type: 'single',
    text: 'Do you smoke cigarettes, bidis, hookah or any other tobacco that you light?',
    options: [
      { v: 1, label: 'Yes, currently' },
      { v: 2, label: 'I quit within the last 12 months' },
      { v: 3, label: 'I quit more than 12 months ago' },
      { v: 4, label: 'I have never smoked' },
    ],
  },
  smokeless: {
    no: 'Q4a', field: 'eoi_smokeless', type: 'single',
    text: 'Do you use chewing tobacco, gutka, khaini or similar?',
    options: [{ v: 1, label: 'Yes' }, { v: 0, label: 'No' }],
  },
  fh: {
    no: 'Q5', field: 'eoi_fh', type: 'single',
    text: 'Did your father, mother, brother, sister, son or daughter have a heart attack, a stent or bypass operation, a stroke, blocked leg arteries, or die suddenly of heart disease before the age of 60?',
    options: YNS,
  },
  ckd_severe: {
    no: 'Q6', field: 'eoi_ckd_severe', type: 'single',
    text: 'Are you on dialysis, or has a doctor told you that your kidney function is severely reduced (stage 4 or 5)?',
    options: YNS,
  },
  sym_cp: {
    no: 'Q7a', field: 'eoi_sym_cp', type: 'single',
    text: 'Do you get pain, pressure, tightness or heaviness in your chest when you walk fast, climb stairs or do heavy work?',
    options: YNS,
  },
  sym_sob: {
    no: 'Q7b', field: 'eoi_sym_sob', type: 'single',
    text: 'Do you get unusually breathless when you walk or climb stairs, compared with other people of your age?',
    options: YNS,
  },
  sym_syncope: {
    no: 'Q7c', field: 'eoi_sym_syncope', type: 'single',
    text: 'In the last 2 years, have you fainted, or nearly fainted (felt you were about to black out)?',
    options: YNS,
  },
  sym_claud: {
    no: 'Q7d', field: 'eoi_sym_claud', type: 'single',
    text: 'Do you get pain or cramping in your calves or legs when you walk, which goes away when you rest?',
    options: YNS,
  },
  cvd: {
    no: 'Q8', field: 'eoi_cvd', type: 'multi',
    text: 'Has a doctor ever told you that you have any of these? Tick all that apply.',
    options: [
      { v: 1, label: 'Heart attack' },
      { v: 2, label: 'Angina (chest pain from the heart)' },
      { v: 3, label: 'Stent or bypass operation' },
      { v: 4, label: "Narrowing or blockage of the heart's arteries seen on any test" },
      { v: 5, label: 'Stroke or mini-stroke (TIA)' },
      { v: 6, label: 'Operation or stent for a neck (carotid) artery' },
      { v: 7, label: 'Blocked arteries in the legs' },
      { v: 8, label: 'None of these' },
      { v: 9, label: 'Not sure' },
    ],
  },
  prior_test: {
    no: 'Q9', field: 'eoi_prior_test', type: 'single',
    text: "In the last 5 years, have you had any of these tests of the heart's arteries: a CT scan of the heart arteries (CT coronary angiography), a calcium score scan of the heart, or an angiogram done through a tube in the wrist or groin?",
    options: YNS,
  },
  contrast: {
    no: 'Q10', field: 'eoi_contrast', type: 'single',
    text: 'Have you ever had a serious allergic reaction — a rash all over, swelling of the face or throat, difficulty breathing, or needing emergency treatment — to the dye (contrast) used for a CT scan or X-ray test?',
    options: [{ v: 1, label: 'Yes' }, { v: 0, label: 'No' }, { v: 3, label: 'I have never had such a test' }, { v: 2, label: 'Not sure' }],
  },
  preg: {
    no: 'Q11', field: 'eoi_preg', type: 'single',
    text: 'Are you pregnant, possibly pregnant, or breastfeeding?',
    options: [{ v: 1, label: 'Yes' }, { v: 0, label: 'No' }, { v: 3, label: 'Not applicable to me' }],
  },
  other_study: {
    no: 'Q12', field: 'eoi_other_study', type: 'single',
    text: 'Are you currently taking part in another research study about the heart or blood vessels?',
    options: YNS,
  },
};

/* ------------------------------------------------------------------ Intro screen S0 (§2.2) */
export const INTRO = {
  title: 'HRIDAY-CTCA research study — can I take part?',
  paras: [
    'This takes about 3 minutes. We will ask about your age, health and symptoms to see whether you may be able to take part in a research study that compares two ways of preventing heart attacks and strokes: a heart CT scan or a risk score. A computer decides by chance which one each participant gets.',
    'This is not a medical check. We do not ask your name unless, at the end, you want the study team to contact you. Taking part in the study is voluntary.',
  ],
};

/* ------------------------------------------------------------------ Acknowledgement and contact screens (§2.4) */
export const ACK = {
  a1_lead: 'Before we go on, please tick to show you understand:',
  a1_text: 'In this study, a computer decides by chance which approach I would get. Half of the participants have a heart CT scan and half have a risk score. I cannot choose. Both groups get a health check, advice and, if recommended, medicines.',
  a1_check: 'I understand',
  a2_text: 'Would you like the study team to contact you to explain the study and, if you wish, arrange a first visit? Taking part is voluntary. You can say no now or at any time later.',
  a2_opts: [{ v: 1, label: 'Yes, please contact me' }, { v: 0, label: 'No, thank you' }],
  a3_title: 'How we use your details',
  a3_short:
    'The Translational Health Science and Technology Institute (THSTI), Faridabad, is responsible for your details. We will use your name, phone number and the answers you have given only to contact you about the HRIDAY-CTCA research study and to arrange a visit if you want one. The study team at the hospital you choose will see your details. We will not use them for anything else, and we will not share or sell them for marketing. If you do not join the study, we will delete your details within {{DELETION_DAYS}} days after our last contact with you. You can withdraw at any time, ask to see or correct your details, or complain: call {{HELPLINE}} or e-mail {{GRIEVANCE_EMAIL}}.',
  a3_check: 'I have read the privacy notice. I agree that THSTI and the study team at the hospital I choose may use my details to contact me about the HRIDAY-CTCA study.',
  a3_check_short: 'I agree',
  a3_read_full: 'Read the full notice',
};

export const CONTACT = {
  c1: 'Your name (as you would like us to address you)',
  c2: 'Your mobile number (10 digits). We will send a one-time code to check it.',
  c3: 'May we send you SMS or WhatsApp messages about your appointment?',
  c3_opts: [{ v: 1, label: 'SMS and WhatsApp' }, { v: 2, label: 'SMS only' }, { v: 3, label: 'No messages — please call only' }],
  c4: 'Another number we can reach you on (optional)',
  c5: 'E-mail (optional)',
  c6: 'Your PIN code (or town/district if you do not know it)',
  c7: 'Which hospital would you prefer? (The nearest participating hospitals are listed first.)',
  c8: 'Which language would you like us to use when we call and in written materials?',
  c9: 'When is a good time to call you? Tick all that apply.',
  c9_opts: [{ v: 1, label: 'Morning (9–12)' }, { v: 2, label: 'Afternoon (12–4)' }, { v: 3, label: 'Evening (4–7)' }, { v: 4, label: 'Weekends' }],
  c10: 'How did you hear about the study?',
  c10_opts: [
    'Poster or standee in hospital', 'Leaflet', 'Doctor or nurse at the hospital', 'HRIDAY desk', 'Family member or friend',
    'Community session or health camp', 'Employer or association', 'WhatsApp', 'Facebook or Instagram', 'YouTube',
    'X or LinkedIn', 'Newspaper, TV or radio', 'Internet search', 'Other',
  ].map((label, i) => ({ v: i + 1, label })),
  c10_other: 'Please tell us how (other)',
  c11: 'Would you like to choose a first-visit slot now? (You can also do this with the study team on the phone.)',
  c11_opts: [{ v: 1, label: 'Yes' }, { v: 0, label: 'Later' }],
  c12: 'Submit',
  languages: CALL_LANGUAGES.map(([v, label]) => ({ v, label })),
};

/* ------------------------------------------------------------------ Outcome messages (§3.3) */
export const MESSAGES = {
  E1: {
    title: 'Thank you. Based on your answers, you may be able to take part in the HRIDAY-CTCA research study.',
    paras: [
      'This is not a medical assessment. The study doctor will confirm whether you can take part after a check-up at the hospital.',
      'If you wish, the study team at a participating hospital can call you to explain the study and answer your questions. Taking part is voluntary. You can say no now, or at any time later.',
    ],
    flag70: 'You are 70, which is the upper age limit. If you would like to take part, please book soon.', // UI (from §3.2 edge case)
  },
  E2: {
    title: 'Thank you for your interest.',
    paras: [
      'This study includes men aged 40 to 70 and women aged 50 to 70. Based on your age, you cannot take part at present. This does not mean anything is wrong with your heart. Please keep having regular health checks — blood pressure, blood sugar and cholesterol — with your doctor.',
    ],
    women: 'Women become eligible at 50. If the study is still enrolling then, you would be welcome to check again.',
    more: 'To learn more about the study, or to share it with someone who may be interested:',
  },
  E3: {
    title: 'Thank you for your answers. Please read this carefully.',
    paras: [
      'Some of your answers describe symptoms — chest discomfort, breathlessness, fainting or leg pain on exertion — that should be checked by a doctor soon. This study is only for people who do not have such symptoms, so it is not suitable for you.',
      'Please see your doctor, or visit the nearest hospital, within the next few days and describe these symptoms. Take this message with you if it helps.',
    ],
    emergency: 'If you have chest pain now, or pain that lasts more than a few minutes, call {{EMERGENCY}} or go to the nearest emergency department immediately.',
    closing: 'This message is general advice, not a diagnosis. We have not saved any of your details.',
  },
  E4: {
    title: 'Thank you for your interest.',
    lead: 'Based on your answers, this study is not suitable for you.',
    reasons: {
      known_disease: 'The study is for people who have not been told that they have heart disease, a stroke or blocked arteries. Please continue your care with your own doctor, who can advise you about preventing further problems.',
      prior_test: "The study is for people who have not had a CT scan of the heart's arteries, a calcium score scan or an angiogram in the last 5 years. Please continue your care with your own doctor.",
      severe_kidney: 'The study includes a scan that uses a dye which can affect weak kidneys, so people with severe kidney disease or on dialysis cannot take part. Please continue your care with your kidney doctor.',
      contrast: 'The study includes a scan that uses a dye, so people who have had a serious reaction to such a dye cannot take part.',
      pregnancy: 'The study includes a scan with X-rays and a dye, so people who are pregnant or breastfeeding cannot take part at present. You are welcome to check again later while the study is enrolling.',
      no_risk_factor: 'The study is for people who have at least one of the risk factors we asked about. Based on your answers, you do not have any of them — which is good news. Please keep up regular health checks — blood pressure, blood sugar and cholesterol — with your doctor.',
    },
    closing: 'This does not mean anything is wrong with your heart. If you have any health concerns, please talk to your doctor. We have not saved any of your details. Thank you for your time.',
  },
  E5: {
    title: 'Thank you. We need a little more information.',
    paras: [
      'Some of your answers need to be discussed before we can tell whether you may be able to take part. If you agree, a member of the study team at a participating hospital will call you and ask a few more questions. This is not a medical assessment. Taking part is voluntary, and you can say no at any time.',
    ],
  },
  E6: {
    title: 'Thank you.',
    paras: [
      'We have not saved your name or contact details. Only anonymous counts of answers are kept, to help us plan the study. If you change your mind, you can come back here at any time, call the helpline {{HELPLINE}}, or ask at the HRIDAY desk at any participating hospital.',
    ],
  },
  E7: {
    title: 'Thank you, {{NAME}}. Your reference number is {{REF}}.',
    p1: 'The study team at {{HOSPITAL}} will call you from {{SITE_PHONE}} within 2 working days, at your preferred time where possible. You will now receive a message confirming this.',
    next_h: 'What happens next:',
    next: 'a short call (about 10 minutes) to confirm a few details and answer your questions; then, if you wish, a first visit at the hospital (about 2 hours; come fasting).',
    slot: 'Your provisional first-visit slot is {{SLOT}}; the team will confirm it by phone.',
    changed_h: 'Changed your mind?',
    changed: 'Reply STOP to our message, call {{HELPLINE}}, or use the link in the message to withdraw. We will then delete your details.',
    closing: 'This is a research study. Taking part is voluntary.',
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
  age_error: 'Please type your age as a whole number between 18 and 99.',
  name_error: 'Please type your name.',
  mobile_error: 'Please type a 10-digit mobile number.',
  alt_mobile_error: 'Please type a 10-digit number, or leave this empty.',
  email_error: 'Please check the e-mail address, or leave this empty.',
  pin_error: 'Please type a 6-digit PIN code, or your town or district.',
  select_error: 'Please choose from the list.',
  verify_error: 'The code does not match. Please try again.',
  otp_send_failed: 'We could not send the code just now. Please check the number and try again, or call {{HELPLINE}}.', // UI
  others_cleared: 'Your other choices were cleared because this answer cannot be combined with them.', // UI
  leave_unsent: 'Leave without sending', // UI
  verify_first: 'Please check your number with the code before going on.',
  send_code: 'Send me a code',
  code_label: 'Type the 6-digit code',
  code_sent: 'We have sent a code to {{MOBILE}}.',
  code_demo: 'Demonstration only: the code is {{CODE}}.',
  verified: 'Number checked.',
  verify: 'Check the code',
  change_number: 'Change number',
  slot_label: 'Choose a provisional slot',
  slot_demo_note: 'Demonstration slots. The real slots are published by the hospital.',
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
  home_cta_note: 'About 3 minutes. No name needed.',
  home_who: 'Who can take part?',
  home_who_list: [
    'Men aged 40 to 70, or women aged 50 to 70',
    'With at least one risk factor, such as diabetes, high blood pressure, high cholesterol or smoking',
    'With no heart symptoms and no known heart disease',
  ],
  home_how: 'How it works',
  home_how_list: [
    ['Check', 'Answer a few questions here, or by phone, or at the hospital desk.'],
    ['Talk', 'If you wish, the study team calls you to explain the study.'],
    ['Decide', 'You decide whether to join. You can say no at any time.'],
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
  eoi_summary: {
    name: 'Name', mobile: 'Mobile', msgs: 'Messages', alt: 'Other number', email: 'E-mail', place: 'PIN code or town',
    site: 'Hospital', lang: 'Language for calls', times: 'Good times to call', heard: 'Heard about the study', slot: 'First-visit slot',
    none: 'Not given', later: 'Later',
  },
  site_choose: 'Choose a hospital',
  lang_choose: 'Choose a language',
  rev_outcome: 'Reviewer panel',
  rev_payload: 'Record that would be sent (REDCap field names, OUT-002 §9.2)',
};

/* ------------------------------------------------------------------ Standard footer (OUT-001 §2.1) */
export const FOOTER =
  'HRIDAY-CTCA research study · Sponsor: Translational Health Science and Technology Institute (BRIC-THSTI), Faridabad · Participating hospital: {{HOSPITAL}} · Material {{MATERIAL_REF}} · Version {{MATERIAL_VERSION}} dated {{MATERIAL_DATE}} · Approved by {{EC_NAME}}, approval no. {{EC_NUMBER}}, dated {{EC_DATE}} · Registered with the Clinical Trials Registry – India: {{CTRI}} · This material may be used only in the form approved by the Ethics Committee.';
