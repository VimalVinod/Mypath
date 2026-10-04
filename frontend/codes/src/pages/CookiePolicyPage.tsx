import React from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const CookiePolicyPage: React.FC = () => {
  return (
    <div style={{ backgroundColor: 'var(--bg-canvas)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main className="container" style={{ flex: 1, padding: '4rem 0', maxWidth: '800px' }}>
        <h1 style={{ marginBottom: '2rem' }}>Cookie Policy</h1>
        <div style={{ lineHeight: '1.6', color: 'var(--text-secondary)' }}>
          <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
          <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>1. What are cookies?</h2>
          <p>Cookies are small text files that are placed on your computer or mobile device when you visit a website. They help us understand how you use the site and improve your experience.</p>
          <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>2. How we use cookies</h2>
          <p>We use cookies for essential site operations, to analyze our traffic, and for authenticating users.</p>
          <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>3. Your Choices</h2>
          <p>You can choose to accept or decline non-essential cookies through our cookie banner or your browser settings.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CookiePolicyPage;
