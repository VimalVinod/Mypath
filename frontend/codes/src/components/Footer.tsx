import React from 'react';
import { useApp } from '../context/AppContext';
import logoWhiteImg from '../assets/logo_white_text.png';

export const Footer: React.FC = () => {
  const { navigate } = useApp();

  return (
    <footer style={{ backgroundColor: '#09090B', color: '#FFFFFF', borderTop: '1px solid #27272A', padding: '2rem 0', marginTop: '5rem' }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem', fontSize: '0.82rem', color: '#71717A' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '300px' }}>
          <img src={logoWhiteImg} alt="MyPath Logo" style={{ height: '32px', width: 'auto', objectFit: 'contain', display: 'block', marginBottom: '0.5rem', objectPosition: 'left' }} />
          <span>© {new Date().getFullYear()} MyPath. Built for competitive exam aspirants nationwide.</span>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <strong>[Your Business Name]</strong>
            <span>[Your Business Address]</span>
            <a href="mailto:info@yourbusiness.com" style={{ color: '#A1A1AA', textDecoration: 'none' }}>info@yourbusiness.com</a>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <strong style={{ color: '#E4E4E7' }}>Legal</strong>
          <a href="/privacy" onClick={(e) => { e.preventDefault(); navigate('/privacy'); }} style={{ color: '#A1A1AA', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="/terms" onClick={(e) => { e.preventDefault(); navigate('/terms'); }} style={{ color: '#A1A1AA', textDecoration: 'none' }}>Terms of Service</a>
          <a href="/cookies" onClick={(e) => { e.preventDefault(); navigate('/cookies'); }} style={{ color: '#A1A1AA', textDecoration: 'none' }}>Cookie Policy</a>
          <a href="/refund" onClick={(e) => { e.preventDefault(); navigate('/refund'); }} style={{ color: '#A1A1AA', textDecoration: 'none' }}>Refund Policy</a>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <strong style={{ color: '#E4E4E7' }}>Support</strong>
          <a href="#" style={{ color: '#A1A1AA', textDecoration: 'none' }}>Help Center</a>
          <a href="#" style={{ color: '#A1A1AA', textDecoration: 'none' }}>Contact Us</a>
        </div>
      </div>
    </footer>
  );
};
