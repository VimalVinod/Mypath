'use strict';

/**
 * fixtures/generate-sample-pdf.js
 * Programmatic generator for realistic multi-page civil service recruitment notification.
 * Uses pdf-lib to produce fixtures/sample-notification.pdf.
 */

const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

// Canonical benchmark data used across M1 (tests), M2 (Gemini), and M3 (Unity validation)
const NOTIFICATION_DATA = {
  organization: 'UNION PUBLIC SERVICE COMMISSION',
  noticeNumber: '04/2026-CSP',
  examTitle: 'COMBINED CIVIL SERVICES EXAMINATION 2026',
  page1: {
    title: 'OFFICIAL GAZETTE NOTIFICATION',
    text: [
      'The Union Public Service Commission hereby publishes this formal announcement regarding the preliminary schedule for the national competitive examination.',
      'The examination is conducted annually for recruitment to various central administrative services and departmental roles under the Government of India.',
      'Candidates are advised to read the administrative instructions and submission guidelines carefully before commencing online registration on the portal.',
      'All applicants must possess a valid personal email address and mobile telephone number which should be kept active throughout the entire selection cycle.',
      'In case of any guidance or information regarding the application protocol, candidates can contact the commission facilitation counter near gate C during official working hours between 10:00 hrs and 17:00 hrs on all working days.',
      'Canvassing in any form or producing forged certificates will lead to immediate cancellation of candidature and criminal prosecution under applicable statutory provisions.',
      'Impersonation at any stage of the competitive examination shall invite debarment from all future examinations conducted by the commission.'
    ]
  },
  page2: {
    title: 'SECTION II - ELIGIBILITY CONDITIONS AND CANDIDATE SPECIFICATIONS',
    text: [
      '1. Nationality: A candidate must be either a citizen of India, or a subject of Nepal, or a subject of Bhutan.',
      '2. Age Limits: A candidate must have attained the minimum age of 21 years and must not have exceeded the maximum age of 32 years as on the cut-off date of 1st August 2026.',
      'The candidate must have been born not earlier than 2nd August 1994 and not later than 1st August 2005.',
      'The upper age limit prescribed above will be relaxable for reserved categories as per Govt. directives: up to a maximum of 5 years if a candidate belongs to a Scheduled Caste (SC) or Scheduled Tribe (ST), and up to a maximum of 3 years in the case of candidates belonging to Other Backward Classes (OBC).',
      'Candidates seeking age relaxation must produce valid caste documentation issued by the competent district authority.',
      "3. Minimum Educational Qualifications: A candidate must hold a Bachelor's degree in any discipline from a recognized University incorporated by an Act of the Central or State Legislature in India or an educational institution established by an Act of Parliament.",
      'Candidates possessing an equivalent professional or technical degree recognized by the Govt. as equivalent to graduation are also eligible to apply.',
      "Candidates who have appeared at an examination the passing of which would render them educationally qualified for the Commission's examination, but have not received the result, may also apply for the preliminary stage.",
      '4. Physical Standards: Candidates must be physically fit according to physical standards for admission to Civil Services Examination 2026 as per regulations given in Appendix III of the rules.'
    ]
  },
  page3: {
    title: 'SECTION III - EXAMINATION CENTRES, SCHEME AND SYLLABUS',
    text: [
      '1. Centres of Preliminary Examination: The Preliminary Examination will be held at various designated centers across the country including Agartala, Ahmedabad, Aizawl, Bengaluru, Bhopal, Chandigarh, Chennai, Cuttack, Delhi, Dispur, Hyderabad, Imphal, Itanagar, Jaipur, Jammu, Kolkata, Lucknow, Mumbai, Patna, Ranchi, Shillong, Shimla, and Thiruvananthapuram.',
      'Allotment of Centers will be on the first-apply-first-allot basis, and once an examination center is opted for by the applicant, no request for change of center shall normally be entertained.',
      '2. Structure of Examination: The Competitive Examination comprises two successive stages: (i) Preliminary Examination (Objective type for the selection of candidates for the Main Examination) and (ii) Main Examination (Written and Interview) for the selection of candidates for the various services.',
      'Preliminary Examination Outline: Paper I will consist of 200 marks covering current events of national and international importance, history of India, Indian and world geography, Indian polity and governance, economic and social development, and general science.',
      'Paper II will consist of 200 marks testing comprehension, interpersonal skills including communication skills, logical reasoning and analytical ability, decision-making and problem-solving, and general mental ability.',
      'Candidates are strictly prohibited from bringing mobile phones, smart watches, calculators, or any electronic communication equipment inside the examination premises.'
    ]
  },
  page4: {
    title: 'SECTION IV - VACANCIES, IMPORTANT DATES AND APPLICATION FEE',
    text: [
      '1. Number of Vacancies: The number of vacancies to be filled through the examination is expected to be approximately 1056 posts.',
      'Reservation will be made for candidates belonging to SC, ST, OBC, EWS and Persons with Benchmark Disabilities categories in respect of vacancies as determined by the Govt. of India.',
      'Final allocation of posts shall depend on the roster position reported by the cadre controlling authorities before declaration of the final merit list.',
      '2. Schedule and Important Dates: The online application window opens on 2026-01-10 at 10:00 hrs.',
      'The last date for submission of online applications is 2026-02-15 until 18:00 hrs.',
      'The Preliminary Examination is scheduled to be conducted nationwide on 2026-05-24.',
      'Admit cards will be available for download on the official portal approximately three weeks before the commencement of the examination.',
      '3. Application Fee Structure: Candidates applying for the examination are required to pay an application fee of Rs. 100 for General and OBC male candidates.',
      'Female candidates and candidates belonging to SC, ST, and Persons with Benchmark Disability categories are completely exempt from payment of fee (Fee: Nil).',
      'The fee can be paid through any branch of State Bank of India by cash, or by using net banking facility of any bank, or by using Visa, Master, RuPay credit or debit card, or via UPI.',
      'Fee once paid shall not be refunded under any circumstances nor can it be held in reserve for any other examination or selection.'
    ]
  }
};

