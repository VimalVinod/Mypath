'use strict';

require('dotenv').config();

const crypto = require('crypto');
const { db } = require('../services/validator/firebase-connector');
const { runPipeline } = require('./pipeline');
const { extractTargetedPdfText } = require('../services/pdf/pdf-extractor');
const { parseStructuredCriteria } = require('../services/ai/gemini-parser');

/**
 * Generates a stable, collision-free hash ID for an exam.
 * Uses SHA-256 so two different exam names always produce different IDs.
 * @param {string} input
 * @returns {string} 20-char URL-safe hash
 */
function generateHashId(input) {
  return crypto.createHash('sha256').update(input).digest('base64url').substring(0, 20);
}

/**
 * Calculates the age of a user given their date of birth string.
 * @param {string} dob - ISO date string e.g. "2000-09-16"
 * @returns {number} Age in years
 */
function calculateAge(dob) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

/**
 * Maps a user education level string to a numeric rank for comparison.
 */
function educationRank(level = '') {
  const l = level.toLowerCase();
  if (l.includes('phd') || l.includes('doctorate')) return 6;
  if (l.includes('pg') || l.includes('post') || l.includes('master')) return 5;
  if (l.includes('graduate') || l.includes('degree') || l.includes('bachelor') || l.includes('b.tech') || l.includes('b.e') || l.includes('ba') || l.includes('bsc') || l.includes('bcom')) return 4;
  if (l.includes('diploma')) return 3;
  if (l.includes('12') || l.includes('intermediate') || l.includes('higher secondary')) return 2;
  if (l.includes('10') || l.includes('matriculation') || l.includes('sslc')) return 1;
  return 0;
}

/**
 * Checks if a user meets the eligibility requirements of an exam.
 * @param {object} user - Firestore user document data
 * @param {object} eligibility - Extracted eligibility from Gemini: { minAge, maxAge, requiredEducation, ageRelaxation }
 * @returns {{ eligible: boolean, reason: string }}
 */
function checkEligibility(user, eligibility) {
  if (!eligibility) return { eligible: true, reason: 'No eligibility data — assuming eligible' };

  const userAge = calculateAge(user.dob);
  const userCategory = (user.category || 'General').toUpperCase();
  const userEducation = user.education || [];

  // --- Age Check ---
  if (eligibility.minAge && userAge !== null && userAge < eligibility.minAge) {
    return { eligible: false, reason: `Age ${userAge} is below minimum ${eligibility.minAge}` };
  }

  let effectiveMaxAge = eligibility.maxAge;

  // Apply relaxation for category
  if (effectiveMaxAge && eligibility.ageRelaxation && eligibility.ageRelaxation.length > 0) {
    for (const relaxation of eligibility.ageRelaxation) {
      const cat = (relaxation.category || '').toUpperCase();
      if (
        (userCategory === 'SC' && cat.includes('SC')) ||
        (userCategory === 'ST' && (cat.includes('ST') || cat.includes('SC'))) ||
        (userCategory === 'OBC-NCL' && cat.includes('OBC')) ||
        (userCategory === 'EWS' && cat.includes('EWS')) ||
        (user.isPwbd && cat.includes('PWBD')) ||
        (user.isExServiceman && cat.includes('EX'))
      ) {
        effectiveMaxAge += relaxation.years;
        break;
      }
    }
  }

  if (effectiveMaxAge && userAge !== null && userAge > effectiveMaxAge) {
    return { eligible: false, reason: `Age ${userAge} exceeds maximum ${effectiveMaxAge} (after relaxations)` };
  }

  // --- Education Check ---
  if (eligibility.requiredEducation && eligibility.requiredEducation.length > 0) {
    // Get highest education level the user has completed
    const userHighestRank = userEducation.length > 0
      ? Math.max(...userEducation.map(e => educationRank(e.level || '')))
      : 0;

    // Get minimum required rank from the exam's required education
    const requiredRanks = eligibility.requiredEducation.map(req => {
      const r = req.toLowerCase();
      if (r.includes('any degree') || r.includes('bachelor') || r.includes('graduate')) return 4;
      if (r.includes('post') || r.includes('master')) return 5;
      if (r.includes('diploma')) return 3;
      if (r.includes('12') || r.includes('intermediate')) return 2;
      if (r.includes('10') || r.includes('matric')) return 1;
      return 4; // Default to graduate if unclear
    });

    const minRequiredRank = Math.min(...requiredRanks);

    if (userHighestRank < minRequiredRank && userHighestRank > 0) {
      return { eligible: false, reason: `Education level insufficient for this exam` };
    }
  }

  return { eligible: true, reason: 'Meets all criteria' };
}

