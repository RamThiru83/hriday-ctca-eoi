// Participant-facing study text (English). v0.2.0: updated to the HRIDAY-CTCA decisions fact sheet of 16 Oct 2026
// (aged 40 or over with no upper limit; risk-factor list; CTCA or QRISK3; follow-up 36–48 months; biobank sample).
// Wording kept from the OUT-001 v0.1 master unless changed for the fact sheet; new or reworded lines are marked "// UI"
// and need Ethics Committee review. Keep the "who" array shape (app.js splits it on "You cannot take part").
export const STUDY = {
 "desc": {
  "One sentence": "HRIDAY-CTCA is a research study that compares two ways of checking heart risk in people who have no heart symptoms: a CT coronary angiography scan (CTCA) or a risk score (QRISK3).", // UI
  "Three sentences": "Doctors usually check heart risk with a risk score worked out from age, blood pressure, cholesterol, diabetes and other details. Another way is a CT coronary angiography scan (CTCA), which shows whether there are fatty deposits in the heart's arteries. We do not know which way works better, so the HRIDAY-CTCA study compares them in people aged 40 or over who have at least one risk factor but no heart symptoms.", // UI
  "Chance allocation": "A computer decides by chance, like tossing a coin, which of the two approaches each person gets. Half of the people in the study have the CTCA scan; the other half have the risk score (QRISK3). Neither you nor your doctor can choose. Both groups are equally important for the study.", // UI
  "Eligibility block": "You may be able to take part if you are aged 40 or over (there is no upper age limit) and you have at least one of these: you smoke, or stopped smoking in the last 12 months; high blood pressure, or you take tablets for blood pressure; high cholesterol; diabetes; kidney disease that a doctor has called moderate (stage 3); rheumatoid arthritis or lupus (SLE); or a parent, brother, sister or child who had a heart attack, stroke or blocked arteries at a young age (a man before 55, a woman before 65). Taking a cholesterol tablet (statin) on its own does not count as a risk factor. You must have no heart symptoms and no known heart disease. A study doctor makes the final decision.", // UI
  "What participation involves": "A first visit at the hospital with a health check and blood tests. If you agree, we also take one extra small blood sample (about 2 teaspoons, 10 mL) and store it for future research. Then, depending on your group, a CTCA scan within four weeks or a risk score. A visit to discuss your result, with advice on a healthy lifestyle and, if the study plan recommends it, a cholesterol tablet and in some cases low-dose aspirin. Follow-up for at least 3 years and up to 4 years (36 to 48 months), mostly by telephone, with three visits to the hospital. Study tests, the scan (for those allocated to it) and study visits are free. Medicines recommended by the study are prescribed to you and obtained through the hospital pharmacy; the study does not pay for them. Reasonable travel costs for study visits are reimbursed.", // UI
  "Voluntariness statement": "This is research. Taking part is your choice. You can leave the study at any time without giving a reason. Your usual medical care will not change whether or not you take part.",
  "Contact block": "Ask at the HRIDAY desk: [location, days and times]. Call or give a missed call: [helpline number, days and times]. Check whether you may be able to take part at [portal short URL] or scan the QR code."
 },
 "why": [
  "Heart attacks and strokes are common in India, and they often happen at a younger age than in other countries. Medicines such as cholesterol tablets (statins) can lower the risk. But who is most at risk, and who should take them?", // UI
  "Today, doctors mostly use a risk score. One widely used score is called QRISK3. It is worked out from your age, sex, blood pressure, cholesterol, diabetes, smoking and other details. It estimates your chance of a heart attack or stroke in the next 10 years.", // UI
  "Another way is a CT coronary angiography scan (CTCA). It takes pictures of the heart's arteries and shows whether there are fatty deposits (plaque) in them. Medicines and advice are then guided by what the scan shows.", // UI
  "We do not know which way works better. The scan might help doctors find the right people to treat. But it also uses X-rays and a dye, costs money, and may lead to more tests. The only fair way to find out is to compare the two ways in a large study. That is what HRIDAY-CTCA does, in about 10,000 people at 20 hospitals across India." // UI
 ],
 "who": [
  "You may be able to take part if you are aged 40 or over (there is no upper age limit) and you have at least one of these:", // UI
  "• You smoke, or you stopped smoking in the last 12 months", // UI
  "• High blood pressure, or you take tablets for blood pressure", // UI
  "• High cholesterol (taking a cholesterol tablet, a statin, is not enough on its own)", // UI
  "• Diabetes (high blood sugar)", // UI
  "• Kidney disease that a doctor has called moderate (stage 3)", // UI
  "• Rheumatoid arthritis or lupus (SLE)", // UI
  "• A parent, brother, sister or child who had a heart attack, stroke or blocked arteries at a young age (a man before 55, a woman before 65)", // UI
  "You cannot take part if you:",
  "• Get chest pain, pressure or breathlessness when you walk or climb stairs, or have fainted, or get leg pain on walking — please see a doctor about these",
  "• Already have heart disease, a stroke, or blocked arteries",
  "• Have had a heart CT scan or an angiogram in the last 5 years", // UI
  "• Have severe kidney disease, a serious allergy to CT dye, an overactive thyroid that is not under control, or are pregnant or breastfeeding", // UI
  "• Need blood-thinning medicines or aspirin-type tablets for another reason, or have been told you cannot take a statin", // UI
  "• Have an irregular heartbeat or a body weight that would stop the scan from giving a clear picture", // UI
  "A study doctor makes the final decision after a check-up." // UI
 ],
 "steps": [
  "1. Information and consent. We explain the study and answer your questions. You can take the information home and talk to your family. If you decide to join, you sign a consent form.",
  "2. First visit (about 2 hours, come fasting). Blood pressure, weight, an ECG (heart tracing) and blood tests. A study doctor asks about your health. If you agree, we also take one extra small blood sample (about 2 teaspoons, 10 mL) and store it for future research. You can say no to this and still take part.", // UI
  "3. Your group is decided by chance. A computer decides, like tossing a coin. Half of the people have the CTCA scan; half have the risk score (QRISK3). Nobody can choose.", // UI
  "4. Scan or score. If you are in the scan group, you have the CTCA scan within 4 weeks, at the hospital or a partner centre near you. If you are in the risk-score group, your score is worked out from your first visit.", // UI
  "5. Results visit. A study doctor explains your result and gives you a letter for you and your own doctor. Everyone gets advice on food, activity, tobacco and weight. If the study plan recommends it, the study doctor prescribes a cholesterol tablet, and in some cases low-dose aspirin. You obtain these through the hospital pharmacy; the study does not pay for them. If a scan shows a serious narrowing, you will be referred to a heart specialist.", // UI
  "6. Follow-up for at least 3 years and up to 4 years. We contact you every 6 months, mostly by phone or the study app. That is 36 to 48 months in all. You visit the hospital three more times (at 6 months, 2 years and at the end). Travel costs for study visits are reimbursed." // UI
 ],
 "safety": [
  "The CTCA scan uses X-rays. The dose is small — about the same as the natural radiation everyone receives from the environment over one to two years. A dye is given through a vein; mild reactions such as itching are uncommon and serious reactions are rare. The scan team is trained to treat them. We check your kidneys first. You may get a tablet to slow your heart and a spray under the tongue so the pictures are clear.", // UI
  "The medicines recommended in the study are well-known, approved medicines. Cholesterol tablets can cause muscle aches in some people. Aspirin slightly increases the chance of bleeding. The study doctor will discuss this with you.",
  "Sometimes the scan shows something outside the heart (for example, in the lungs). If so, we will tell you and help you get it checked through the hospital.",
  "Your rights. Taking part is voluntary. You can leave at any time without giving a reason, and your usual care will not change. Your information is kept confidential and you are identified by a study number. If you are harmed because of the study, you will receive free medical care and compensation according to the rules of the Indian Council of Medical Research. The study is insured. It has been approved by the Ethics Committee named below."
 ],
 "back": [
  "Want to know more, or think you may be able to take part?",
  "Ask at the HRIDAY desk: [location, days and times]",
  "Call or give a missed call: [helpline number, days and times]",
  "Check in 2 minutes at [portal short URL] or scan the QR code [QR code]", // UI
  "You are welcome to pass this leaflet to someone who may be interested.",
  "Who is doing this study? The study is led by Prof. Ganesan Karthikeyan, Principal Investigator, and is sponsored by the Translational Health Science and Technology Institute (THSTI), Faridabad, an institute of the Department of Biotechnology, Government of India, which also funds the study. [Hospital name] is one of 20 participating hospitals. Study doctor at this hospital: [Site PI name and designation].",
  "[Standard footer — Section 2.1]"
 ]
};
