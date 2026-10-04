import React from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const RefundPolicyPage: React.FC = () => {
  return (
    <div style={{ backgroundColor: 'var(--bg-canvas)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main className="container" style={{ flex: 1, padding: '4rem 0', maxWidth: '800px' }}>
        <h1 style={{ marginBottom: '2rem' }}>Refund Policy</h1>
        <div style={{ lineHeight: '1.6', color: 'var(--text-secondary)' }}>
          <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
          <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>1. Digital Products</h2>
          <p>Due to the nature of digital goods, all sales are generally final. We do not offer refunds once access to the digital content or platform has been fully granted.</p>
          <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>2. Exceptions</h2>
          <p>Exceptions may be made on a case-by-case basis if there is a verifiable technical issue that prevents access to the content or services purchased.</p>
          <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>3. Contact Us</h2>
          <p>To request an exception or if you have any billing issues, please contact our support team at [Your Business Email].</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RefundPolicyPage;
