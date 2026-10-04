import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';

// Import Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { BrowseExamsPage } from './pages/BrowseExamsPage';
import { TrackerPage } from './pages/TrackerPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotificationsPage } from './pages/NotificationsPage';

// Import Legal Pages
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsPage } from './pages/TermsPage';
import { CookiePolicyPage } from './pages/CookiePolicyPage';
import { RefundPolicyPage } from './pages/RefundPolicyPage';

const MainRouter: React.FC = () => {
  const { currentPath, currentUser, authLoading, authNotice, navigate, setAuthNotice } = useApp();

  useEffect(() => {
    if (authLoading) return;

    // Protected routes array
    const protectedRoutes = ['/dashboard', '/exams', '/tracker', '/profile'];
    
    if (protectedRoutes.includes(currentPath)) {
      if (!currentUser) {
        navigate('/login');
        return;
      }
      if (!currentUser.emailVerified) {
        setAuthNotice('Please verify your email address before logging in. A verification link has been sent to your email.');
        navigate('/login');
        return;
      }
    }
  }, [currentPath, currentUser, authLoading, navigate, setAuthNotice]);

  const protectedRoutes = ['/dashboard', '/exams', '/tracker', '/profile'];

  if (protectedRoutes.includes(currentPath)) {
    if (authLoading) {
      return (
        <div 
          data-testid="auth-loading" 
          style={{ 
            minHeight: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '1.2rem', 
            color: 'var(--text-secondary)' 
          }}
        >
          Loading session...
        </div>
      );
    }
    if (!currentUser || !currentUser.emailVerified) {
      const notice = !currentUser?.emailVerified
        ? 'Please verify your email address before logging in. A verification link has been sent to your email.'
        : authNotice;
      return (
        <div>
          {notice && (
            <div
              role="alert"
              style={{
                position: 'fixed',
                top: '1rem',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                backgroundColor: '#FDF0ED',
                border: '1px solid var(--error, #EF4444)',
                borderRadius: '8px',
                padding: '0.85rem 1.25rem',
                color: 'var(--error, #EF4444)',
                fontSize: '0.85rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            >
              {notice}
            </div>
          )}
          <LoginPage />
        </div>
      );
    }
    
    // Render specific protected pages
    if (currentPath === '/dashboard') return <DashboardPage />;
    if (currentPath === '/exams') return <BrowseExamsPage />;
    if (currentPath === '/tracker') return <TrackerPage />;
    if (currentPath === '/profile') return <ProfilePage />;
    if (currentPath === '/notifications') return <NotificationsPage />;
  }

  if (currentPath === '/login') {
    return (
      <div>
        {authNotice && (
          <div
            role="alert"
            style={{
              position: 'fixed',
              top: '1rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              backgroundColor: '#FDF0ED',
              border: '1px solid var(--error, #EF4444)',
              borderRadius: '8px',
              padding: '0.85rem 1.25rem',
              color: 'var(--error, #EF4444)',
              fontSize: '0.85rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          >
            {authNotice}
          </div>
        )}
        <LoginPage />
      </div>
    );
  }

  switch (currentPath) {
    case '/signup':
      return <SignupPage />;
    case '/privacy':
      return <PrivacyPolicyPage />;
    case '/terms':
      return <TermsPage />;
    case '/cookies':
      return <CookiePolicyPage />;
    case '/refund':
      return <RefundPolicyPage />;
    case '/':
      return <LandingPage />;
    default:
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F8FAFC',
          fontFamily: 'sans-serif',
          gap: '1rem',
          textAlign: 'center',
          padding: '2rem'
        }}>
          <div style={{ fontSize: '6rem', fontWeight: 800, color: '#E2E8F0', lineHeight: 1 }}>404</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>Page Not Found</h1>
          <p style={{ fontSize: '1rem', color: '#64748B', maxWidth: '380px', margin: 0 }}>
            The page <strong style={{ color: '#EF4444' }}>{currentPath}</strong> doesn't exist. It may have been moved or removed.
          </p>
          <button
            onClick={() => window.history.back()}
            style={{ padding: '0.65rem 1.5rem', backgroundColor: '#0F172A', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', marginTop: '0.5rem' }}
          >
            Go Back
          </button>
        </div>
      );
  }
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <MainRouter />
      <CookieConsentBanner />
    </AppProvider>
  );
};

export default App;
