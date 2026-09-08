import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { 
  Bell, 
  BellOff, 
  Search, 
  LogOut, 
  Trash2, 
  ChevronRight, 
  BookOpen, 
  ClipboardList, 
  User,
  Settings
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { currentUser, userProfile, logoutUser, deleteAccount, navigate } = useApp();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [showAccountMenu, setShowAccountMenu] = useState<boolean>(false);

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

  const handleSignOut = async () => {
    await logoutUser();
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
    } catch (err: any) {
      let msg = err?.message || 'Failed to delete account.';
      if (
        err?.code === 'auth/requires-recent-login' ||
        (err?.message && (
          err.message.includes('requires recent authentication') ||
          err.message.includes('sensitive and requires recent')
        ))
      ) {
        msg = 'This operation requires recent authentication. Please re-login before deleting your account.';
      }
      setDeleteError(msg);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-subtle)' }}>
      <Navbar />

      <main style={{ flex: 1, maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Welcome Section */}
        <div style={{ marginBottom: '2rem' }}>
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
            Here's what's happening with your exam journey.
          </p>
        </div>

        {/* Main Content Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '1.5rem', 
          alignItems: 'start' 
        }}>
          
          {/* Left Column: Academic & Personal Profile */}
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-card)',
              border: userProfile?.isProfileComplete ? '1px solid #E2E8F0' : '1px solid #FEF08A',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.25rem 1.5rem',
                borderBottom: userProfile?.isProfileComplete ? '1px solid #E2E8F0' : '1px solid #FEF08A',
                backgroundColor: userProfile?.isProfileComplete ? '#F8FAFC' : '#FEF9C3'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <User size={18} color={userProfile?.isProfileComplete ? '#334155' : '#CA8A04'} />
                  <h2 style={{ fontSize: '1rem', fontWeight: 600, color: userProfile?.isProfileComplete ? '#0F172A' : '#854D0E', margin: 0 }}>
                    Academic Profile {userProfile?.isProfileComplete ? '' : <span style={{ fontSize: '0.75rem', backgroundColor: '#FEF08A', color: '#854D0E', padding: '2px 8px', borderRadius: '12px', marginLeft: '8px', fontWeight: 700 }}>INCOMPLETE</span>}
                  </h2>
                </div>
                {userProfile?.isProfileComplete && (
                  <button 
                    onClick={() => navigate('/profile')}
                    style={{ 
                      fontSize: '0.85rem', 
                      color: '#2563EB', 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer',
                      fontWeight: 500
                    }}>
                    Edit Details
                  </button>
                )}
              </div>

              {userProfile?.isProfileComplete ? (
                <div style={{ padding: '1.5rem' }}>
                  <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1.5rem' }}>
                    Your academic profile is up to date for exam recommendations.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Date of Birth</label>
                      <div style={{ fontSize: '0.95rem', color: '#0F172A', fontWeight: 500 }}>{userProfile?.dob || 'Not specified'}</div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Highest Degree</label>
                      <div style={{ fontSize: '0.95rem', color: '#0F172A', fontWeight: 500 }}>{userProfile?.education && userProfile.education.length > 0 ? userProfile.education[0].degree : 'Not specified'}</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Institution</label>
                    <div style={{ fontSize: '0.95rem', color: '#0F172A', fontWeight: 500 }}>{userProfile?.education && userProfile.education.length > 0 ? userProfile.education[0].institution : 'Not specified'}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', borderTop: '1px solid #E2E8F0', paddingTop: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Category</label>
                      <div style={{ fontSize: '0.95rem', color: '#0F172A', fontWeight: 500 }}>{userProfile?.category || 'General'}</div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.3rem', textTransform: 'uppercase' }}>State</label>
                      <div style={{ fontSize: '0.95rem', color: '#0F172A', fontWeight: 500 }}>{userProfile?.state || 'Not specified'}</div>
                    </div>
                  </div>

                </div>
              ) : (
                <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.95rem', color: '#0F172A', fontWeight: 500, marginBottom: '0.5rem' }}>
                    We don't know what exams you are eligible for!
                  </p>
                  <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '2rem', maxWidth: '300px', margin: '0 auto 2rem' }}>
                    Please complete your personal and academic profile (Date of Birth, Education, Category, etc.) so we can find exactly which government exams you qualify for.
                  </p>
                  <button 
                    onClick={() => navigate('/profile')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#EAB308',
                      color: '#422006',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 6px -1px rgba(234, 179, 8, 0.2)'
                    }}
                  >
                    Complete Your Profile
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Actions & Notifications */}
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            
            {/* Unified Exam Actions */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-card)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <div style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC'
              }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0F172A', margin: 0 }}>Exam Journey</h2>
              </div>
              <div style={{ padding: '1rem' }}>
                <button
                  onClick={() => navigate('/exams')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    width: '100%',
                    padding: '1rem',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    marginBottom: '0.75rem'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                >
                  <Search size={20} color="#334155" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Browse Exams</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>Find exams tailored to your profile</div>
                  </div>
                  <ChevronRight size={18} color="#94A3B8" />
                </button>

                <button
                  onClick={() => navigate('/tracker')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    width: '100%',
                    padding: '1rem',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                >
                  <ClipboardList size={20} color="#334155" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>My Tracker</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>Manage saved exams and deadlines</div>
                  </div>
                  <ChevronRight size={18} color="#94A3B8" />
                </button>
              </div>
            </div>

            {/* Notifications Section */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-card)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Bell size={18} color="#334155" />
                  <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0F172A', margin: 0 }}>Notifications</h2>
                </div>
              </div>

              {/* Empty State */}
              <div style={{
                padding: '3.5rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#F1F5F9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                }}>
                  <BellOff size={20} color="#94A3B8" />
                </div>
                <p style={{ fontWeight: 500, fontSize: '0.95rem', color: '#334155', margin: '0 0 0.35rem 0' }}>
                  You're all caught up
                </p>
                <p style={{ fontSize: '0.85rem', color: '#64748B', maxWidth: '280px', margin: 0, lineHeight: 1.5 }}>
                  Updates, upcoming deadlines, and announcements will appear here.
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DashboardPage;
