import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { LogOut, Trash2, Save, Plus, X, GraduationCap, User, MapPin } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { currentUser, userProfile, updateUserProfile, logoutUser, deleteAccount, navigate } = useApp();
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    dob: '',
    gender: '',
    category: '',
    state: '',
    district: '',
    isPwbd: false,
    isExServiceman: false,
    education: [] as any[],
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        dob: userProfile.dob || '',
        gender: userProfile.gender || '',
        category: userProfile.category || '',
        state: userProfile.state || '',
        district: userProfile.district || '',
        isPwbd: userProfile.isPwbd || false,
        isExServiceman: userProfile.isExServiceman || false,
        education: userProfile.education ? [...userProfile.education] : [],
      });
    }
  }, [userProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
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
      education: [...prev.education, { id: `edu_${Date.now()}`, level: '', degree: '', institution: '', passingYear: '', percentage: '' }]
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
      if (!formData.dob || !formData.gender || !formData.category || !formData.state) {
        throw new Error("Please fill in all the required personal and demographic fields.");
      }

      await updateUserProfile({
        ...formData,
        category: formData.category as any,
        isProfileComplete: true 
      });
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      if (userProfile && !userProfile.isProfileComplete) {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = userProfile?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-subtle)' }}>
      <Navbar />

      <main style={{ flex: 1, maxWidth: '900px', width: '100%', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            My Profile
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Complete your information to find eligible government exams.
          </p>
        </div>

        <form onSubmit={handleSave} style={{ display: 'grid', gap: '1.5rem' }}>
          
          {/* Section 1: Basic Info */}
          <section style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
              <User size={18} color="#2563EB" /> Account Details
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Full Name</label>
                <input type="text" value={displayName} disabled style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', color: '#94A3B8' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Email Address</label>
                <input type="email" value={userProfile?.email || ''} disabled style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', color: '#94A3B8' }} />
              </div>
            </div>
          </section>

          {/* Section 2: Personal & Demographics */}
          <section style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
              <MapPin size={18} color="#2563EB" /> Personal & Demographics
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Date of Birth *</label>
                <input type="date" name="dob" value={formData.dob} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Gender *</label>
                <select name="gender" value={formData.gender} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF' }}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Transgender">Transgender</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Category *</label>
                <select name="category" value={formData.category} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF' }}>
                  <option value="">Select Category</option>
                  <option value="General">General / UR</option>
                  <option value="EWS">EWS</option>
                  <option value="OBC-NCL">OBC (Non-Creamy Layer)</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>State *</label>
                <input type="text" name="state" value={formData.state} onChange={handleChange} placeholder="e.g. Kerala" required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>District</label>
                <input type="text" name="district" value={formData.district} onChange={handleChange} placeholder="e.g. Ernakulam" style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#1E293B', cursor: 'pointer' }}>
                <input type="checkbox" name="isPwbd" checked={formData.isPwbd} onChange={handleChange} style={{ width: '1.2rem', height: '1.2rem' }} />
                Person with Benchmark Disability (PwBD)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#1E293B', cursor: 'pointer' }}>
                <input type="checkbox" name="isExServiceman" checked={formData.isExServiceman} onChange={handleChange} style={{ width: '1.2rem', height: '1.2rem' }} />
                Ex-Serviceman
              </label>
            </div>
          </section>

          {/* Section 3: Education */}
          <section style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 600 }}>
                <GraduationCap size={18} color="#2563EB" /> Education Details
              </h2>
              <button type="button" onClick={addEducation} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#2563EB', background: '#EFF6FF', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>
                <Plus size={16} /> Add Qualification
              </button>
            </div>

            {formData.education.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px dashed #CBD5E1' }}>
                No education details added. Add your 10th, 12th, or Degree to find eligible exams.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {formData.education.map((edu, index) => (
                  <div key={edu.id} style={{ padding: '1.25rem', border: '1px solid #E2E8F0', borderRadius: '6px', position: 'relative', backgroundColor: '#FAFAF9' }}>
                    <button type="button" onClick={() => removeEducation(index)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}>
                      <X size={20} />
                    </button>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', paddingRight: '2rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>Level</label>
                        <select value={edu.level} onChange={(e) => handleEducationChange(index, 'level', e.target.value)} required style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF' }}>
                          <option value="">Select Level</option>
                          <option value="10th">10th / SSLC</option>
                          <option value="12th">12th / HSE / Diploma</option>
                          <option value="Graduation">Graduation (Bachelor's)</option>
                          <option value="Post Graduation">Post Graduation (Master's)</option>
                          <option value="PhD">PhD</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>Course / Stream Name</label>
                        <input type="text" value={edu.degree} onChange={(e) => handleEducationChange(index, 'degree', e.target.value)} placeholder="e.g. B.Tech Computer Science" required style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #CBD5E1' }} />
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>Institution / Board / University</label>
                        <input type="text" value={edu.institution} onChange={(e) => handleEducationChange(index, 'institution', e.target.value)} placeholder="e.g. Kerala University" required style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #CBD5E1' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>Passing Year</label>
                        <input type="text" value={edu.passingYear} onChange={(e) => handleEducationChange(index, 'passingYear', e.target.value)} placeholder="e.g. 2026" required style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #CBD5E1' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>Percentage / CGPA</label>
                        <input type="text" value={edu.percentage} onChange={(e) => handleEducationChange(index, 'percentage', e.target.value)} placeholder="e.g. 85%" required style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #CBD5E1' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {saveError && (
            <div style={{ padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #F87171', color: '#B91C1C', borderRadius: '6px', fontSize: '0.9rem' }}>
              {saveError}
            </div>
          )}

          {saveSuccess && (
            <div style={{ padding: '1rem', backgroundColor: '#F0FDF4', border: '1px solid #4ADE80', color: '#15803D', borderRadius: '6px', fontSize: '0.9rem' }}>
              Profile saved successfully!
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="submit" disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 2rem', backgroundColor: '#09090B', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1 }}>
              <Save size={18} /> {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>

        <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '1rem' }}>
          <button onClick={logoutUser} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', color: '#334155', fontWeight: 600, cursor: 'pointer' }}>
            <LogOut size={16} /> Sign Out
          </button>
          <button onClick={() => deleteAccount()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '6px', color: '#DC2626', fontWeight: 600, cursor: 'pointer' }}>
            <Trash2 size={16} /> Delete Account
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProfilePage;
