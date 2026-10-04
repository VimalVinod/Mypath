const fs = require('fs');

// 1. Update ExamCard.tsx
const cardPath = 'src/components/ExamCard.tsx';
let cardCode = fs.readFileSync(cardPath, 'utf8');

// Update Interface
cardCode = cardCode.replace(
  'interface ExamCardProps {\n  exam: Exam;\n}',
  'interface ExamCardProps {\n  exam: Exam;\n  hideEligibilityTags?: boolean;\n}'
);

// Update Component Signature
cardCode = cardCode.replace(
  'export const ExamCard: React.FC<ExamCardProps> = ({ exam }) => {',
  'export const ExamCard: React.FC<ExamCardProps> = ({ exam, hideEligibilityTags }) => {'
);

// Conditional Render
const metaRowOld = `<span className="badge badge-dark">
              {exam.type}
            </span>
            {getMatchBadge()}`;

const metaRowNew = `{!hideEligibilityTags && (
              <>
                <span className="badge badge-dark">
                  {exam.type}
                </span>
                {getMatchBadge()}
              </>
            )}`;

cardCode = cardCode.replace(metaRowOld, metaRowNew);
fs.writeFileSync(cardPath, cardCode);
console.log('Updated ExamCard.tsx');

// 2. Update LandingPage.tsx
const landingPath = 'src/pages/LandingPage.tsx';
let landingCode = fs.readFileSync(landingPath, 'utf8');

landingCode = landingCode.replace(
  '<ExamCard key={exam.id} exam={exam} />',
  '<ExamCard key={exam.id} exam={exam} hideEligibilityTags={true} />'
);

fs.writeFileSync(landingPath, landingCode);
console.log('Updated LandingPage.tsx');
