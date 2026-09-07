import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  const { currentUser } = useApp();

  useEffect(() => {
    // Only show the banner inside the web app (logged in)
    if (currentUser) {
      const consent = localStorage.getItem('cookie_consent');
      if (!consent) {
        setIsVisible(true);
      }
    } else {
      setIsVisible(false);
    }
  }, [currentUser]);

  const acceptCookies = () => {
    localStorage.setItem('cookie_consent', 'true');
    setIsVisible(false);
  };

  const declineCookies = () => {
    localStorage.setItem('cookie_consent', 'false');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      width: '100%',
      backgroundColor: '#09090B',
      color: '#FFFFFF',
      padding: '1rem 2rem',
      borderTop: '1px solid #27272A',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 9999,
      boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.2)'
    }}>
      <div style={{ fontSize: '0.85rem', flex: 1, marginRight: '1rem', color: '#A1A1AA', lineHeight: 1.5 }}>
        We use cookies to improve your experience and analyze site traffic. 
        By clicking "Accept", you consent to our <a href="/cookies" style={{ color: '#FFFFFF', textDecoration: 'underline' }}>Cookie Policy</a>.
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
        <button 
          onClick={declineCookies}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid #3F3F46',
            color: '#FFFFFF',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600
          }}
        >
          Decline
        </button>
        <button 
          onClick={acceptCookies}
          style={{
            backgroundColor: '#FFFFFF',
            border: 'none',
            color: '#000000',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 700
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
};
