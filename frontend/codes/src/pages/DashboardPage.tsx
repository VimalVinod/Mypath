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

        {/* Quick Actions Row */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: '1rem', 
          marginBottom: '2rem' 
        }}>
          {/* View All Exams — Primary CTA */}
          <button
            onClick={() => navigate('/exams')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1.25rem 1.5rem',
              backgroundColor: '#09090B',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--radius-card)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: 'var(--brand-red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <BookOpen size={20} color="#FFFFFF" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Browse All Exams</div>
              <div style={{ fontSize: '0.78rem', opacity: 0.7, marginTop: '2px' }}>Discover exams you're eligible for</div>
            </div>
            <ChevronRight size={18} style={{ opacity: 0.5 }} />
          </button>

          {/* My Tracker */}
          <button
            onClick={() => navigate('/tracker')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1.25rem 1.5rem',
              backgroundColor: '#FFFFFF',
              color: 'var(--text-primary)',
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-card)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: 'var(--success-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <ClipboardList size={20} color="var(--success)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>My Tracker</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>Track your applications</div>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
          </button>

          {/* My Profile */}
          <button
            onClick={() => navigate('/profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1.25rem 1.5rem',
              backgroundColor: '#FFFFFF',
              color: 'var(--text-primary)',
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-card)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: 'var(--accent-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <User size={20} color="var(--brand-red)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>My Profile</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>View & edit your details</div>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Main Content Area */}
        <div style={{ display: 'grid', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Notifications Section */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-card)',
            border: '1.5px solid var(--border)',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Bell size={18} color="var(--text-primary)" />
                <h2 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>Notifications</h2>
              </div>
            </div>

            {/* Empty State */}
            <div style={{
              padding: '3rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}>
                <BellOff size={24} color="var(--text-muted)" />
              </div>
              <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                No notifications yet
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '320px' }}>
                When exams you're tracking have updates, deadlines, or announcements, they'll show up here.
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
