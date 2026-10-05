const fs = require('fs');
let content = fs.readFileSync('index.js', 'utf8');

const oldRouteStart = "app.post('/send-exam-alerts', async (req, res) => {\n  const { email, name, newExams } = req.body;\n  if (!email || !newExams || newExams.length === 0) return res.status(400).json({ error: 'Missing data' });";
const newRouteStart = "app.post('/send-exam-alerts', async (req, res) => {\n  const { email, name, newExams, mightBeEligibleExams } = req.body;\n  if (!email) return res.status(400).json({ error: 'Missing email' });\n  if ((!newExams || newExams.length === 0) && (!mightBeEligibleExams || mightBeEligibleExams.length === 0)) return res.status(400).json({ error: 'Missing data' });";

content = content.replace(oldRouteStart, newRouteStart);

const oldExamList = "const examListHtml = newExams.map(exam => `<div style='margin-bottom:16px;padding:12px;background:#f9f9f9;border-left:4px solid #000;'><h3 style='margin:0 0 4px;font-size:16px;color:#111;'>${exam.title || exam.examName}</h3><p style='margin:0;font-size:13px;color:#555;'>Deadline: ${exam.applicationEndDate || exam.importantDates?.applicationEndDate || 'N/A'}</p></div>`).join('');";
const newExamList = "const examListHtml = (newExams && newExams.length > 0) ? newExams.map(exam => `<div style='margin-bottom:16px;padding:12px;background:#f9f9f9;border-left:4px solid #000;'><h3 style='margin:0 0 4px;font-size:16px;color:#111;'>${exam.title || exam.examName}</h3><p style='margin:0;font-size:13px;color:#555;'>Deadline: ${exam.applicationEndDate || exam.importantDates?.applicationEndDate || 'N/A'}</p></div>`).join('') : '';\n    const maybeListHtml = (mightBeEligibleExams && mightBeEligibleExams.length > 0) ? mightBeEligibleExams.map(exam => `<div style='margin-bottom:16px;padding:12px;background:#fff8e1;border-left:4px solid #ffc107;'><h3 style='margin:0 0 4px;font-size:16px;color:#111;'>${exam.title || exam.examName}</h3><p style='margin:0;font-size:13px;color:#555;'>Deadline: ${exam.applicationEndDate || exam.importantDates?.applicationEndDate || 'N/A'}</p></div>`).join('') : '';";

content = content.replace(oldExamList, newExamList);

const oldMainContent = "<h1 style=\"font-size: 24px; font-weight: 800; color: #111111; margin: 0 0 16px;\">Good news, ${name || 'User'}!</h1>\n                    <p style=\"font-size: 15px; color: #555555; line-height: 1.6; margin: 0 0 24px;\">\n                      You are eligible for <strong>${newExams.length} new exams</strong> based on your MyPath profile:\n                    </p>\n                    \n                    ${examListHtml}";
const newMainContent = `<h1 style="font-size: 24px; font-weight: 800; color: #111111; margin: 0 0 16px;">Exam Update, \${name || 'User'}!</h1>
                    \${(newExams && newExams.length > 0) ? \`
                    <p style="font-size: 15px; color: #555555; line-height: 1.6; margin: 0 0 24px;">
                      You are eligible for <strong>\${newExams.length} new exams</strong> based on your MyPath profile:
                    </p>
                    \${examListHtml}
                    \` : ''}
                    
                    \${(mightBeEligibleExams && mightBeEligibleExams.length > 0) ? \`
                    <p style="font-size: 15px; color: #555555; line-height: 1.6; margin: 24px 0 16px; border-top: 1px solid #eee; padding-top: 24px;">
                      <strong>?? Action Required:</strong> We found <strong>\${mightBeEligibleExams.length} additional exams</strong> that might match your profile, but we couldn't verify the exact requirements. Please check these manually:
                    </p>
                    \${maybeListHtml}
                    \` : ''}`;

content = content.replace(oldMainContent, newMainContent);

const oldSubject = "subject: `You are eligible for ${newExams.length} new exam(s)!`";
const newSubject = "subject: `MyPath Exam Alert: ${((newExams?.length || 0) + (mightBeEligibleExams?.length || 0))} new exams found`";

content = content.replace(oldSubject, newSubject);

fs.writeFileSync('index.js', content, 'utf8');
console.log("Updated email template.");
