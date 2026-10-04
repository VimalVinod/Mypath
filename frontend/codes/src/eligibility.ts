export function calculateAge(dob: string) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

export function educationRank(level = '') {
  const l = level.toLowerCase();
  if (l.includes('phd') || l.includes('doctorate')) return 6;
  if (l.includes('pg') || l.includes('post') || l.includes('master')) return 5;
  if (l.includes('graduate') || l.includes('degree') || l.includes('bachelor') || l.includes('b.tech') || l.includes('b.e') || l.includes('ba') || l.includes('bsc') || l.includes('bcom')) return 4;
  if (l.includes('diploma')) return 3;
  if (l.includes('12') || l.includes('intermediate') || l.includes('higher secondary')) return 2;
  if (l.includes('10') || l.includes('matriculation') || l.includes('sslc')) return 1;
  return 0;
}

export function checkEligibility(user: any, eligibility: any) {
  if (!eligibility || (!eligibility.minAge && !eligibility.maxAge && (!eligibility.requiredEducation || eligibility.requiredEducation.length === 0))) {
    const hasProfile = user.dob || (user.education && user.education.length > 0);
    if (!hasProfile) return { eligible: false, reason: 'Profile incomplete - cannot determine eligibility' };
    return { eligible: 'maybe', reason: 'Missing criteria - might be eligible' };
  }

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
    const userHighestRank = userEducation.length > 0
      ? Math.max(...userEducation.map((e: any) => educationRank(e.level || '')))
      : 0;

    const requiredRanks = eligibility.requiredEducation.map((req: string) => {
      const r = req.toLowerCase();
      if (r.includes('any degree') || r.includes('bachelor') || r.includes('graduate')) return 4;
      if (r.includes('post') || r.includes('master')) return 5;
      if (r.includes('diploma')) return 3;
      if (r.includes('12') || r.includes('intermediate')) return 2;
      if (r.includes('10') || r.includes('matric')) return 1;
      return 4;
    });

    const minRequiredRank = Math.min(...requiredRanks);

    if (userHighestRank < minRequiredRank && userHighestRank > 0) {
      return { eligible: false, reason: `Education level insufficient for this exam` };
    }
  }

  return { eligible: true, reason: 'Meets all criteria' };
}