/**
 * Helper to wrap text into lines fitting within maxWidth.
 */
function wrapText(text, font, size, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, size);
    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Programmatically generates the 4-page sample recruitment PDF.
 * @param {Object} options
 * @param {string} [options.outputPath] - File path where PDF is saved (default: fixtures/sample-notification.pdf)
 * @param {boolean} [options.returnBuffer=false] - Whether to return Uint8Array buffer
 * @returns {Promise<Uint8Array>}
 */
async function generateSamplePdf(options = {}) {
  const outputPath = options.outputPath || path.join(__dirname, 'sample-notification.pdf');
  const pdfDoc = await PDFDocument.create();

  // Set deterministic metadata
  pdfDoc.setTitle('Civil Services Examination 2026 Notification');
  pdfDoc.setAuthor('Union Public Service Commission');
  pdfDoc.setSubject('Recruitment Notification No. 04/2026-CSP');
  pdfDoc.setCreationDate(new Date('2026-01-10T00:00:00.000Z'));
  pdfDoc.setModificationDate(new Date('2026-01-10T00:00:00.000Z'));

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 50;
  const contentWidth = pageWidth - (marginX * 2);

  const pagesData = [
    { pageNum: 1, ...NOTIFICATION_DATA.page1 },
    { pageNum: 2, ...NOTIFICATION_DATA.page2 },
    { pageNum: 3, ...NOTIFICATION_DATA.page3 },
    { pageNum: 4, ...NOTIFICATION_DATA.page4 }
  ];

  for (const pData of pagesData) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - 50;

    // Header bar
    page.drawText(NOTIFICATION_DATA.organization, {
      x: marginX,
      y: currentY,
      size: 13,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.3)
    });
    currentY -= 18;

    page.drawText(`Notice No: ${NOTIFICATION_DATA.noticeNumber} | ${NOTIFICATION_DATA.examTitle}`, {
      x: marginX,
      y: currentY,
      size: 9,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3)
    });
    currentY -= 12;

    // Divider rule
    page.drawLine({
      start: { x: marginX, y: currentY },
      end: { x: pageWidth - marginX, y: currentY },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8)
    });
    currentY -= 25;

    // Section Title
    page.drawText(pData.title, {
      x: marginX,
      y: currentY,
      size: 11,
      font: fontBold,
      color: rgb(0.15, 0.15, 0.15)
    });
    currentY -= 20;

    // Paragraphs
    for (const paragraph of pData.text) {
      const lines = wrapText(paragraph, fontRegular, 9.5, contentWidth);
      for (const line of lines) {
        if (currentY < 60) break; // prevent footer clipping
        page.drawText(line, {
          x: marginX,
          y: currentY,
          size: 9.5,
          font: fontRegular,
          color: rgb(0.1, 0.1, 0.1)
        });
        currentY -= 13;
      }
      currentY -= 6; // paragraph spacing
    }

    // Footer
    page.drawLine({
      start: { x: marginX, y: 40 },
      end: { x: pageWidth - marginX, y: 40 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8)
    });

    page.drawText(`Page ${pData.pageNum} of 4`, {
      x: pageWidth - marginX - 50,
      y: 25,
      size: 8,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4)
    });

    page.drawText('Confidential / Official Gazette Notification', {
      x: marginX,
      y: 25,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5)
    });
  }

  const pdfBytes = await pdfDoc.save();

  // Save to disk if outputPath provided
  if (outputPath) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, Buffer.from(pdfBytes));
  }

  return pdfBytes;
}

// CLI Execution entry point
if (require.main === module) {
  const targetFile = process.argv[2] || path.join(__dirname, 'sample-notification.pdf');
  generateSamplePdf({ outputPath: targetFile })
    .then((bytes) => {
      console.log(`[OK] Generated sample PDF notification: ${targetFile}`);
      console.log(`[OK] Size: ${bytes.length} bytes, 4 pages, deterministic metadata set.`);
    })
    .catch((err) => {
      console.error(`[ERROR] Failed to generate PDF:`, err);
      process.exit(1);
    });
}

module.exports = {
  generateSamplePdf,
  NOTIFICATION_DATA
};
