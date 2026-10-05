import sys
with open('backend-cronjob/src/scripts/sync-to-firebase.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''    const eligibleHashes = [];
    const notEligibleReasons = [];

    for (const exam of enrichedExams) {
      const { eligible, reason } = checkEligibility(userData, exam.eligibility);
      if (eligible) {
        eligibleHashes.push(exam.hashId);
      } else {
'''

replacement = '''    const eligibleHashes = [];
    const newlyEligibleExams = [];
    const notEligibleReasons = [];

    for (const exam of enrichedExams) {
      const { eligible, reason } = checkEligibility(userData, exam.eligibility);
      if (eligible) {
        eligibleHashes.push(exam.hashId);
        if (!userData.eligibleExams || !userData.eligibleExams.includes(exam.hashId)) {
          newlyEligibleExams.push(exam);
        }
      } else {
'''

if target in content:
    content = content.replace(target, replacement)
else:
    print('Target 1 not found')

target2 = '''    await db.collection('users').doc(userDoc.id).set({
      eligibleExams: eligibleHashes
    }, { merge: true });'''

replacement2 = '''    await db.collection('users').doc(userDoc.id).set({
      eligibleExams: eligibleHashes
    }, { merge: true });

    if (newlyEligibleExams.length > 0 && userData.email && process.env.EMAIL_BACKEND_URL) {
      console.log(  ?? Triggering email alert for  ( new exams));
      try {
        const response = await fetch(${process.env.EMAIL_BACKEND_URL}/send-exam-alerts, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userData.email,
            name: userData.name || 'User',
            newExams: newlyEligibleExams
          })
        });
        if (!response.ok) throw new Error(Email backend returned );
      } catch (err) {
        console.error(  ? Failed to trigger email alert:, err.message);
      }
    }'''

if target2 in content:
    content = content.replace(target2, replacement2.replace('', '').replace('', '').replace('', '').replace('', ''))
else:
    print('Target 2 not found')

with open('backend-cronjob/src/scripts/sync-to-firebase.js', 'w', encoding='utf-8') as f:
    f.write(content)
