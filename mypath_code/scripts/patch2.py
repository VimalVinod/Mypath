import sys
with open('backend-cronjob/src/scripts/sync-to-firebase.js', 'r', encoding='utf-8') as f:
    content = f.read()

import re
content = re.sub(
    r"if \(newlyEligibleExams\.length > 0.*?Failed to trigger email alert.*?}", 
    "if (newlyEligibleExams.length > 0 && userData.email && process.env.EMAIL_BACKEND_URL) {\n      console.log(`  ?? Triggering email alert for ${userName} (${newlyEligibleExams.length} new exams)`);\n      try {\n        const response = await fetch(`${process.env.EMAIL_BACKEND_URL}/send-exam-alerts`, {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({\n            email: userData.email,\n            name: userData.name || 'User',\n            newExams: newlyEligibleExams\n          })\n        });\n        if (!response.ok) throw new Error(`Email backend returned ${response.status}`);\n      } catch (err) {\n        console.error(`  ? Failed to trigger email alert:`, err.message);\n      }\n    }", 
    content, 
    flags=re.DOTALL
)

with open('backend-cronjob/src/scripts/sync-to-firebase.js', 'w', encoding='utf-8') as f:
    f.write(content)
