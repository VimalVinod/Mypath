import sys, re

with open('src/pages/ProfilePage.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Datasets insertion
datasets = """
const INDIAN_STATES_DISTRICTS: Record<string, string[]> = {
  'Kerala': ['Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode', 'Vellore', 'Kanyakumari'],
  'Karnataka': ['Bengaluru Urban', 'Bengaluru Rural', 'Mysuru', 'Mangaluru', 'Hubballi', 'Belagavi', 'Udupi']
};

const EDUCATION_STREAMS: Record<string, string[]> = {
  '10th': ['General'],
  '12th': ['Science (PCM)', 'Science (PCB)', 'Commerce', 'Arts / Humanities'],
  'Diploma': ['Mechanical', 'Civil', 'Electrical', 'Computer Science'],
  'Bachelor\\'s': ['B.Tech / B.E.', 'B.Sc.', 'B.A.', 'B.Com.', 'BBA', 'BCA', 'MBBS', 'LLB'],
  'Master\\'s': ['M.Tech / M.E.', 'M.Sc.', 'M.A.', 'M.Com.', 'MBA', 'MCA', 'MD']
};

const UNIVERSITIES_AND_BOARDS = [
  'CBSE', 'ICSE', 'Kerala State Board', 'Tamil Nadu State Board',
  'APJ Abdul Kalam Technological University (KTU)', 'University of Kerala', 'MG University', 'CUSAT',
  'Delhi University (DU)', 'Anna University', 'IIT Madras', 'IIT Bombay', 'NIT Calicut', 'Other'
];
"""
code = code.replace("import SidebarLayout from '../components/layout/SidebarLayout';", "import SidebarLayout from '../components/layout/SidebarLayout';\n" + datasets)

# 2. State replacements
code = code.replace("permanentAddress: '',", "subDistrict: '',")
code = code.replace("currentAddress: '',", "")
code = code.replace("isSameAddress: false,", "")

# 3. useEffect state replacement
code = code.replace("permanentAddress: userProfile.permanentAddress || '',", "subDistrict: userProfile.subDistrict || '',")
code = code.replace("currentAddress: userProfile.currentAddress || '',", "")
code = code.replace("isSameAddress: userProfile.permanentAddress === userProfile.currentAddress && !!userProfile.permanentAddress,", "")

# 4. handleSave state replacement
code = code.replace("const { isSameAddress, ...profileDataToSave } = formData;", "const { ...profileDataToSave } = formData;")

# 5. handleSave redirect update
code = code.replace("window.scrollTo({ top: 0, behavior: 'smooth' });", "window.scrollTo({ top: 0, behavior: 'smooth' });\\n        setTimeout(() => { navigate('/dashboard'); }, 1500);")

# 6. Remove dynamic handleChange for isSameAddress
code = re.sub(r'if \(name === \'isSameAddress\'\) \{[\s\S]*?\}', '', code)
code = re.sub(r'if \(name === \'permanentAddress\' && prev\.isSameAddress\) \{[\s\S]*?\}', '', code)

# 7. Replace Address Section UI
address_pattern = r'<section.*?Contact Information.*?</section>'
address_replacement = """<section style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  <MapPin size={18} color="#6B8E23" /> Contact Information
                </h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>State *</label>
                  <select name="state" value={formData.state} onChange={(e) => { handleChange(e); setFormData(prev => ({ ...prev, district: '' })); }} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#0F172A' }}>
                    <option value="">Select State</option>
                    {Object.keys(INDIAN_STATES_DISTRICTS).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>District *</label>
                  <select name="district" value={formData.district} onChange={handleChange} required disabled={!formData.state} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: formData.state ? '#FFFFFF' : '#F8FAFC', color: '#0F172A' }}>
                    <option value="">Select District</option>
                    {formData.state && INDIAN_STATES_DISTRICTS[formData.state]?.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Village / Sub-District</label>
                  <input type="text" name="subDistrict" value={formData.subDistrict} onChange={handleChange} placeholder="e.g. Thiruvalla" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#0F172A' }} />
                </div>
              </div>
            </section>"""
code = re.sub(address_pattern, address_replacement, code, flags=re.DOTALL)

# 8. Replace Education Level select
edu_level_pattern = r'<select value=\{edu\.level\} onChange=\{\(e\) => handleEducationChange\(index, \'level\', e\.target\.value\)\} required.*?<\/select>'
edu_level_replacement = """<select value={edu.level} onChange={(e) => { handleEducationChange(index, 'level', e.target.value); handleEducationChange(index, 'streamOrSubject', ''); }} required style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                        <option value="">Select Level</option>
                        {Object.keys(EDUCATION_STREAMS).map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                        <option value="PhD">PhD / Doctorate</option>
                      </select>"""
code = re.sub(edu_level_pattern, edu_level_replacement, code, flags=re.DOTALL)

# 9. Replace Specialization field with Stream Select
spec_pattern = r'<label[^>]*>Specialization.*?<input type="text" value=\{edu\.streamOrSubject\}.*?/>'
spec_replacement = """<label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Stream / Subject *</label>
                      <select value={edu.streamOrSubject} onChange={(e) => handleEducationChange(index, 'streamOrSubject', e.target.value)} required disabled={!edu.level} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: edu.level ? '#fff' : '#F8FAFC' }}>
                        <option value="">Select Stream</option>
                        {EDUCATION_STREAMS[edu.level]?.map(stream => <option key={stream} value={stream}>{stream}</option>)}
                        <option value="Other">Other</option>
                      </select>"""
code = re.sub(spec_pattern, spec_replacement, code, flags=re.DOTALL)

# 10. Replace University field with Searchable Datalist
uni_pattern = r'<label[^>]*>Board / University.*?<input type="text" value=\{edu\.boardOrUniversity\}.*?/>'
uni_replacement = """<label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Board / University *</label>
                      <input list={`uni-list-${index}`} value={edu.boardOrUniversity} onChange={(e) => handleEducationChange(index, 'boardOrUniversity', e.target.value)} placeholder="Type to search..." required style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                      <datalist id={`uni-list-${index}`}>
                        {UNIVERSITIES_AND_BOARDS.map(uni => <option key={uni} value={uni} />)}
                      </datalist>"""
code = re.sub(uni_pattern, uni_replacement, code, flags=re.DOTALL)

# 11. Remove Family Details section
fam_pattern = r'\{\/\* Section 5: Family Details \*\/\}.*?<\/section>'
code = re.sub(fam_pattern, '', code, flags=re.DOTALL)

with open('src/pages/ProfilePage.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
    
print("Updated successfully via python.")
