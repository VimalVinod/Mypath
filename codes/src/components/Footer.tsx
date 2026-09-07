import React from 'react';
import { useApp } from '../context/AppContext';
import logoWhiteImg from '../assets/logo_white_text.png';

export const Footer: React.FC = () => {
  const { navigate } = useApp();

  return (
    <footer style={{ backgroundColor: '#09090B', color: '#FFFFFF', borderTop: '1px solid #27272A', padding: '2rem 0', marginTop: '5rem' }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.82rem', color: '#71717A' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <img src={logoWhiteImg} alt="MyPath Logo" style={{ height: '32px', width: 'auto', objectFit: 'contain', display: 'block', marginBottom: '0.5rem', objectPosition: 'left' }} />
          <span>© {new Date().getFullYear()} MyPath. Built for competitive exam aspirants nationwide.</span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <a href="/privacy" onClick={(e) => { e.preventDefault(); navigate('/privacy'); }} style={{ color: '#A1A1AA' }}>Privacy Policy</a>
          <a href="/terms" onClick={(e) => { e.preventDefault(); navigate('/terms'); }} style={{ color: '#A1A1AA' }}>Terms of Service</a>
          <a href="/cookies" onClick={(e) => { e.preventDefault(); navigate('/cookies'); }} style={{ color: '#A1A1AA' }}>Cookie Policy</a>
          <a href="/refund" onClick={(e) => { e.preventDefault(); navigate('/refund'); }} style={{ color: '#A1A1AA' }}>Refund Policy</a>
          <a href="#" style={{ color: '#A1A1AA' }}>Help</a>
        </div>
      </div>
    </footer>
  );
};
