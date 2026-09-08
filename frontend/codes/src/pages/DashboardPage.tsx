import React from 'react';
import { useApp } from '../context/AppContext';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { Bell, BellOff, User, BookOpen, Target, Clock, ArrowRight, Compass, ShieldAlert } from 'lucide-react';

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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
      <Navbar />

      <main style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        
        {/* Welcome Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '1.85rem', 
            fontWeight: 800, 
            fontFamily: 'var(--font-heading)', 
            color: '#0F172A',
            marginBottom: '0.4rem'
          }}>
            {greeting()}, {displayName.split(' ')[0]} 👋
          </h1>
          <p style={{ fontSize: '0.95rem', color: '#64748B' }}>
            Welcome to your personal exam command center.
          </p>
        </div>

        {/* Profile Incomplete Banner */}
        {!userProfile?.isProfileComplete && (
          <div style={{
            backgroundColor: '#FFF7ED',
            border: '1px solid #FED7AA',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: '#FFEDD5', borderRadius: '50%' }}>
                <ShieldAlert size={24} color="#C2410C" />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#9A3412', fontSize: '1rem' }}>Action Required: Complete Your Profile</div>
                <div style={{ fontSize: '0.85rem', color: '#C2410C', marginTop: '0.2rem' }}>We need your education & demographics to find exams you are eligible for.</div>
              </div>
            </div>
            <button
              onClick={() => navigate('/profile')}
              style={{ padding: '0.75rem 1.5rem', backgroundColor: '#EA580C', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', transition: 'background-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#C2410C'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#EA580C'}
            >
              Complete Profile Now
            </button>
          </div>
        )}

        {/* Main Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', alignItems: 'start' }}>
          
          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* My Tracker Widget */}
            <section style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <Target size={20} color="#2563EB" /> My Tracker
                </h2>
                <button onClick={() => navigate('/tracker')} style={{ color: '#2563EB', background: 'none', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  View All <ArrowRight size={14} />
                </button>
              </div>

              {/* Empty Tracker State */}
              <div style={{ padding: '2rem 1rem', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
                <Clock size={32} color="#94A3B8" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>No exams tracked yet</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1.5rem', maxWidth: '250px', margin: '0 auto 1.5rem' }}>
                  When you save an exam, its important dates and syllabus will appear here.
                </p>
                <button 
                  onClick={() => navigate('/exams')}
                  style={{ padding: '0.6rem 1.25rem', backgroundColor: '#F1F5F9', color: '#0F172A', border: '1px solid #CBD5E1', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Explore Exams
                </button>
              </div>
            </section>

            {/* Quick Actions / Browse */}
            <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div 
                onClick={() => navigate('/exams')}
                style={{ backgroundColor: '#2563EB', borderRadius: '12px', padding: '1.5rem', color: '#FFFFFF', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 6px -1px rgba(37,99,235,0.2)' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                <Compass size={28} color="#93C5FD" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>Browse Exams</h3>
                <p style={{ fontSize: '0.85rem', color: '#BFDBFE', margin: 0 }}>Find eligible opportunities</p>
              </div>
              <div 
                style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '1.5rem', border: '1px solid #E2E8F0', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                <BookOpen size={28} color="#64748B" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', margin: '0 0 0.25rem 0' }}>Study Materials</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0 }}>Access syllabus & guides</p>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Academic Profile Card */}
            <section style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <User size={20} color="#10B981" /> Academic Profile
                </h2>
                <button onClick={() => navigate('/profile')} style={{ color: '#64748B', background: '#F1F5F9', border: 'none', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                  Edit
                </button>
              </div>

              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748B' }}>State</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A' }}>{userProfile?.state || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Category</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A' }}>{userProfile?.category || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Date of Birth</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A' }}>{userProfile?.dob || '—'}</span>
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748B', display: 'block', marginBottom: '0.25rem' }}>Highest Qualification</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0F172A', display: 'block' }}>
                    {userProfile?.education && userProfile.education.length > 0 ? userProfile.education[0].level : 'None added'}
                  </span>
                </div>
              </div>
            </section>

            {/* Notifications Section */}
            <section style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <Bell size={20} color="#F59E0B" />
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>Recent Updates</h2>
              </div>
              
              <div style={{ padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                <BellOff size={24} color="#94A3B8" style={{ marginBottom: '0.75rem' }} />
                <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#334155', margin: '0 0 0.25rem 0' }}>You're all caught up!</p>
                <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0 }}>No new notifications at this time.</p>
              </div>
            </section>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DashboardPage;
