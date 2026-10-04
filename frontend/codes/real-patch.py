import re

with open('src/pages/ProfilePage.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. State fixes
code = code.replace("permanentAddress: '',\r\n    currentAddress: '',\r\n    isSameAddress: false,", "subDistrict: '',")
code = code.replace("permanentAddress: '',\n    currentAddress: '',\n    isSameAddress: false,", "subDistrict: '',")

# 2. useEffect fixes
code = code.replace("permanentAddress: userProfile.permanentAddress || '',\r\n        currentAddress: userProfile.currentAddress || '',\r\n        isSameAddress: userProfile.permanentAddress === userProfile.currentAddress && userProfile.permanentAddress !== '',", "subDistrict: userProfile.subDistrict || '',")
code = code.replace("permanentAddress: userProfile.permanentAddress || '',\n        currentAddress: userProfile.currentAddress || '',\n        isSameAddress: userProfile.permanentAddress === userProfile.currentAddress && userProfile.permanentAddress !== '',", "subDistrict: userProfile.subDistrict || '',")

# 3. HandleSave destructuring fix
code = code.replace("const { isSameAddress, ...profileDataToSave } = formData;", "const { ...profileDataToSave } = formData;")

# 4. Remove handleChange isSameAddress sync
code = re.sub(r"if \(name === 'isSameAddress'\) \{.*?\r?\n.*?\r?\n\s*\}", "", code)
code = re.sub(r"if \(name === 'permanentAddress' && prev\.isSameAddress\) \{.*?\r?\n.*?\r?\n\s*\}", "", code)

# 5. Fix Redirects
code = code.replace("window.scrollTo({ top: 0, behavior: 'smooth' });", "window.scrollTo({ top: 0, behavior: 'smooth' });\n        setTimeout(() => { navigate('/dashboard'); }, 1500);")

# Change all olive green to the BRAND_GREEN
code = code.replace("#6B8E23", "#10B981")
code = code.replace("backgroundColor: '#6B8E23'", "backgroundColor: '#10B981'") # Ensure Save button matches

# Replace Address UI Block
address_ui = '''{/* Section 2: Address */}
          <section style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', marginBottom: '2rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 700, borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem', marginBottom: '1.5rem', color: '#0F172A' }}>
              <MapPin size={18} color="#10B981" /> Contact & Location
            </h2>
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
          </section>'''

code = re.sub(r'\{\/\* Section 2: Address \*\/\}.*?<\/section>', address_ui, code, flags=re.DOTALL)

# Remove family section
code = re.sub(r'\{\/\* Section 5: Family Details \*\/\}.*?<\/section>', '', code, flags=re.DOTALL)

# Add Datasets at the top
DATASETS = '''
const EDUCATION_STREAMS: Record<string, string[]> = {
  '10th': ['General'],
  '12th': ['Science (PCM)', 'Science (PCB)', 'Commerce', 'Arts / Humanities'],
  'Diploma': ['Mechanical Engineering', 'Civil Engineering', 'Electrical Engineering', 'Computer Science', 'Other'],
  'Bachelor\\'s': ['B.Tech / B.E.', 'B.Sc.', 'B.A.', 'B.Com.', 'BBA', 'BCA', 'MBBS', 'LLB', 'Other'],
  'Master\\'s': ['M.Tech / M.E.', 'M.Sc.', 'M.A.', 'M.Com.', 'MBA', 'MCA', 'MD', 'Other']
};

const BOARDS = [
  'Central Board of Secondary Education (CBSE)',
  'Indian Certificate of Secondary Education (ICSE)',
  'Kerala State Education Board',
  'Tamil Nadu State Board',
  'Karnataka State Board',
  'Maharashtra State Board',
  'Other Board'
];

const UNIVERSITIES = [
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
  'Other University'
];
'''
code = code.replace("import { statesAndDistricts } from '../data/statesAndDistricts';", "import { statesAndDistricts } from '../data/statesAndDistricts';\n" + DATASETS)

# Education replacement
edu_ui = '''<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Qualification Level *</label>
                    <select value={edu.level} onChange={(e) => { handleEducationChange(index, 'level', e.target.value); handleEducationChange(index, 'streamOrSubject', ''); handleEducationChange(index, 'boardOrUniversity', ''); }} required style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF' }}>
                      <option value="">Select Level</option>
                      {Object.keys(EDUCATION_STREAMS).map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                      <option value="PhD">PhD / Doctorate</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Stream / Subject *</label>
                    <select value={edu.streamOrSubject} onChange={(e) => handleEducationChange(index, 'streamOrSubject', e.target.value)} required disabled={!edu.level} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: edu.level ? '#FFFFFF' : '#F8FAFC' }}>
                      <option value="">Select Stream</option>
                      {EDUCATION_STREAMS[edu.level]?.map(stream => <option key={stream} value={stream}>{stream}</option>)}
                      {edu.level === 'PhD' && <option value="PhD Topic">Doctorate Research</option>}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Board / University *</label>
                    <input list={`uni-list-${index}`} value={edu.boardOrUniversity} onChange={(e) => handleEducationChange(index, 'boardOrUniversity', e.target.value)} placeholder={edu.level === '10th' || edu.level === '12th' ? "Search Board..." : "Search University..."} disabled={!edu.level} required style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: edu.level ? '#FFFFFF' : '#F8FAFC' }} />
                    <datalist id={`uni-list-${index}`}>
                      {(edu.level === '10th' || edu.level === '12th' ? BOARDS : UNIVERSITIES).map(uni => <option key={uni} value={uni} />)}
                    </datalist>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Year of Passing *</label>
                    <input type="number" value={edu.passingYear} onChange={(e) => handleEducationChange(index, 'passingYear', e.target.value)} required min="1950" max="2030" placeholder="YYYY" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Percentage / CGPA *</label>
                    <input type="text" value={edu.percentageOrCgpa} onChange={(e) => handleEducationChange(index, 'percentageOrCgpa', e.target.value)} required placeholder="e.g. 85% or 8.5" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                  </div>
                </div>'''

# This targets the INSIDE of the edu.map block perfectly.
code = re.sub(r'<div style=\{\{ display: \'grid\', gridTemplateColumns: \'1fr 1fr\', gap: \'1\.5rem\', marginBottom: \'1rem\' \}\}>.*?<\/div>\s*<\/div>', edu_ui, code, flags=re.DOTALL)

with open('src/pages/ProfilePage.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

with open('src/context/AppContext.tsx', 'r', encoding='utf-8') as f:
    ctx = f.read()

ctx = ctx.replace("permanentAddress: '',\r\n  currentAddress: '',", "subDistrict: '',")
ctx = ctx.replace("permanentAddress: '',\n  currentAddress: '',", "subDistrict: '',")
ctx = ctx.replace("permanentAddress: '',", "")
ctx = ctx.replace("currentAddress: '',", "")

with open('src/context/AppContext.tsx', 'w', encoding='utf-8') as f:
    f.write(ctx)
