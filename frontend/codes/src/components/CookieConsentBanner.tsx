import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

const setCookie = (name: string, value: string, days: number) => {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = "expires=" + date.toUTCString();
  document.cookie = name + "=" + value + ";" + expires + ";path=/;SameSite=Lax";
};

const getCookie = (name: string) => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for(let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  const { currentUser } = useApp();

  useEffect(() => {
    // Check both cookie and localStorage for backwards compatibility
    const cookieConsent = getCookie('cookie_consent');
    const localConsent = localStorage.getItem('cookie_consent');
    
    if (!cookieConsent && !localConsent) {
      setIsVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie_consent', 'true');
    setCookie('cookie_consent', 'true', 365); // Cookie valid for 1 year
    setIsVisible(false);
  };

  const declineCookies = () => {
    localStorage.setItem('cookie_consent', 'false');
    setCookie('cookie_consent', 'false', 365);
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
