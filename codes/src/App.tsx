import React from 'react';
import { AppProvider, useApp } from './context/AppContext';

// Import Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

import { CookieConsentBanner } from './components/CookieConsentBanner';

const MainRouter: React.FC = () => {
  const { currentPath } = useApp();

  switch (currentPath) {
    case '/login':
      return <LoginPage />;
    case '/dashboard':
      return <DashboardPage />;
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
