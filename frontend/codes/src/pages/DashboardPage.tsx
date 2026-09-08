import React from 'react';
import { useApp } from '../context/AppContext';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { Bell, BellOff, User } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { currentUser, userProfile, navigate } = useApp();

  const displayName =
    userProfile?.name ||
    currentUser?.displayName ||
    userProfile?.username ||
    currentUser?.email?.split('@')[0] ||
    'User';

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };


  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-subtle)' }}>
      <Navbar />

      <main style={{ flex: 1, maxWidth: '1000px', width: '100%', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Welcome Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ 
            fontSize: '1.75rem', 
            fontWeight: 800, 
            fontFamily: 'var(--font-heading)', 
            color: 'var(--text-primary)',
            marginBottom: '0.25rem'
          }}>
            {greeting()}, {displayName.split(' ')[0]} 👋
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Here's your exam readiness overview.
          </p>
        </div>

        {/* Incomplete Profile Banner */}
        {!userProfile?.isProfileComplete && (
          <div style={{
            backgroundColor: '#FEF9C3',
            border: '1px solid #FDE047',
            borderRadius: '10px',
            padding: '1.25rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <User size={20} color="#92400E" />
              <div>
                <div style={{ fontWeight: 700, color: '#78350F', fontSize: '0.95rem' }}>Your profile is incomplete</div>
                <div style={{ fontSize: '0.82rem', color: '#92400E' }}>Fill in your details to see which government exams you're eligible for.</div>
              </div>
            </div>
            <button
              onClick={() => navigate('/profile')}
              style={{ padding: '0.6rem 1.25rem', backgroundColor: '#EAB308', color: '#422006', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.85rem' }}
            >
              Complete Profile
            </button>
          </div>
        )}

        {/* Two-column layout: Profile info + Notifications */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>

          {/* Left: Academic Profile (flat, no heavy boxes) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>Academic Profile</h2>
              <button
                onClick={() => navigate('/profile')}
                style={{ fontSize: '0.82rem', color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                Edit →
              </button>
            </div>

            <div style={{ display: 'grid', gap: '0' }}>
              {[
                { label: 'Date of Birth', value: userProfile?.dob || '—' },
                { label: 'Gender', value: userProfile?.gender || '—' },
                { label: 'Category', value: userProfile?.category || '—' },
                { label: 'State', value: userProfile?.state || '—' },
                { label: 'District', value: userProfile?.district || '—' },
                { label: 'PwBD / Ex-Serviceman', value: [userProfile?.isPwbd ? 'PwBD' : null, userProfile?.isExServiceman ? 'Ex-Serviceman' : null].filter(Boolean).join(', ') || 'None' },
              ].map((row, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.85rem 0',
                  borderBottom: '1px solid #F1F5F9'
                }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 500 }}>{row.label}</span>
                  <span style={{ fontSize: '0.9rem', color: '#0F172A', fontWeight: 600 }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Education entries */}
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem' }}>Education</h3>
              {userProfile?.education && userProfile.education.length > 0 ? (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {userProfile.education.map((edu, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.85rem 0', borderBottom: '1px solid #F1F5F9' }}>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A' }}>{edu.degree || edu.level}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>{edu.institution}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 500 }}>{edu.passingYear}</div>
                        <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>{edu.percentage}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: '#94A3B8' }}>No education details added yet.</p>
              )}
            </div>
          </div>

          {/* Right: Notifications Card */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '1.1rem 1.25rem',
              borderBottom: '1px solid #F1F5F9',
            }}>
              <Bell size={16} color="#334155" />
              <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0F172A', margin: 0 }}>Notifications</h2>
            </div>

            <div style={{ padding: '3rem 1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.85rem' }}>
                <BellOff size={18} color="#94A3B8" />
              </div>
              <p style={{ fontWeight: 500, fontSize: '0.9rem', color: '#334155', margin: '0 0 0.35rem 0' }}>All caught up</p>
              <p style={{ fontSize: '0.8rem', color: '#94A3B8', maxWidth: '220px', margin: 0, lineHeight: 1.5 }}>
                Exam updates and deadlines will appear here.
              </p>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DashboardPage;
