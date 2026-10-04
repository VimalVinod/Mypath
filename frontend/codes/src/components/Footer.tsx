import React from 'react';
import { useApp } from '../context/AppContext';
import logoImg from '../assets/logo_black_text.png';

export const Footer: React.FC = () => {
  const { navigate } = useApp();

  return (
    <footer className="app-footer" style={{ backgroundColor: '#FFFFFF', color: '#0F172A', borderTop: '1px solid #E2E8F0', padding: '2rem 0', marginTop: '0' }}>
      <div className="container footer-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem', fontSize: '0.82rem', color: '#475569' }}>
        <div className="footer-col footer-brand-col" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '300px' }}>
          <img src={logoImg} alt="MyPath Logo" style={{ height: '32px', width: 'auto', objectFit: 'contain', display: 'block', marginBottom: '0.5rem', objectPosition: 'left' }} />
          <span>&copy; {new Date().getFullYear()} MyPath. Built for competitive exam aspirants nationwide.</span>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <strong style={{ color: '#0F172A' }}>MyPath</strong>
            <a href="mailto:mypathsupport@gmail.com" style={{ color: '#64748B', textDecoration: 'none' }}>mypathsupport@gmail.com</a>
          </div>
        </div>
        <div className="footer-col footer-links-col" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <strong style={{ color: '#0F172A' }}>Legal</strong>
          <a href="/privacy" onClick={(e) => { e.preventDefault(); navigate('/privacy'); }} style={{ color: '#64748B', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="/terms" onClick={(e) => { e.preventDefault(); navigate('/terms'); }} style={{ color: '#64748B', textDecoration: 'none' }}>Terms of Service</a>
          <a href="/cookies" onClick={(e) => { e.preventDefault(); navigate('/cookies'); }} style={{ color: '#64748B', textDecoration: 'none' }}>Cookie Policy</a>
          <a href="/refund" onClick={(e) => { e.preventDefault(); navigate('/refund'); }} style={{ color: '#64748B', textDecoration: 'none' }}>Refund Policy</a>
        </div>
        <div className="footer-col footer-links-col" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <strong style={{ color: '#0F172A' }}>Support</strong>
          <a href="#" style={{ color: '#64748B', textDecoration: 'none' }}>Help Center</a>
          <a href="#" style={{ color: '#64748B', textDecoration: 'none' }}>Contact Us</a>
        </div>
      </div>
    </footer>
  );
};