async function syncExamsAndMatch() {
  console.log('🚀 Starting real scraper pipeline...');
  const result = await runPipeline({ source: 'all', force: true });
  const exams = result.exams;

  if (exams.length === 0) {
    console.log('No exams found to sync.');
    return;
  }

  // --- AI GUARDRAIL 1: Scrape Verifier ---
  console.log(`\n🛡️  [AI Guardrail 1] Verifying ${exams.length} raw scraped records with Gemini...`);
  const { verifyScrapedExamsBatch, auditFinalExamLogic } = require('../services/ai/gemini-parser');
  const validExamIds = await verifyScrapedExamsBatch(exams);
  const validExams = exams.filter(e => validExamIds.includes(e.id || e.examName));

  if (validExams.length < exams.length) {
    console.log(`  🗑️   AI Filtered out ${exams.length - validExams.length} junk/advertisement records.`);
  } else {
    console.log(`  ✅  AI Verified: All ${exams.length} records are valid government exams.`);
  }

  if (validExams.length === 0) {
    console.log('No valid exams remained after AI filtration.');
    return;
  }

  console.log(`\n📋 Found ${validExams.length} valid exams. Enriching with AI eligibility data & uploading to Firestore...\n`);

  const enrichedExams = [];

  for (const exam of validExams) {
    const rawId = exam.id || exam.examName;
    const hashId = generateHashId(rawId);
    exam.hashId = hashId;

    let eligibility = null;

    // Try to extract eligibility from the official PDF notification
    const pdfUrl = exam.officialNotificationUrl;
    if (pdfUrl && pdfUrl.startsWith('http') && pdfUrl.endsWith('.pdf')) {
      try {
        console.log(`  🤖 Downloading & Gemini parsing PDF for: ${exam.examName}`);
        
        // Download PDF as buffer
        const response = await fetch(pdfUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        const pdfBuffer = Buffer.from(arrayBuffer);

        const extracted = await extractTargetedPdfText(pdfBuffer, {
          keywords: ['age', 'education', 'qualification', 'eligibility', 'relaxation', 'years'],
          mode: 'page'
        });
        // Use targetedText (full page content) — sentences array only returns keyword-matching lines
        const text = extracted.targetedText || (extracted.sentences || []).join(' ');
        if (text && text.length > 50) {
          const result = await parseStructuredCriteria(text);
          eligibility = result?.data?.eligibility || null;
          if (eligibility) {
            console.log(`     ✅ Extracted: Age ${eligibility.minAge}-${eligibility.maxAge}, Education: ${(eligibility.requiredEducation || []).join(', ') || 'Any'}`);
          }
        }
      } catch (err) {
        console.log(`     ⚠️  Could not parse PDF: ${err.message}`);
      }
    } else {
      console.log(`  ⏭️  No PDF URL for: ${exam.examName} — skipping Gemini parse`);
    }

    const examData = {
      ...exam,
      id: hashId,
      eligibility: eligibility,
      updatedAt: new Date().toISOString()
    };

    // --- AI GUARDRAIL 2: Pre-Database Auditor ---
    const audit = await auditFinalExamLogic(examData);
    if (!audit.isLogicallySound) {
      console.log(`     ❌ AI Auditor REJECTED record: ${audit.reason} (Skipping database upload)`);
      continue;
    }

    await db.collection('exams').doc(hashId).set(examData, { merge: true });
    console.log(`  ✅ Uploaded: ${exam.examName} (Hash: ${hashId})`);
    enrichedExams.push({ ...exam, eligibility });
  }

  console.log('\n👥 Running Real Eligibility Matcher for all Users...\n');

  const usersSnapshot = await db.collection('users').get();

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const userName = userData.name || userDoc.id;
    console.log(`  👤 Checking: ${userName} (Age: ${calculateAge(userData.dob)}, Category: ${userData.category}, Education entries: ${(userData.education || []).length})`);

    const eligibleHashes = [];
    const notEligibleReasons = [];

    for (const exam of enrichedExams) {
      const { eligible, reason } = checkEligibility(userData, exam.eligibility);
      if (eligible) {
        eligibleHashes.push(exam.hashId);
      } else {
        notEligibleReasons.push(`  ❌ ${exam.examName}: ${reason}`);
      }
    }

    await db.collection('users').doc(userDoc.id).set({
      eligibleExams: eligibleHashes
    }, { merge: true });

    console.log(`     ✓ Eligible for ${eligibleHashes.length}/${enrichedExams.length} exams`);
    if (notEligibleReasons.length > 0) {
      notEligibleReasons.forEach(r => console.log(r));
    }
  }

  console.log('\n🎉 Sync and Real Eligibility Matching Complete!');
  process.exit(0);
}

syncExamsAndMatch().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
