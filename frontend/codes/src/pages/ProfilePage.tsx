import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SidebarLayout } from '../components/SidebarLayout';
import { User, MapPin, GraduationCap, Briefcase, Users, Save, Plus, X, ShieldAlert } from 'lucide-react';
import { statesAndDistricts } from '../data/statesAndDistricts';

export const ProfilePage: React.FC = () => {
  const { currentUser, userProfile, updateUserProfile, navigate, logoutUser, deleteAccount, linkGoogleAccount, linkPasswordAccount } = useApp();
  const [newPassword, setNewPassword] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    gender: '',
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

      // INSTANT MATCH - Real-time sync with backend!
      if (currentUser?.uid) {
        try {
          await fetch('https://mypath-backend-two.vercel.app/match-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser?.uid })
          });
        } catch (e) {
          console.warn('Silent fallback: Could not reach matching service immediately.');
        }
      }
      
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

  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost."
    );
    if (!confirmDelete) return;

    try {
      await deleteAccount();
      // AppContext handles navigation after deletion
    } catch (err: any) {
      setSaveError(err.message || 'Failed to delete account. Please try again or log out and log back in.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const states = Object.keys(statesAndDistricts).sort();
  const districts = formData.state ? (statesAndDistricts[formData.state] || []).sort() : [];


  return (
    <SidebarLayout pageTitle="My Profile" activeNav="profile">

        {saveSuccess && (
          <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '0.875rem 1.25rem', borderRadius: '10px', color: '#065F46', marginBottom: '1.5rem', fontWeight: 500, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            âœ“ Profile saved successfully!
          </div>
        )}

        {saveError && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', padding: '0.875rem 1.25rem', borderRadius: '10px', color: '#991B1B', marginBottom: '1.5rem', fontWeight: 500, fontSize: '0.9rem' }}>
            {saveError}
          </div>
        )}

        {!userProfile?.isProfileComplete && !saveSuccess && (
          <div style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', padding: '0.875rem 1.25rem', borderRadius: '10px', color: '#9A3412', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.9rem' }}>
            <ShieldAlert size={18} />
            <span style={{ fontWeight: 500 }}>Fill in your details below so we can find exams you're eligible for.</span>
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'grid', gap: '1.25rem' }}>
          
          {/* Section 1: Personal Details */}
          <section style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                <User size={18} color="#6B8E23" /> Personal Details
              </h2>
              <button 
                type="button" 
                onClick={handleDelete}
                style={{ padding: '0.4rem 0.85rem', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FEE2E2'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FEF2F2'}
              >
                Delete Account
              </button>
            </div>
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
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 700, borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem', marginBottom: '1.5rem', color: '#0F172A' }}>
              <MapPin size={18} color="#6B8E23" /> Address & Domicile
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
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 700, borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem', marginBottom: '1.5rem', color: '#0F172A' }}>
              <GraduationCap size={18} color="#6B8E23" /> Educational Qualifications
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
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 700, borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem', marginBottom: '1.5rem', color: '#0F172A' }}>
              <Briefcase size={18} color="#6B8E23" /> Special Status & Employment
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
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 700, borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem', marginBottom: '1.5rem', color: '#0F172A' }}>
              <Users size={18} color="#6B8E23" /> Family Details
            </h2>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Parents' Annual Income (â‚¹)</label>
              <select name="parentsAnnualIncome" value={formData.parentsAnnualIncome} onChange={handleChange} style={{ width: '100%', maxWidth: '350px', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF' }}>
                <option value="">Select Income Bracket</option>
                <option value="Below 2.5 Lakhs">Below 2.5 Lakhs</option>
                <option value="2.5 Lakhs - 5 Lakhs">2.5 Lakhs - 5 Lakhs</option>
                <option value="5 Lakhs - 8 Lakhs">5 Lakhs - 8 Lakhs</option>
                <option value="Above 8 Lakhs">Above 8 Lakhs (Creamy Layer)</option>
              </select>
            </div>
          </section>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button 
              type="submit" 
              disabled={isSaving}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 2.25rem', backgroundColor: '#6B8E23', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '1rem', cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1, boxShadow: '0 4px 12px rgba(107,142,35,0.25)' }}
            >
              <Save size={18} />
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>

        </form>
    </SidebarLayout>
  );
};

export default ProfilePage;



