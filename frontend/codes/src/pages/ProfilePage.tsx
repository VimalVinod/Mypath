import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { User, MapPin, GraduationCap, Briefcase, Users, Save, Plus, X, ShieldAlert } from 'lucide-react';
import { statesAndDistricts } from '../data/statesAndDistricts';

export const ProfilePage: React.FC = () => {
  const { currentUser, userProfile, updateUserProfile, navigate, logoutUser } = useApp();
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    gender: '',
    fathersName: '',
    mothersName: '',
    state: '',
    district: '',
    permanentAddress: '',
    currentAddress: '',
    isSameAddress: false,
    category: '',
    isPwbd: false,
    disabilityType: '',
    disabilityPercentage: '',
    isGovtEmployee: false,
    department: '',
    isExServiceman: false,
    parentsAnnualIncome: '',
    education: [] as any[],
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || currentUser?.displayName || '',
        dob: userProfile.dob || '',
        gender: userProfile.gender || '',
        fathersName: userProfile.fathersName || '',
        mothersName: userProfile.mothersName || '',
        state: userProfile.state || '',
        district: userProfile.district || '',
        permanentAddress: userProfile.permanentAddress || '',
        currentAddress: userProfile.currentAddress || '',
        isSameAddress: userProfile.permanentAddress === userProfile.currentAddress && userProfile.permanentAddress !== '',
        category: userProfile.category || '',
        isPwbd: userProfile.isPwbd || false,
        disabilityType: userProfile.disabilityType || '',
        disabilityPercentage: userProfile.disabilityPercentage || '',
        isGovtEmployee: userProfile.isGovtEmployee || false,
        department: userProfile.department || '',
        isExServiceman: userProfile.isExServiceman || false,
        parentsAnnualIncome: userProfile.parentsAnnualIncome || '',
        education: userProfile.education ? [...userProfile.education] : [],
      });
    } else if (currentUser) {
      setFormData(prev => ({
        ...prev,
        name: currentUser.displayName || ''
      }));
    }
  }, [userProfile, currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => {
        const next = { ...prev, [name]: checked };
        if (name === 'isSameAddress') {
          next.currentAddress = checked ? next.permanentAddress : '';
        }
        return next;
      });
    } else {
      setFormData(prev => {
        const next = { ...prev, [name]: value };
        if (name === 'permanentAddress' && prev.isSameAddress) {
          next.currentAddress = value;
        }
        if (name === 'state') {
          next.district = ''; // reset district when state changes
        }
        return next;
      });
    }
  };

  const handleEducationChange = (index: number, field: string, value: string) => {
    const newEdu = [...formData.education];
    newEdu[index][field] = value;
    setFormData(prev => ({ ...prev, education: newEdu }));
  };

  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [...prev.education, { id: `edu_${Date.now()}`, level: '', boardOrUniversity: '', passingYear: '', percentageOrCgpa: '', streamOrSubject: '' }]
    }));
  };

  const removeEducation = (index: number) => {
    const newEdu = [...formData.education];
    newEdu.splice(index, 1);
    setFormData(prev => ({ ...prev, education: newEdu }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      if (!formData.name || !formData.dob || !formData.gender || !formData.category || !formData.state || !formData.district) {
        throw new Error("Please fill in your name and all the required personal and address fields.");
      }

      const { isSameAddress, ...profileDataToSave } = formData;

      await updateUserProfile({
        ...profileDataToSave,
        category: profileDataToSave.category as any,
        isProfileComplete: true 
      });
      
      setSaveSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setSaveSuccess(false), 3000);
      
      if (userProfile && !userProfile.isProfileComplete) {
        setTimeout(() => navigate('/dashboard'), 1500);
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save profile. Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSaving(false);
    }
  };

  const states = Object.keys(statesAndDistricts).sort();
  const districts = formData.state ? (statesAndDistricts[formData.state] || []).sort() : [];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
      <Navbar />

      <main style={{ flex: 1, maxWidth: '1000px', width: '100%', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#0F172A', marginBottom: '0.4rem' }}>
            Candidate Profile
          </h1>
          <p style={{ fontSize: '0.95rem', color: '#64748B' }}>
            Provide your exact details as they appear on your official certificates to find accurate exam matches.
          </p>
        </div>

        {saveSuccess && (
          <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', padding: '1rem', borderRadius: '8px', color: '#065F46', marginBottom: '1.5rem', fontWeight: 500 }}>
            Profile saved successfully!
          </div>
        )}

        {saveError && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', padding: '1rem', borderRadius: '8px', color: '#991B1B', marginBottom: '1.5rem', fontWeight: 500 }}>
            {saveError}
          </div>
        )}

        {!userProfile?.isProfileComplete && !saveSuccess && (
          <div style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', padding: '1rem', borderRadius: '8px', color: '#9A3412', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <ShieldAlert size={20} />
            <span style={{ fontWeight: 500 }}>Complete your profile to unlock the dashboard and exam recommendations.</span>
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'grid', gap: '2rem' }}>
          
          {/* Section 1: Personal Details */}
          <section style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700, borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem', marginBottom: '1.5rem', color: '#0F172A' }}>
              <User size={20} color="#2563EB" /> Personal Details
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Full Name *</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#0F172A' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Email Address</label>
                <input type="email" value={userProfile?.email || currentUser?.email || ''} disabled style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', color: '#94A3B8' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Father's Name</label>
                <input type="text" name="fathersName" value={formData.fathersName} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Mother's Name</label>
                <input type="text" name="mothersName" value={formData.mothersName} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Date of Birth *</label>
                <input type="date" name="dob" value={formData.dob} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Gender *</label>
                <select name="gender" value={formData.gender} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF' }}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Transgender">Transgender</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #E2E8F0' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Category / Reservation *</label>
                <select name="category" value={formData.category} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF' }}>
                  <option value="">Select Category</option>
                  <option value="General">General / UR</option>
                  <option value="EWS">EWS</option>
                  <option value="OBC-NCL">OBC (Non-Creamy Layer)</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                </select>
              </div>
            </div>
          </section>

          {/* Section 2: Address */}
          <section style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700, borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem', marginBottom: '1.5rem', color: '#0F172A' }}>
              <MapPin size={20} color="#10B981" /> Address & Domicile
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>State *</label>
                <select name="state" value={formData.state} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF' }}>
                  <option value="">Select State</option>
                  {states.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>District *</label>
                <select name="district" value={formData.district} onChange={handleChange} required disabled={!formData.state} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: formData.state ? '#FFFFFF' : '#F1F5F9' }}>
                  <option value="">Select District</option>
                  {districts.map(d => <option key={d} value={d}>{d}</option>)}
                  {formData.state && districts.length === 0 && <option value="Other">Other</option>}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Permanent Address</label>
              <textarea name="permanentAddress" value={formData.permanentAddress} onChange={handleChange} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', resize: 'vertical' }} placeholder="House/Flat No., Street, Village/Town, Pincode" />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Current / Correspondence Address</label>
                <label style={{ fontSize: '0.8rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" name="isSameAddress" checked={formData.isSameAddress} onChange={handleChange} style={{ width: '16px', height: '16px' }} />
                  Same as Permanent Address
                </label>
              </div>
              <textarea name="currentAddress" value={formData.currentAddress} onChange={handleChange} disabled={formData.isSameAddress} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', resize: 'vertical', backgroundColor: formData.isSameAddress ? '#F8FAFC' : '#FFFFFF' }} placeholder="House/Flat No., Street, Village/Town, Pincode" />
            </div>
          </section>

          {/* Section 3: Educational Qualifications */}
          <section style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700, borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem', marginBottom: '1.5rem', color: '#0F172A' }}>
              <GraduationCap size={20} color="#8B5CF6" /> Educational Qualifications
            </h2>
            
            {formData.education.map((edu, index) => (
              <div key={edu.id} style={{ padding: '1.5rem', border: '1px solid #E2E8F0', borderRadius: '8px', marginBottom: '1rem', backgroundColor: '#F8FAFC', position: 'relative' }}>
                <button type="button" onClick={() => removeEducation(index)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '0.25rem' }}>
                  <X size={18} />
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Qualification Level *</label>
                    <select value={edu.level} onChange={(e) => handleEducationChange(index, 'level', e.target.value)} required style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                      <option value="">Select Level</option>
                      <option value="10th">10th / SSLC / Matriculation</option>
                      <option value="12th">12th / HSC / Intermediate</option>
                      <option value="Diploma">Diploma</option>
                      <option value="Graduate">Graduate / Bachelor's</option>
                      <option value="PG">Post Graduate / Master's</option>
                      <option value="PhD">PhD / Doctorate</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Subject / Stream</label>
                    <input type="text" value={edu.streamOrSubject} onChange={(e) => handleEducationChange(index, 'streamOrSubject', e.target.value)} placeholder="e.g. Science, B.Tech CS" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                  </div>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Board / University Name *</label>
                  <input type="text" value={edu.boardOrUniversity} onChange={(e) => handleEducationChange(index, 'boardOrUniversity', e.target.value)} required placeholder="e.g. CBSE, Kerala University" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
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
                </div>
              </div>
            ))}
            
            <button type="button" onClick={addEducation} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#2563EB', background: '#EFF6FF', border: '1px dashed #BFDBFE', padding: '0.75rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
              <Plus size={18} /> Add Educational Qualification
            </button>
          </section>

          {/* Section 4: Disability & Employment */}
          <section style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700, borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem', marginBottom: '1.5rem', color: '#0F172A' }}>
              <Briefcase size={20} color="#F59E0B" /> Special Status & Employment
            </h2>
            
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div style={{ padding: '1rem', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#F8FAFC' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}>
                  <input type="checkbox" name="isPwbd" checked={formData.isPwbd} onChange={handleChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  Are you a Person with Benchmark Disability (PwBD)?
                </label>
                {formData.isPwbd && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Disability Type</label>
                      <input type="text" name="disabilityType" value={formData.disabilityType} onChange={handleChange} placeholder="e.g. Visual Impairment" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Disability Percentage (%)</label>
                      <input type="number" name="disabilityPercentage" value={formData.disabilityPercentage} onChange={handleChange} placeholder="e.g. 40" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ padding: '1rem', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#F8FAFC' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}>
                  <input type="checkbox" name="isGovtEmployee" checked={formData.isGovtEmployee} onChange={handleChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  Are you currently employed in Government Service?
                </label>
                {formData.isGovtEmployee && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Department & Designation</label>
                    <input type="text" name="department" value={formData.department} onChange={handleChange} placeholder="e.g. Ministry of Railways, Clerk" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                  </div>
                )}
              </div>

              <div style={{ padding: '1rem', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#F8FAFC' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}>
                  <input type="checkbox" name="isExServiceman" checked={formData.isExServiceman} onChange={handleChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  Are you an Ex-Serviceman?
                </label>
              </div>
            </div>
          </section>

          {/* Section 5: Family Details */}
          <section style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700, borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem', marginBottom: '1.5rem', color: '#0F172A' }}>
              <Users size={20} color="#06B6D4" /> Family Details
            </h2>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Parents' Annual Income (₹)</label>
              <select name="parentsAnnualIncome" value={formData.parentsAnnualIncome} onChange={handleChange} style={{ width: '100%', maxWidth: '350px', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF' }}>
                <option value="">Select Income Bracket</option>
                <option value="Below 2.5 Lakhs">Below 2.5 Lakhs</option>
                <option value="2.5 Lakhs - 5 Lakhs">2.5 Lakhs - 5 Lakhs</option>
                <option value="5 Lakhs - 8 Lakhs">5 Lakhs - 8 Lakhs</option>
                <option value="Above 8 Lakhs">Above 8 Lakhs (Creamy Layer)</option>
              </select>
            </div>
          </section>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', alignItems: 'center' }}>
            <button 
              type="button" 
              onClick={() => logoutUser()}
              style={{ padding: '0.6rem 1.25rem', backgroundColor: 'transparent', color: '#EF4444', border: '1px solid #FECACA', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'background-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FEF2F2'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Sign Out
            </button>

            <button 
              type="submit" 
              disabled={isSaving}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 2rem', backgroundColor: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1rem', cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1, boxShadow: '0 4px 6px -1px rgba(37,99,235,0.2)' }}
            >
              <Save size={20} />
              {isSaving ? 'Saving Profile...' : 'Save Profile Details'}
            </button>
          </div>

        </form>
      </main>

      <Footer />
    </div>
  );
};

export default ProfilePage;
