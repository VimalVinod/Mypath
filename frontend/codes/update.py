import sys, re
import os

with open('src/pages/ProfilePage.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

DATASETS = '''
const INDIAN_STATES_DISTRICTS: Record<string, string[]> = {
  'Kerala': ['Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode', 'Vellore', 'Kanyakumari'],
  'Karnataka': ['Bengaluru Urban', 'Bengaluru Rural', 'Mysuru', 'Mangaluru', 'Hubballi', 'Belagavi', 'Udupi'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad'],
  'Delhi': ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Prayagraj', 'Noida', 'Ghaziabad']
};

const EDUCATION_STREAMS: Record<string, string[]> = {
  '10th': ['General'],
  '12th': ['Science (PCM)', 'Science (PCB)', 'Commerce', 'Arts / Humanities'],
  'Diploma': ['Mechanical Engineering', 'Civil Engineering', 'Electrical Engineering', 'Computer Science', 'Electronics'],
  'Bachelor\\'s': ['B.Tech / B.E.', 'B.Sc.', 'B.A.', 'B.Com.', 'BBA', 'BCA', 'MBBS', 'LLB'],
  'Master\\'s': ['M.Tech / M.E.', 'M.Sc.', 'M.A.', 'M.Com.', 'MBA', 'MCA', 'MD']
};

const UNIVERSITIES_AND_BOARDS = [
  'Central Board of Secondary Education (CBSE)',
  'Indian Certificate of Secondary Education (ICSE)',
  'Kerala State Education Board',
  'Tamil Nadu State Board',
  'Karnataka State Board',
  'Maharashtra State Board',
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
'''

code = re.sub(r'(import .*?\n\n)', r'\1' + DATASETS + '\n', code, count=1)

code = re.sub(r'permanentAddress: \'\',\s*currentAddress: \'\',\s*isSameAddress: false,', "state: '', district: '', subDistrict: '',", code)

code = re.sub(r'permanentAddress: userProfile\.permanentAddress \|\| \'\',\s*currentAddress: userProfile\.currentAddress \|\| \'\',\s*isSameAddress: userProfile\.permanentAddress === userProfile\.currentAddress && !!userProfile\.permanentAddress,', "subDistrict: userProfile.subDistrict || '',", code)

code = re.sub(r'const \{ isSameAddress, \.\.\.profileDataToSave \} = formData;', 'const { ...profileDataToSave } = formData;', code)

code = re.sub(r'if \(userProfile && !userProfile\.isProfileComplete\) \{\s*setTimeout\(\(\) => navigate\(\'/dashboard\'\), 1500\);\s*\}', "setTimeout(() => { navigate('/dashboard'); }, 1500);", code)

code = re.sub(r'if \(name === \'isSameAddress\'\) \{[\s\S]*?\}', '', code)
code = re.sub(r'if \(name === \'permanentAddress\' && prev\.isSameAddress\) \{[\s\S]*?\}', '', code)

address_ui = '''<section style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', marginBottom: '2rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 700, borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem', marginBottom: '1.5rem', color: '#0F172A' }}>
              <MapPin size={18} color="#6B8E23" /> Contact & Location
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>State *</label>
                <select name="state" value={formData.state || ''} onChange={(e) => { handleChange(e); setFormData(prev => ({ ...prev, district: '' })); }} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF' }}>
                  <option value="">Select State</option>
                  {Object.keys(INDIAN_STATES_DISTRICTS).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>District *</label>
                <select name="district" value={formData.district || ''} onChange={handleChange} required disabled={!formData.state} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: formData.state ? '#FFFFFF' : '#F8FAFC' }}>
                  <option value="">Select District</option>
                  {formData.state && INDIAN_STATES_DISTRICTS[formData.state]?.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Village / Sub-District</label>
                <input type="text" name="subDistrict" value={formData.subDistrict || ''} onChange={handleChange} placeholder="e.g. Thiruvalla" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
              </div>
            </div>
          </section>'''

code = re.sub(r'<section[^>]*>\s*<h2[^>]*>[\s\S]*?Contact Information[\s\S]*?</section>', address_ui, code)

code = re.sub(r'\{/\* Section 5: Family Details \*/\}[\s\S]*?</section>', '', code)

edu_ui = '''<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
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
                    <input list={`uni-list-${index}`} value={edu.boardOrUniversity} onChange={(e) => handleEducationChange(index, 'boardOrUniversity', e.target.value)} placeholder="Type to search..." required style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                    <datalist id={`uni-list-${index}`}>
                      {UNIVERSITIES_AND_BOARDS.map(uni => <option key={uni} value={uni} />)}
                    </datalist>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1rem' }}>
                  <div>
                    <label'''
                    
code = re.sub(r'<div style={{ display: \'grid\', gridTemplateColumns: \'1fr 1fr\', gap: \'1\.5rem\', marginBottom: \'1rem\' }}>[\s\S]*?<div>\s*<label[^>]*>Passing Year', edu_ui, code)

code = re.sub(r'<div>\s*<label[^>]*>Specialization[^<]*</label>[\s\S]*?</div>\s*</div>', '</div>', code)

with open('src/pages/ProfilePage.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

with open('src/context/AppContext.tsx', 'r', encoding='utf-8') as f:
    ctx = f.read()

ctx = re.sub(r'permanentAddress: \'\',\s*currentAddress: \'\',', '', ctx)
ctx = re.sub(r'state: \'\',', "state: '', district: '', subDistrict: '',", ctx)

with open('src/context/AppContext.tsx', 'w', encoding='utf-8') as f:
    f.write(ctx)
