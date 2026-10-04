const fs = require('fs');

let code = fs.readFileSync('src/pages/ProfilePage.tsx', 'utf8');

// 1. Add Data
const DATA = `
const EDUCATION_STREAMS: Record<string, string[]> = {
  '10th': ['General'],
  '12th': ['Science (PCM)', 'Science (PCB)', 'Commerce', 'Arts / Humanities'],
  'Diploma': ['Mechanical', 'Civil', 'Electrical', 'Computer Science'],
  'Bachelor\\'s': ['B.Tech / B.E.', 'B.Sc.', 'B.A.', 'B.Com.', 'BBA', 'BCA', 'MBBS', 'LLB'],
  'Master\\'s': ['M.Tech / M.E.', 'M.Sc.', 'M.A.', 'M.Com.', 'MBA', 'MCA', 'MD']
};

const UNIVERSITIES_AND_BOARDS = [
  'Central Board of Secondary Education (CBSE)',
  'Indian Certificate of Secondary Education (ICSE)',
  'Kerala State Education Board',
  'Tamil Nadu State Board',
  'APJ Abdul Kalam Technological University (KTU)',
  'University of Kerala',
  'Mahatma Gandhi University (MGU)',
  'Cochin University of Science and Technology (CUSAT)',
  'University of Calicut',
  'Delhi University (DU)',
  'Anna University',
  'Mumbai University',
  'Indian Institute of Technology (IIT) Madras',
  'Indian Institute of Technology (IIT) Bombay',
  'National Institute of Technology (NIT) Calicut',
  'Jawaharlal Nehru University (JNU)',
  'Other'
];
`;

code = code.replace(/import \{ statesAndDistricts \} from '\.\.\/data\/statesAndDistricts';/, "import { statesAndDistricts } from '../data/statesAndDistricts';\n" + DATA);

// 2. Remove Address Section UI
const startAddress = code.indexOf('{/* Section 2: Contact & Location */}');
const endAddress = code.indexOf('{/* Section 3: Professional Details */}');
if (startAddress > -1 && endAddress > -1) {
  const newAddressUI = `{/* Section 2: Contact & Location */}
            <section style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  <MapPin size={18} color="#6B8E23" /> Contact & Location
                </h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>State *</label>
                  <select name="state" value={formData.state || ''} onChange={(e) => { handleChange(e); setFormData(prev => ({ ...prev, district: '' })); }} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF' }}>
                    <option value="">Select State</option>
                    {states.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>District *</label>
                  <select name="district" value={formData.district || ''} onChange={handleChange} required disabled={!formData.state} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: formData.state ? '#FFFFFF' : '#F8FAFC' }}>
                    <option value="">Select District</option>
                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Village / Sub-District</label>
                  <input type="text" name="subDistrict" value={formData.subDistrict || ''} onChange={handleChange} placeholder="e.g. Thiruvalla" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
                </div>
              </div>
            </section>
            
            `;
  code = code.substring(0, startAddress) + newAddressUI + code.substring(endAddress);
}

// 3. Update Education Section UI
const startEdu = code.indexOf('{/* Section 4: Education */}');
const endEdu = code.indexOf('{/* Section 5: Family Details */}');
if (startEdu > -1 && endEdu > -1) {
  let eduBlock = code.substring(startEdu, endEdu);
  
  const gridStart = eduBlock.indexOf('<div style={{ display: \'grid\', gridTemplateColumns: \'1fr 1fr\', gap: \'1.5rem\', marginBottom: \'1rem\' }}>');
  const gridEnd = eduBlock.indexOf('</div>\n                </div>\n              ))}');
  if (gridStart > -1 && gridEnd > -1) {
    const newEduGrid = `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Qualification Level *</label>
                    <select value={edu.level} onChange={(e) => { handleEducationChange(index, 'level', e.target.value); handleEducationChange(index, 'streamOrSubject', ''); }} required style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                      <option value="">Select Level</option>
                      {Object.keys(EDUCATION_STREAMS).map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                      <option value="PhD">PhD / Doctorate</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Stream / Subject *</label>
                    <select value={edu.streamOrSubject} onChange={(e) => handleEducationChange(index, 'streamOrSubject', e.target.value)} required disabled={!edu.level} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: edu.level ? '#fff' : '#F8FAFC' }}>
                      <option value="">Select Stream</option>
                      {EDUCATION_STREAMS[edu.level]?.map(stream => <option key={stream} value={stream}>{stream}</option>)}
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Board / University *</label>
                    <input list={\`uni-list-\${index}\`} value={edu.boardOrUniversity} onChange={(e) => handleEducationChange(index, 'boardOrUniversity', e.target.value)} placeholder="Type to search..." required style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                    <datalist id={\`uni-list-\${index}\`}>
                      {UNIVERSITIES_AND_BOARDS.map(uni => <option key={uni} value={uni} />)}
                    </datalist>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Passing Year</label>
                    <input type="number" value={edu.passingYear} onChange={(e) => handleEducationChange(index, 'passingYear', e.target.value)} placeholder="e.g. 2024" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Percentage / CGPA</label>
                    <input type="text" value={edu.percentageOrCgpa} onChange={(e) => handleEducationChange(index, 'percentageOrCgpa', e.target.value)} placeholder="e.g. 85% or 8.5" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                  </div>
                `;
    eduBlock = eduBlock.substring(0, gridStart) + newEduGrid + eduBlock.substring(gridEnd);
  }
  code = code.substring(0, startEdu) + eduBlock + code.substring(endEdu);
}

// 4. Remove Family Income Section
const startFam = code.indexOf('{/* Section 5: Family Details */}');
const endFam = code.indexOf('</form>');
if (startFam > -1 && endFam > -1) {
  code = code.substring(0, startFam) + code.substring(endFam);
}

// 5. Ensure redirect works
code = code.replace(/window\.scrollTo\(\{ top: 0, behavior: 'smooth' \}\);\s*setTimeout\(\(\) => setSaveSuccess\(false\), 3000\);/g, "window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => navigate('/dashboard'), 1500);");

// Write it
fs.writeFileSync('src/pages/ProfilePage.tsx', code);
