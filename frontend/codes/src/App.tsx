import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';

// Import Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ProfileCompletionPage } from './pages/ProfileCompletionPage';
import { DashboardPage } from './pages/DashboardPage';

import { CookieConsentBanner } from './components/CookieConsentBanner';

const MainRouter: React.FC = () => {
  const { currentPath, currentUser, userProfile, authLoading, authNotice, navigate, setAuthNotice } = useApp();

  useEffect(() => {
    if (authLoading) return;

    if (currentPath === '/dashboard') {
      if (!currentUser) {
        navigate('/login');
        return;
      }
      if (!currentUser.emailVerified) {
        setAuthNotice('Please verify your email address before logging in. A verification link has been sent to your email.');
        navigate('/login');
        return;
      }
      if (userProfile && userProfile.isProfileComplete === false) {
        navigate('/complete-profile');
        return;
      }
    }

    if (currentPath === '/complete-profile') {
      if (!currentUser) {
        navigate('/login');
        return;
      }
      if (userProfile && userProfile.isProfileComplete === true) {
        navigate('/dashboard');
        return;
      }
    }
  }, [currentPath, currentUser, userProfile, authLoading, navigate, setAuthNotice]);

  if (currentPath === '/dashboard') {
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
    if (userProfile && userProfile.isProfileComplete === false) {
      return <ProfileCompletionPage />;
    }
    return <DashboardPage />;
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

  if (currentPath === '/complete-profile') {
    if (!authLoading && !currentUser) {
      return <LoginPage />;
    }
    return <ProfileCompletionPage />;
  }

  switch (currentPath) {
    case '/signup':
      return <SignupPage />;
    case '/':
    default:
      return <LandingPage />;
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
